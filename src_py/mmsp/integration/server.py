#!/usr/bin/env python
# Copyright 2025 Prism Shadow. and/or its affiliates
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
MMSP server: the models of a table, over HTTP as MMSP streams.

The server serves the rows of its models table. Each row is an upstream model, built once with
`AutoLLMClient(model=model_id, api_key=api_key, base_url=base_url, client_type=client_type)` and
named by its `server_model_id`; a row without a client type or a base URL gets the official client
its model id names and that client's default endpoint. `POST /v1/stream` streams one stateless
response of the model a request names, `GET /v1/models` lists the models in OpenAI's list shape, and
`GET /v1/metrics` reports what the server has served since it started, and with `?window=N` or
`?from=F&to=T` any range of the last 60 days in columns of 10 s to 12 h, which the playground's server
page draws; `metrics_path` keeps that history in a file across restarts.
Requests to `/v1/` carry one of the `api_keys` as a bearer token, or none when the list is empty.
The table comes from a JSON file (`load_server_config`) or from code,
and a client's base URL is `http://host:port/v1`. The wire protocol is the one `mmsp.wire` describes,
and the mmsp client (`client_type="mmsp"`) speaks it. The module also holds the playground's server page,
`SERVER_TEMPLATE`, which `playground.py` serves at `/server/`.
"""

import asyncio
import concurrent.futures
import hmac
import json
import math
import os
import re
import threading
import time
from collections import deque
from collections.abc import Callable, Collection
from contextlib import suppress
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal, NotRequired, TypedDict

from flask import Flask, Response, jsonify, request
from werkzeug.exceptions import MethodNotAllowed, NotFound, RequestEntityTooLarge

from .. import AutoLLMClient
from ..abort_signal import AbortSignal
from ..base_client import LLMClient
from ..wire import (
    DEFAULT_HOST,
    DEFAULT_PORT,
    KEEPALIVE_SECONDS,
    METRICS_PATH,
    MODELS_PATH,
    STREAM_PATH,
    decode_wire,
    encode_wire,
    server_base_url,
    to_wire_error,
)


# Global event loop and lock for thread-safe async operations
_event_loop: asyncio.AbstractEventLoop | None = None
_loop_lock = threading.Lock()


def _get_event_loop() -> asyncio.AbstractEventLoop:
    """Get or create the global event loop for async operations."""
    global _event_loop
    if _event_loop is None or _event_loop.is_closed():
        with _loop_lock:
            # Double-check after acquiring lock
            if _event_loop is None or _event_loop.is_closed():
                _event_loop = asyncio.new_event_loop()

                # Start the loop in a background thread
                def run_loop():
                    asyncio.set_event_loop(_event_loop)
                    _event_loop.run_forever()

                loop_thread = threading.Thread(target=run_loop, daemon=True)
                loop_thread.start()

    return _event_loop


class ModelRow(TypedDict):
    """
    One row of the models table: an upstream model and the id clients name it by.

    `base_url` and `client_type` may be empty or absent.
    """

    model_id: str  # the upstream model id, as AutoLLMClient takes it
    api_key: str  # the upstream key
    server_model_id: str  # the id clients name
    base_url: NotRequired[str]  # empty or absent: the client's default endpoint (its variable, else the vendor's)
    client_type: NotRequired[str]  # empty or absent: the official client the model id names


class ServerConfig(TypedDict):
    """What a config file holds: the models table and the keys clients may send."""

    models: list[ModelRow]
    api_keys: list[str]


_COLUMNS = ("model_id", "base_url", "api_key", "server_model_id", "client_type")
_REQUIRED_COLUMNS = ("model_id", "api_key", "server_model_id")
_OPTIONAL_COLUMNS = ("base_url", "client_type")
# the ids are names, not settings, so a `$` in them is taken as written
_RESOLVED_COLUMNS = ("base_url", "api_key", "client_type")

# (bucket seconds, seconds kept): 10 s buckets for 2 hours, 1 min buckets for 2 days, 1 h buckets for 60 days
TIERS = ((10, 7200), (60, 172800), (3600, 5184000))
BUCKET_S = 10  # the finest bucket, aligned to multiples of 10 of the wall clock; a request begins in one
RETENTION_S = 5184000  # 60 days; nothing older is kept
# the spans a window's columns may have; day columns would be UTC days on a local axis, so 12 h is the widest
COLUMN_SPANS = (10, 20, 30, 60, 120, 300, 600, 900, 1200, 1800, 3600, 7200, 10800, 21600, 43200)
WINDOW_COLUMNS = 360  # the columns a window has at most unless ?columns= asks otherwise
MAX_COLUMNS = 1440  # the most ?columns= may ask
BUCKET_SAMPLES = 64  # latencies kept per bucket and metric; the percentiles of a bucket are over them
ERRORS_KEPT = 100  # the latest failures the snapshot lists and the history keeps
LATENCY_WINDOW = 1000  # the latest successes per model the since-start latency percentiles are taken over
SAVE_EVERY_S = 60  # how often a store with a history file writes it, when something changed
HISTORY_VERSION = 1
WINDOW_ERROR = f"window must be an integer number of seconds from {BUCKET_S} to {RETENTION_S}."
RANGE_ERROR = f"from and to must be unix seconds, from before to and at most {RETENTION_S} seconds apart."
QUERY_ERROR = "window cannot be combined with from and to."
COLUMNS_ERROR = f"columns must be an integer from 1 to {MAX_COLUMNS}."


@dataclass
class RequestSample:
    """One request the metrics follow, from `ServerMetrics.begin` to its outcome."""

    model_id: str
    started: float  # metrics.now() at begin
    bucket: int  # the wall-clock bucket the request began in, which its outcome is counted into
    first_event: float | None = None
    done: bool = False


@dataclass
class _Bucket:
    """What the requests that began in one stretch of the wall clock came to."""

    requests: int = 0
    successes: int = 0
    failures: int = 0
    disconnects: int = 0
    refused: int = 0  # counted on the total series only, in the bucket of the moment of the refusal
    tokens_out: int = 0  # thinking + response tokens of the successes
    thoughts: int = 0
    response: int = 0
    generation_ms: int = 0
    total_ms: list[int] = field(default_factory=list)  # at most BUCKET_SAMPLES: the first ones, or thinned
    first_event_ms: list[int] = field(default_factory=list)  # at most BUCKET_SAMPLES


# the counters of a bucket, in the order the history file lists them, before the two lists of samples
_COUNTERS = (
    "requests",
    "successes",
    "failures",
    "disconnects",
    "refused",
    "tokens_out",
    "thoughts",
    "response",
    "generation_ms",
)


@dataclass
class _Series:
    """The counters of one model, or of the whole server."""

    requests: int = 0
    successes: int = 0
    failures: int = 0
    disconnects: int = 0
    first_event_ms: deque[int] = field(default_factory=lambda: deque(maxlen=LATENCY_WINDOW))
    total_ms: deque[int] = field(default_factory=lambda: deque(maxlen=LATENCY_WINDOW))
    tokens: dict[str, int] = field(default_factory=lambda: {"prompt": 0, "cached": 0, "thoughts": 0, "response": 0})
    tokens_out: int = 0
    generation_ms: int = 0
    last_request_at: float | None = None
    last_outcome: str | None = None
    last_error: dict[str, Any] | None = None
    # one dict per tier of TIERS, keyed by bucket start in unix seconds
    tiers: tuple[dict[int, _Bucket], ...] = field(default_factory=lambda: tuple({} for _ in TIERS))


def _percentile(samples: Collection[int], p: int) -> int | None:
    """The nearest-rank percentile of the samples, None when there are none."""
    if not samples:
        return None
    values = sorted(samples)
    return values[math.ceil(p / 100 * len(values)) - 1]


def _tps(tokens_out: int, generation_ms: int) -> float | None:
    """Output tokens per second of generation, one decimal rounded half up; None before a success."""
    if not generation_ms:
        return None
    return int(tokens_out * 10000 / generation_ms + 0.5) / 10


def _thin(samples: Collection[int]) -> list[int]:
    """At most BUCKET_SAMPLES samples standing for all of them: sorted, then evenly spaced order statistics."""
    values = sorted(samples)
    n = len(values)
    if n <= BUCKET_SAMPLES:
        return values
    return [values[i * n // BUCKET_SAMPLES] for i in range(BUCKET_SAMPLES)]


def _fold(target: _Bucket, sources: list[_Bucket]) -> None:
    """Add the sources into the target: counts summed, the latency samples thinned together."""
    for source in sources:
        for name in _COUNTERS:
            setattr(target, name, getattr(target, name) + getattr(source, name))
    target.total_ms = _thin(target.total_ms + [ms for source in sources for ms in source.total_ms])
    target.first_event_ms = _thin(target.first_event_ms + [ms for source in sources for ms in source.first_event_ms])


def parse_window(value: str) -> int:
    """
    The seconds a `?window=` query names.

    Args:
        value: The query's value, as sent

    Returns:
        The seconds, an integer from BUCKET_S to RETENTION_S

    Raises:
        ValueError: With WINDOW_ERROR, when the value is anything else.
    """
    digits = value.lstrip("0") or "0"
    # ASCII digits only, and checked as text first, so that a long run of them never reaches int()
    if re.fullmatch(r"[0-9]{1,7}", digits) and BUCKET_S <= int(digits) <= RETENTION_S:
        return int(digits)
    raise ValueError(WINDOW_ERROR)


@dataclass(frozen=True)
class MetricsQuery:
    """What a metrics request asks for: the last `seconds`, or the range from `start` to `end`, in `columns`."""

    seconds: int | None  # ?window=N
    start: int | None  # ?from=F
    end: int | None  # ?to=T
    columns: int  # ?columns=C, WINDOW_COLUMNS by default


def parse_metrics_query(
    window: str | None, from_: str | None, to: str | None, columns: str | None
) -> MetricsQuery | None:
    """
    What a metrics request asks for; None when it asks for the snapshot only.

    Args:
        window: The `?window=` value, None when absent
        from_: The `?from=` value, None when absent
        to: The `?to=` value, None when absent
        columns: The `?columns=` value, None when absent; alone, it asks for nothing

    Returns:
        The query, or None when it names no range

    Raises:
        ValueError: With COLUMNS_ERROR, QUERY_ERROR, WINDOW_ERROR or RANGE_ERROR, checked in that order.
    """
    count = WINDOW_COLUMNS
    if columns is not None:
        digits = columns.lstrip("0") or "0"
        if not re.fullmatch(r"[0-9]{1,4}", digits) or not 1 <= int(digits) <= MAX_COLUMNS:
            raise ValueError(COLUMNS_ERROR)
        count = int(digits)
    if window is not None and (from_ is not None or to is not None):
        raise ValueError(QUERY_ERROR)
    if window is not None:
        return MetricsQuery(seconds=parse_window(window), start=None, end=None, columns=count)
    if from_ is None and to is None:
        return None
    bounds = [value.lstrip("0") for value in (from_, to) if value is not None]
    if len(bounds) != 2 or not all(re.fullmatch(r"[0-9]{1,10}", digits) for digits in bounds):
        raise ValueError(RANGE_ERROR)
    start, end = int(bounds[0]), int(bounds[1])
    if not start < end <= start + RETENTION_S:
        raise ValueError(RANGE_ERROR)
    return MetricsQuery(seconds=None, start=start, end=end, columns=count)


def _is_count(value: Any) -> bool:
    """Whether a value read from JSON is a non-negative integer; true and false are not."""
    return type(value) is int and value >= 0


def _is_bucket(value: Any) -> bool:
    """Whether a value read from JSON is a bucket of the history file: nine counts and two lists of samples."""
    return (
        isinstance(value, list)
        and len(value) == len(_COUNTERS) + 2
        and all(_is_count(count) for count in value[: len(_COUNTERS)])
        and all(
            isinstance(samples, list) and all(type(ms) is int for ms in samples) for samples in value[len(_COUNTERS) :]
        )
    )


def _is_series(value: Any) -> bool:
    """Whether a value read from JSON is a series of the history file: `[start, bucket]` lists per tier size."""
    return isinstance(value, dict) and all(
        isinstance(value.get(str(size)), list)
        and all(
            isinstance(entry, list) and len(entry) == 2 and _is_count(entry[0]) and _is_bucket(entry[1])
            for entry in value[str(size)]
        )
        for size, _ in TIERS
    )


def read_history(path: str | os.PathLike[str]) -> dict[str, Any]:
    """
    Read a metrics history file, as `ServerMetrics` writes it.

    Args:
        path: The file

    Returns:
        The parsed history: version, since, saved_at, errors, total and models

    Raises:
        FileNotFoundError: When there is no file.
        ValueError: With `not valid JSON: <reason>`, or `not a version 1 metrics history` when the shape is off.
    """
    with open(path, "rb") as file:
        raw = file.read()
    try:
        data = json.loads(raw.decode("utf-8"))
    except ValueError as exc:
        raise ValueError(f"not valid JSON: {exc}") from exc
    if not (
        isinstance(data, dict)
        and type(data.get("version")) is int
        and data["version"] == HISTORY_VERSION
        and _is_count(data.get("since"))
        and isinstance(data.get("errors"), list)
        and all(
            isinstance(entry, dict) and all(key in entry for key in ("at", "model", "message"))
            for entry in data["errors"]
        )
        and _is_series(data.get("total"))
        and isinstance(data.get("models"), dict)
        and all(_is_series(series) for series in data["models"].values())
    ):
        raise ValueError(f"not a version {HISTORY_VERSION} metrics history")
    return data


def _whole_as_int(value: Any) -> Any:
    """A whole float as an int, as JavaScript writes 1790000000.0, so that both servers write the same bytes."""
    return int(value) if isinstance(value, float) and value.is_integer() else value


def _dump_tiers(series: _Series) -> dict[str, list[list[Any]]]:
    """A series as the history file holds it: per tier size, `[start, bucket]` sorted by start."""
    return {
        str(size): [
            [
                start,
                [*(getattr(bucket, name) for name in _COUNTERS), list(bucket.total_ms), list(bucket.first_event_ms)],
            ]
            for start, bucket in sorted(tier.items())
        ]
        for (size, _), tier in zip(TIERS, series.tiers, strict=True)
    }


def _load_tiers(series: dict[str, list[list[Any]]]) -> tuple[dict[int, _Bucket], ...]:
    """The tiers of a series of the history file, with lists of samples longer than BUCKET_SAMPLES thinned."""
    return tuple(
        {
            start: _Bucket(
                *values[: len(_COUNTERS)],
                *(
                    samples if len(samples) <= BUCKET_SAMPLES else _thin(samples)
                    for samples in values[len(_COUNTERS) :]
                ),
            )
            for start, values in series[str(size)]
        }
        for size, _ in TIERS
    )


class ServerMetrics:
    """
    What a server has served since it started, per model and in total, and its history of the last 60 days.

    A request is counted when it reaches a model and ends one of three ways: a success streamed its
    stop event, a failure ended with an error event, and a disconnect is a caller that went away, which
    is not the server's failure. The latencies are those of the latest LATENCY_WINDOW successes. A
    request refused before it reaches a model counts as a refusal of the server only. The output
    tokens of a success are its thinking and response tokens, and its generation time runs from its
    first event to its end; the tokens per second of any set of successes are their summed tokens
    over their summed generation time.

    Alongside the since-start counters, every series keeps buckets of the wall clock in the three tiers
    of TIERS, for `window` and `between`: a request's outcome, latency and tokens are counted into the
    bucket it began in, a refusal into the bucket of its moment. A bucket that ages out of its tier is
    added into the next tier's bucket, its latency samples thinned to BUCKET_SAMPLES, so every stretch
    of time is stored in exactly one tier; nothing older than RETENTION_S is kept. The latest
    ERRORS_KEPT failures are listed too.

    With a `path`, the history (the buckets, the errors and `since`, the moment it begins) is read from
    that file at creation and written to it every `save_every_s` seconds when something changed, and
    at `close()`, so a new store on the same file continues it. The since-start counters are this
    run's alone.

    Args:
        model_ids: The server's model ids, in table order
        now: The monotonic clock the latencies are measured with, in seconds
        clock: The wall clock the timestamps and buckets are read from, in unix seconds
        path: The history file, None to keep the history in memory only
        save_every_s: How often the history is written, in seconds; 0 writes it only on `save()` and `close()`
    """

    def __init__(
        self,
        model_ids: list[str],
        now: Callable[[], float] = time.monotonic,
        clock: Callable[[], float] = time.time,
        path: str | os.PathLike[str] | None = None,
        save_every_s: float = SAVE_EVERY_S,
    ) -> None:
        self.now = now
        self.clock = clock
        self.started_at = int(clock())
        self.since = self.started_at
        self.path = None if path is None else os.fspath(path)
        self._lock = threading.Lock()
        # held for a whole save, so that an older history never replaces a newer one
        self._save_lock = threading.Lock()
        self._total = _Series()
        self._models = {model_id: _Series() for model_id in model_ids}
        # the history of ids the table no longer has, kept in the file until it ages out
        self._dormant: dict[str, _Series] = {}
        self._refused = {"unauthorized": 0, "invalid_request": 0, "unknown_model": 0}
        self._errors: deque[dict[str, Any]] = deque(maxlen=ERRORS_KEPT)
        self._dirty = False
        self._compacted_minute = -1
        self._write_failed = False
        self._save_every_s = save_every_s
        self._timer: threading.Timer | None = None
        self._closed = False
        if self.path is None:
            return
        try:
            data = read_history(self.path)
        except FileNotFoundError:
            data = None
        except (ValueError, OSError) as exc:
            data = None
            print(f"Metrics history at {self.path} could not be read ({exc}); starting fresh.")
        if data is not None:
            with self._lock:
                self._adopt(data)
        if save_every_s > 0:
            self._arm()

    @classmethod
    def from_history(
        cls, path: str | os.PathLike[str], clock: Callable[[], float] = time.time
    ) -> "ServerMetrics | None":
        """
        A store holding a history file for reading, with no models, no path and no saver.

        Args:
            path: The history file
            clock: The wall clock the windows are read against, in unix seconds

        Returns:
            The store, whose `window`, `between`, `since` and snapshot errors read the file's history;
            None when the file is missing or cannot be read.
        """
        try:
            data = read_history(path)
        except (ValueError, OSError):
            return None
        metrics = cls([], clock=clock)
        with metrics._lock:
            metrics._adopt(data)
        return metrics

    def _adopt(self, data: dict[str, Any]) -> None:
        """Take a history `read_history` read: since, errors, the tiers of every series; the caller holds the lock."""
        self.since = data["since"]
        self._errors.extend(
            {"at": entry["at"], "model": entry["model"], "message": entry["message"]}
            for entry in data["errors"][:ERRORS_KEPT]
        )
        self._total.tiers = _load_tiers(data["total"])
        for model_id, series in data["models"].items():
            if model_id in self._models:
                self._models[model_id].tiers = _load_tiers(series)
            else:
                self._dormant[model_id] = _Series(tiers=_load_tiers(series))
        # what expired while no server ran goes now
        self._compact(int(self.clock()))

    def _history(self) -> dict[str, Any]:
        """The history as the file holds it; the caller holds the lock."""
        return {
            "version": HISTORY_VERSION,
            "since": self.since,
            "saved_at": int(self.clock()),
            "errors": [{**entry, "at": _whole_as_int(entry["at"])} for entry in self._errors],
            "total": _dump_tiers(self._total),
            "models": {
                model_id: _dump_tiers(series) for model_id, series in (*self._models.items(), *self._dormant.items())
            },
        }

    def _arm(self) -> None:
        """Run the next save in `save_every_s` seconds, on a daemon thread that never holds the process up."""
        self._timer = threading.Timer(self._save_every_s, self._tick)
        self._timer.daemon = True
        self._timer.start()

    def _tick(self) -> None:
        """Save, then arm the next save unless the store was closed meanwhile."""
        self.save()
        with self._lock:
            if not self._closed:
                self._arm()

    def save(self) -> None:
        """
        Write the history to the file, when there is one and something changed since the last write.

        The file is written through a temporary file beside it, so that a reader never sees half of it. A
        write that fails is printed once and tried again at the next save.
        """
        if self.path is None:
            return
        with self._save_lock:
            with self._lock:
                self._compact(int(self.clock()))
                if not self._dirty:
                    return
                data = self._history()
                self._dirty = False
            # serialized outside the lock, from the copies the lock was held for
            text = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
            path = Path(self.path)
            temporary = path.with_name(path.name + ".tmp")
            try:
                path.parent.mkdir(parents=True, exist_ok=True)
                # "\n" on every platform, so that both servers write the same bytes
                temporary.write_text(text, encoding="utf-8", newline="\n")
                os.replace(temporary, path)
            except OSError as exc:
                with self._lock:
                    self._dirty = True
                if not self._write_failed:
                    self._write_failed = True
                    print(f"Cannot write metrics history to {self.path}: {exc.strerror or exc}")
                return
            self._write_failed = False

    def close(self) -> None:
        """Stop the saver and write what changed since the last save; closing twice is fine."""
        with self._lock:
            self._closed = True
            timer, self._timer = self._timer, None
        if timer is not None:
            timer.cancel()
        self.save()

    def _timestamp(self) -> float:
        """The wall clock in unix seconds, to the millisecond."""
        return round(self.clock(), 3)

    @staticmethod
    def _floor(i: int, now_s: int) -> int:
        """The oldest bucket start tier i holds; what is older belongs to the next tier, or to none after the last."""
        size, keep = TIERS[i]
        # aligned to the next tier's bucket, so that a whole minute (hour) moves at once
        align = TIERS[i + 1][0] if i + 1 < len(TIERS) else size
        return ((now_s // size + 1) * size - keep) // align * align

    def _locate(self, series: _Series, start: int, now_s: int) -> _Bucket | None:
        """The stored bucket a moment belongs to, created when missing; None once it is older than the retention."""
        for i, (size, _) in enumerate(TIERS):
            if start >= self._floor(i, now_s):
                return series.tiers[i].setdefault(start // size * size, _Bucket())
        return None

    def _compact(self, now_s: int) -> None:
        """Move what has aged out of a tier into the next and drop what is older than the retention; once a minute."""
        if now_s // 60 == self._compacted_minute:
            return
        self._compacted_minute = now_s // 60
        changed = False
        for series in (self._total, *self._models.values(), *self._dormant.values()):
            for i in range(len(TIERS) - 1):
                floor = self._floor(i, now_s)
                next_size = TIERS[i + 1][0]
                moved: dict[int, list[_Bucket]] = {}
                for key in sorted(series.tiers[i]):
                    if key < floor:
                        moved.setdefault(key // next_size * next_size, []).append(series.tiers[i].pop(key))
                for target_key, sources in moved.items():
                    _fold(series.tiers[i + 1].setdefault(target_key, _Bucket()), sources)
                changed = changed or bool(moved)
            floor = self._floor(len(TIERS) - 1, now_s)
            expired = [key for key in series.tiers[-1] if key < floor]
            for key in expired:
                del series.tiers[-1][key]
            changed = changed or bool(expired)
        self._dirty = self._dirty or changed

    def begin(self, model_id: str) -> RequestSample:
        """Count a request to a model and start its clock."""
        with self._lock:
            now_s = int(self.clock())
            self._compact(now_s)
            at = self._timestamp()
            start = now_s // BUCKET_S * BUCKET_S
            for series in (self._models[model_id], self._total):
                series.requests += 1
                series.last_request_at = at
                # the current bucket is always in the first tier
                self._locate(series, start, now_s).requests += 1
            self._dirty = True
            return RequestSample(model_id=model_id, started=self.now(), bucket=start)

    def first_event(self, sample: RequestSample) -> None:
        """Note the moment a request's first event went out; later calls change nothing."""
        with self._lock:
            if sample.first_event is None:
                sample.first_event = self.now()

    def finish(
        self,
        sample: RequestSample,
        outcome: Literal["success", "failure", "disconnect"],
        error: str | None = None,
        usage: dict[str, Any] | None = None,
    ) -> None:
        """Count how a request ended; a request already finished is not counted again."""
        with self._lock:
            if sample.done:
                return
            sample.done = True
            now_s = int(self.clock())
            self._compact(now_s)
            self._dirty = True
            model = self._models[sample.model_id]
            # the bucket it began in, in whichever tier holds it now; a request begun before the retention
            # still counts since start, in no bucket
            located = [self._locate(series, sample.bucket, now_s) for series in (model, self._total)]
            buckets = [bucket for bucket in located if bucket is not None]
            if outcome == "success":
                total_ms = int((self.now() - sample.started) * 1000 + 0.5)
                first_event_ms = (
                    None if sample.first_event is None else int((sample.first_event - sample.started) * 1000 + 0.5)
                )
                # the stop event is a first event, so first_event_ms is known; max(total_ms, 1) if it were not
                generation_ms = max(total_ms - (first_event_ms or 0), 1)
                thoughts = (usage or {}).get("thoughts_tokens") or 0
                response = (usage or {}).get("response_tokens") or 0
                for series in (model, self._total):
                    series.successes += 1
                    series.total_ms.append(total_ms)
                    if first_event_ms is not None:
                        series.first_event_ms.append(first_event_ms)
                    for kind in ("prompt", "cached", "thoughts", "response"):
                        count = (usage or {}).get(f"{kind}_tokens")
                        if count is not None:
                            series.tokens[kind] += count
                    series.tokens_out += thoughts + response
                    series.generation_ms += generation_ms
                for bucket in buckets:
                    bucket.successes += 1
                    bucket.tokens_out += thoughts + response
                    bucket.thoughts += thoughts
                    bucket.response += response
                    bucket.generation_ms += generation_ms
                    if len(bucket.total_ms) < BUCKET_SAMPLES:
                        bucket.total_ms.append(total_ms)
                    if first_event_ms is not None and len(bucket.first_event_ms) < BUCKET_SAMPLES:
                        bucket.first_event_ms.append(first_event_ms)
            elif outcome == "failure":
                model.failures += 1
                self._total.failures += 1
                for bucket in buckets:
                    bucket.failures += 1
                at = self._timestamp()
                model.last_error = {"at": at, "message": error}
                self._errors.appendleft({"at": at, "model": sample.model_id, "message": error})
            else:
                model.disconnects += 1
                self._total.disconnects += 1
                for bucket in buckets:
                    bucket.disconnects += 1
            model.last_outcome = outcome

    def refused(self, kind: Literal["unauthorized", "invalid_request", "unknown_model"]) -> None:
        """Count a request the server refused before it reached a model."""
        with self._lock:
            now_s = int(self.clock())
            self._compact(now_s)
            self._refused[kind] += 1
            self._locate(self._total, now_s // BUCKET_S * BUCKET_S, now_s).refused += 1
            self._dirty = True

    @staticmethod
    def _counts(series: _Series) -> dict[str, Any]:
        """The counters, rates, latencies and tokens a model and the total share, in the order they are reported."""
        finished = series.successes + series.failures
        return {
            "requests": series.requests,
            "successes": series.successes,
            "failures": series.failures,
            "disconnects": series.disconnects,
            "in_flight": series.requests - series.successes - series.failures - series.disconnects,
            "success_rate": round(series.successes / finished, 4) if finished else None,
            "latency_ms": {
                "first_event": {
                    "p50": _percentile(series.first_event_ms, 50),
                    "p90": _percentile(series.first_event_ms, 90),
                },
                "total": {"p50": _percentile(series.total_ms, 50), "p90": _percentile(series.total_ms, 90)},
            },
            "tokens": dict(series.tokens),
            "tokens_out": series.tokens_out,
            "generation_ms": series.generation_ms,
            "tps": _tps(series.tokens_out, series.generation_ms),
        }

    def snapshot(self) -> dict[str, Any]:
        """
        Everything counted so far, as `GET /v1/metrics` reports it.

        Returns:
            When the server started and when its history begins, the totals, the refusals, the latest
            failures (newest first), and one entry per model in table order.
        """
        with self._lock:
            return {
                "started_at": self.started_at,
                "since": self.since,
                "uptime_s": int(self.clock()) - self.started_at,
                **self._counts(self._total),
                "refused": dict(self._refused),
                "last_request_at": self._total.last_request_at,
                "errors": [dict(entry) for entry in self._errors],
                "models": [
                    {
                        "id": model_id,
                        **self._counts(series),
                        "last_request_at": series.last_request_at,
                        "last_outcome": series.last_outcome,
                        "last_error": None if series.last_error is None else dict(series.last_error),
                    }
                    for model_id, series in self._models.items()
                ],
            }

    @staticmethod
    def _columns(series: _Series, start: int, end: int, span: int) -> list[_Bucket]:
        """One bucket per column of `span` seconds from `start` to `end`, summing every stored bucket inside it."""
        columns = [_Bucket() for _ in range((end - start) // span)]
        for tier in series.tiers:
            for key, bucket in tier.items():
                if start <= key < end:
                    column = columns[(key - start) // span]
                    for name in _COUNTERS:
                        setattr(column, name, getattr(column, name) + getattr(bucket, name))
                    column.total_ms.extend(bucket.total_ms)
                    column.first_event_ms.extend(bucket.first_event_ms)
        # so that a column of many buckets weighs its latencies as a stored bucket of the same span would
        for column in columns:
            column.total_ms = _thin(column.total_ms)
            column.first_event_ms = _thin(column.first_event_ms)
        return columns

    @staticmethod
    def _summary(columns: list[_Bucket], refused: bool = False) -> dict[str, Any]:
        """The sums of the columns, in the order `window` reports them."""
        requests = sum(column.requests for column in columns)
        successes = sum(column.successes for column in columns)
        failures = sum(column.failures for column in columns)
        disconnects = sum(column.disconnects for column in columns)
        tokens_out = sum(column.tokens_out for column in columns)
        generation_ms = sum(column.generation_ms for column in columns)
        first_event_ms = [ms for column in columns for ms in column.first_event_ms]
        total_ms = [ms for column in columns for ms in column.total_ms]
        return {
            "requests": requests,
            "successes": successes,
            "failures": failures,
            "disconnects": disconnects,
            "in_flight": requests - successes - failures - disconnects,
            "success_rate": round(successes / (successes + failures), 4) if successes + failures else None,
            **({"refused": sum(column.refused for column in columns)} if refused else {}),
            "tokens_out": tokens_out,
            "thoughts": sum(column.thoughts for column in columns),
            "response": sum(column.response for column in columns),
            "generation_ms": generation_ms,
            "tps": _tps(tokens_out, generation_ms),
            "latency_ms": {
                "first_event": {"p50": _percentile(first_event_ms, 50), "p90": _percentile(first_event_ms, 90)},
                "total": {"p50": _percentile(total_ms, 50), "p90": _percentile(total_ms, 90)},
            },
        }

    @staticmethod
    def _series_columns(columns: list[_Bucket], refused: bool = False) -> dict[str, list[Any]]:
        """One value per column and measure."""
        return {
            "requests": [column.requests for column in columns],
            "successes": [column.successes for column in columns],
            "failures": [column.failures for column in columns],
            "disconnects": [column.disconnects for column in columns],
            **({"refused": [column.refused for column in columns]} if refused else {}),
            "tokens_out": [column.tokens_out for column in columns],
            "thoughts": [column.thoughts for column in columns],
            "response": [column.response for column in columns],
            "generation_ms": [column.generation_ms for column in columns],
            "tps": [_tps(column.tokens_out, column.generation_ms) for column in columns],
            "p50": [_percentile(column.total_ms, 50) for column in columns],
            "p90": [_percentile(column.total_ms, 90) for column in columns],
            "first_event_p50": [_percentile(column.first_event_ms, 50) for column in columns],
            "first_event_p90": [_percentile(column.first_event_ms, 90) for column in columns],
        }

    def _resolution(
        self, now_s: int, seconds: int | None, from_s: int | None, to_s: int | None, columns: int
    ) -> tuple[int, int, int]:
        """(bucket_s, start, end): the smallest span the storing tier allows that fits `columns`, the range aligned."""
        for i, (size, _) in enumerate(TIERS):
            # left at the first span that fits, else at the largest
            for span in (span for span in COLUMN_SPANS if span % size == 0):
                if seconds is not None:
                    # the current column is the last one, partial
                    end = (now_s // span + 1) * span
                    start = end - -(-seconds // span) * span
                else:
                    start = from_s // span * span
                    end = -(-to_s // span) * span
                if (end - start) // span <= columns:
                    break
            # a column may not be finer than the tier that stores the start of the range
            if i == len(TIERS) - 1 or start >= self._floor(i, now_s):
                return span, start, end

    def window(self, seconds: int, columns: int = WINDOW_COLUMNS) -> dict[str, Any]:
        """
        The last `seconds`, in columns of the span the range and `columns` call for, with the window before it.

        Args:
            seconds: The length of the window, from BUCKET_S to RETENTION_S
            columns: The most columns the window may have where a span of COLUMN_SPANS allows it

        Returns:
            The window's bounds and span, the total's and each model's sums and per-column values, and the
            sums of the window before it, None unless that window lies wholly inside the history.
        """
        with self._lock:
            now_s = int(self.clock())
            span, start, end = self._resolution(now_s, seconds, None, None, columns)
            return self._window(seconds, span, start, end)

    def between(self, from_s: int, to_s: int, columns: int = WINDOW_COLUMNS) -> dict[str, Any]:
        """
        From `from_s` to `to_s`, aligned outward to the span; the future and the time before the history are zeros.

        Args:
            from_s: The start of the range, unix seconds
            to_s: Its end, unix seconds, after `from_s` and at most RETENTION_S later
            columns: The most columns the range may have where a span of COLUMN_SPANS allows it

        Returns:
            The window of that range, as `window` reports it, its `seconds` being `to_s - from_s`.
        """
        with self._lock:
            now_s = int(self.clock())
            span, start, end = self._resolution(now_s, None, from_s, to_s, columns)
            return self._window(to_s - from_s, span, start, end)

    def _window(self, seconds: int, span: int, start: int, end: int) -> dict[str, Any]:
        """The window object of a resolved range; the caller holds the lock."""
        # the first column the history covers, before which nothing could have been counted
        first = self.since // span * span
        length = end - start
        total = self._columns(self._total, start, end, span)
        models = [(model_id, self._columns(series, start, end, span)) for model_id, series in self._models.items()]
        return {
            "seconds": seconds,
            "bucket_s": span,
            "start": start,
            "end": end,
            "total": {**self._summary(total, refused=True), "series": self._series_columns(total, refused=True)},
            "models": [
                {"id": model_id, **self._summary(columns), "series": self._series_columns(columns)}
                for model_id, columns in models
            ],
            "previous": (
                self._summary(self._columns(self._total, start - length, start, span), refused=True)
                if start - length >= first
                else None
            ),
        }


def _error_response(status: int, error_type: str, message: str) -> tuple[Response, int]:
    """The answer to a request the server refuses before streaming anything."""
    return jsonify({"error": {"type": error_type, "message": message}}), status


def _check_config_shape(config: Any, prefix: str) -> None:
    """Refuse a config that is not an object with a models list, or whose api_keys is not a list."""
    if not isinstance(config, dict) or not isinstance(config.get("models"), list):
        raise ValueError(f"{prefix}the config must be a JSON object with a models list.")
    if not isinstance(config.get("api_keys", []), list):
        raise ValueError(f"{prefix}api_keys must be a list.")


def resolve_server_config(config: Any, source: str = "") -> ServerConfig:
    """
    Check a config's shape and resolve the environment references of its cells.

    `config` is what a config file or a request body holds: `{"models": [...], "api_keys": [...]}`.
    A `base_url`, `api_key` or `client_type` cell of a row, or an entry of `api_keys`, that starts
    with `$` is read from the environment (`$NAME` and `${NAME}` both name NAME). `source` prefixes
    every message (the file's path for `load_server_config`); empty, the messages carry no prefix.
    The rows are checked by `create_server_app`, as rows from code are.

    Returns:
        `{"models": rows, "api_keys": keys}` with those cells replaced, `api_keys` defaulting to [].
        The input is not modified.

    Raises:
        ValueError: When the config is not an object with a models list, api_keys is not a list, or a
        reference names a variable that is unset or empty.
    """
    prefix = f"{source}: " if source else ""
    _check_config_shape(config, prefix)
    api_keys = config.get("api_keys", [])

    def resolve(cell: object, where: str) -> object:
        """The value a cell stands for: the variable it names, or the cell itself."""
        if not isinstance(cell, str) or not cell.startswith("$"):
            return cell
        name = cell[1:]
        if name.startswith("{") and name.endswith("}"):
            name = name[1:-1]
        value = os.getenv(name)
        if not value:
            raise ValueError(f"{prefix}{where} references {cell}, which is not set in the environment.")
        return value

    models = []
    for i, row in enumerate(config["models"]):
        # a row that is not an object is left for create_server_app to refuse
        if isinstance(row, dict):
            row = dict(row)
            for column in _RESOLVED_COLUMNS:
                if column in row:
                    row[column] = resolve(row[column], f"models[{i}].{column}")
        models.append(row)
    return {"models": models, "api_keys": [resolve(key, f"api_keys[{i}]") for i, key in enumerate(api_keys)]}


def _parse_server_config(text: str, path: str | os.PathLike[str]) -> dict[str, Any]:
    """
    Parse the text of a config file as written: shape-checked, its `$VAR` cells unresolved, every key kept.

    Args:
        text: The file's text
        path: The file it came from, which starts every message

    Returns:
        The parsed object

    Raises:
        ValueError: When the text is not JSON, or not an object with a models list and a list of api_keys.
    """
    try:
        config = json.loads(text)
    except ValueError as exc:
        raise ValueError(f"{path}: not valid JSON: {exc}") from exc
    _check_config_shape(config, f"{path}: ")
    return config


def read_server_config(path: str | os.PathLike[str]) -> dict[str, Any]:
    """
    Read a config file as written: parsed and shape-checked, its `$VAR` cells unresolved, every key kept.

    The playground keeps `host` and `port` in the file too; `load_server_config` reads only the table and the keys.

    Args:
        path: The JSON file: `{"models": [...], "api_keys": [...]}`

    Returns:
        The parsed object

    Raises:
        FileNotFoundError: When there is no file.
        ValueError: When the file is not JSON, or not an object with a models list and a list of api_keys;
        every message starts with the path.
    """
    with open(path, encoding="utf-8") as file:
        return _parse_server_config(file.read(), path)


def load_server_config(path: str | os.PathLike[str]) -> ServerConfig:
    """
    Read a config file, with the environment references of its cells resolved.

    The cells are resolved as `resolve_server_config` resolves them, and every message starts with the path.

    Args:
        path: The JSON file: `{"models": [...], "api_keys": [...]}`

    Returns:
        The models table and the keys, with those cells replaced and `api_keys` defaulting to an empty list

    Raises:
        ValueError: When the file is not JSON, not a config, or references a variable that is unset or empty.
    """
    return resolve_server_config(read_server_config(path), str(path))


def create_server_app(
    models: list[ModelRow], api_keys: list[str] | None = None, metrics_path: str | os.PathLike[str] | None = None
) -> Flask:
    """
    Create the MMSP server's Flask application, with the upstream client of every row built.

    The rows are taken as they are: code that has its rows reads its own environment, and only
    `load_server_config` resolves `$` cells.

    Args:
        models: The models table, served in its order
        api_keys: The keys a request may carry as a bearer token; an empty or omitted list is an open server
        metrics_path: The metrics history file the server continues and keeps (`ServerMetrics`), None for
            none; whoever runs the app calls `app.config["MMSP_SERVER_METRICS"].close()` when it stops

    Returns:
        Flask application instance

    Raises:
        ValueError: When the table or the keys are malformed, or a row's upstream client refuses to build.
    """
    if not isinstance(models, list):
        raise ValueError("models must be a list of model rows.")
    if not models:
        raise ValueError("models is empty: the server needs at least one model row.")
    seen: dict[str, int] = {}
    for i, row in enumerate(models):
        if not isinstance(row, dict):
            raise ValueError(f"models[{i}] must be an object.")
        for column in _REQUIRED_COLUMNS:
            if not isinstance(row.get(column), str) or not row[column]:
                raise ValueError(f"models[{i}]: {column} must be a non-empty string.")
        for column in _OPTIONAL_COLUMNS:
            if row.get(column) is not None and not isinstance(row[column], str):
                raise ValueError(f"models[{i}]: {column} must be a string.")
        server_model_id = row["server_model_id"]
        if server_model_id in seen:
            raise ValueError(
                f"models[{i}]: server_model_id '{server_model_id}' is already used by models[{seen[server_model_id]}]."
            )
        seen[server_model_id] = i
    api_keys = [] if api_keys is None else api_keys
    if not isinstance(api_keys, list):
        raise ValueError("api_keys must be a list of non-empty strings.")
    for i, key in enumerate(api_keys):
        if not isinstance(key, str) or not key:
            raise ValueError(f"api_keys[{i}] must be a non-empty string.")

    # after the whole table is checked, so every structural fault is reported before a client's own refusal
    upstreams: dict[str, LLMClient] = {}
    for i, row in enumerate(models):
        try:
            # without a client type AutoLLMClient routes by the model id's family and honours CLIENT_TYPE,
            # as it does everywhere
            upstreams[row["server_model_id"]] = AutoLLMClient(
                model=row["model_id"],
                api_key=row["api_key"],
                base_url=row.get("base_url") or None,
                client_type=row.get("client_type") or None,
            )
        except Exception as exc:
            raise ValueError(f"models[{i}] '{row['server_model_id']}': {str(exc) or type(exc).__name__}") from exc
    metrics = ServerMetrics(list(upstreams), path=metrics_path)
    created = metrics.started_at

    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024
    app.json.ensure_ascii = False
    # Flask sorts keys by default; the bodies keep the order they are written in, as the TypeScript server's do
    app.json.sort_keys = False
    app.config["MMSP_SERVER_MODEL_IDS"] = list(upstreams)
    app.config["MMSP_SERVER_METRICS"] = metrics

    @app.errorhandler(RequestEntityTooLarge)
    def request_entity_too_large(_error: RequestEntityTooLarge) -> tuple[Response, int]:
        """Refuse a request whose inline images or audio exceed the body limit."""
        return _error_response(413, "InvalidRequestError", "Request body is too large.")

    @app.errorhandler(NotFound)
    @app.errorhandler(MethodNotAllowed)
    def no_route(_error: NotFound | MethodNotAllowed) -> tuple[Response, int]:
        """Refuse a path or a method the server does not serve, in JSON."""
        # Flask would answer GET /v1/stream with a 405 page; to a client it is a route that does not exist
        return _error_response(
            404,
            "NotFoundError",
            f"No route for {request.method} {request.path}; the server serves POST /v1/stream, GET /v1/models"
            " and GET /v1/metrics.",
        )

    expected = [f"Bearer {key}".encode() for key in api_keys]

    @app.before_request
    def authenticate() -> tuple[Response, int] | None:
        """Refuse a /v1/ request that does not carry one of the server's keys, when it has any."""
        if not expected or not request.path.startswith("/v1/"):
            return None

        given = request.headers.get("Authorization", "").encode()
        # constant-time per key, so the time a refusal takes tells nothing about the keys
        if not any(hmac.compare_digest(given, candidate) for candidate in expected):
            metrics.refused("unauthorized")
            return _error_response(401, "AuthenticationError", "Invalid or missing API key.")

        return None

    def invalid_request(message: str) -> tuple[Response, int]:
        """Count and refuse a stream request the server cannot read."""
        metrics.refused("invalid_request")
        return _error_response(400, "InvalidRequestError", message)

    @app.route(STREAM_PATH, methods=["POST"])
    def stream() -> Response | tuple[Response, int]:
        """Stream one stateless response of the model the request names."""
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return invalid_request("Request body must be a JSON object.")

        model = data.get("model")
        if not isinstance(model, str) or not model:
            return invalid_request("model must be a non-empty string.")

        messages = data.get("messages")
        if not isinstance(messages, list):
            return invalid_request("messages must be a list of messages.")

        config = {} if data.get("config") is None else data["config"]
        if not isinstance(config, dict):
            return invalid_request("config must be an object.")

        upstream = upstreams.get(model)
        if upstream is None:
            metrics.refused("unknown_model")
            return _error_response(
                404,
                "NotFoundError",
                f"The model '{model}' does not exist; GET /v1/models lists the models this server serves.",
            )
        sample = metrics.begin(model)

        def generate():
            """Generate streaming response using the persistent event loop."""
            signal = AbortSignal()
            async_gen = None
            loop = _get_event_loop()
            outcome = error = usage = None
            try:
                # decoded here, so that a message the client cannot read is an error event like any other
                request_messages = [decode_wire(message) for message in messages]

                async_gen = upstream.streaming_response(request_messages, config, signal)
                while True:
                    next_event = asyncio.run_coroutine_threadsafe(async_gen.__anext__(), loop)
                    # a comment while the model is silent, so that no proxy or client times out a long thought;
                    # writing it is also how a disconnect is noticed before the next event
                    while not concurrent.futures.wait([next_event], timeout=KEEPALIVE_SECONDS).done:
                        yield ": keep-alive\n\n"
                    try:
                        event = next_event.result()
                    except StopAsyncIteration:
                        break
                    metrics.first_event(sample)
                    if event["event_type"] == "stop":
                        usage = event.get("usage_metadata")
                    yield f"data: {json.dumps(encode_wire(event), ensure_ascii=False)}\n\n"

                # the stop event went out, so a caller gone before the marker leaves this a success
                outcome = "success"
                yield "data: [DONE]\n\n"
            except (asyncio.CancelledError, concurrent.futures.CancelledError):
                outcome, error = "failure", "cancelled"
                yield "data: [DONE]\n\n"
            except GeneratorExit:
                # the caller went away: the upstream request is cancelled, and nothing more is written
                signal.abort("client disconnected")
                if async_gen is not None:
                    with suppress(Exception):
                        asyncio.run_coroutine_threadsafe(async_gen.aclose(), loop).result(timeout=1)
                raise
            except Exception as exc:
                outcome, error = "failure", str(exc) or type(exc).__name__
                # the status went out with the first byte, so a failure travels as an event of its own
                yield f"data: {json.dumps({'error': to_wire_error(exc)}, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
            finally:
                signal.abort("request ended")
                # a generator closed before it decided is a caller that went away
                metrics.finish(sample, outcome or "disconnect", error=error, usage=usage)

        return Response(generate(), mimetype="text/event-stream", headers={"Cache-Control": "no-cache"})

    @app.route(MODELS_PATH, methods=["GET"])
    def list_models() -> Response:
        """The models of the table, in the list shape OpenAI-style tools read."""
        return jsonify(
            {
                "object": "list",
                "data": [
                    {"id": model_id, "object": "model", "created": created, "owned_by": "mmsp"}
                    for model_id in upstreams
                ],
            }
        )

    @app.route(METRICS_PATH, methods=["GET"])
    def server_metrics() -> Response | tuple[Response, int]:
        """
        What the server has served since it started, and with `?window=N` the last N seconds, or
        `?from=F&to=T` that range, in columns of a span the range and `?columns=` call for.
        """
        args = request.args
        try:
            query = parse_metrics_query(args.get("window"), args.get("from"), args.get("to"), args.get("columns"))
        except ValueError as exc:
            # not a refusal: refusals count stream requests
            return _error_response(400, "InvalidRequestError", str(exc))
        if query is None:
            return jsonify(metrics.snapshot())
        window = (
            metrics.window(query.seconds, query.columns)
            if query.seconds is not None
            else metrics.between(query.start, query.end, query.columns)
        )
        return jsonify({**metrics.snapshot(), "window": window})

    return app


def announce_server(host: str, port: int, model_ids: list[str], open: bool) -> None:
    """
    Print where the server listens, what it serves, and whether it is open.

    Args:
        host: The host it listens on
        port: The port it listens on
        model_ids: The ids it serves, in table order
        open: Whether it accepts every request, having no keys
    """
    print(f"Starting MMSP server at {server_base_url(host, port)}")
    print("Serving models: " + ", ".join(model_ids))
    if open:
        print("Open server: api_keys is empty, every request is accepted")


def start_server(
    models: list[ModelRow],
    api_keys: list[str] | None = None,
    *,
    host: str = DEFAULT_HOST,
    port: int = DEFAULT_PORT,
    debug: bool = False,
    metrics_path: str | os.PathLike[str] | None = None,
) -> None:
    """
    Start the MMSP server.

    Args:
        models: The models table, served in its order
        api_keys: The keys a request may carry as a bearer token; an empty or omitted list is an open server
        host: Host address to bind to
        port: Port number to listen on
        debug: Enable debug mode
        metrics_path: The metrics history file, continued at start and written until the server stops;
            None writes nothing. One server per file.
    """
    app = create_server_app(models, api_keys, metrics_path=metrics_path)
    announce_server(host, port, app.config["MMSP_SERVER_MODEL_IDS"], not api_keys)
    try:
        app.run(host=host, port=port, debug=debug)
    finally:
        app.config["MMSP_SERVER_METRICS"].close()


# -- SERVER_TEMPLATE begin: the playground's server page, one HTML document, written whole by embed.mjs; edit server.html --
SERVER_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>MMSP Server</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Cstyle%3E.d{fill:%23111116}@media (prefers-color-scheme: dark){.d{fill:%232a2a33}}%3C/style%3E%3Cpath d=%22M15.5 0H25a7 7 0 0 1 7 7v9.5H15.5Z%22 class=%22d%22/%3E%3Cpath d=%22M0 15.5h16.5V32H7a7 7 0 0 1-7-7Z%22 class=%22d%22/%3E%3Cpath d=%22M0 16V7a7 7 0 0 1 7-7h9v16Z%22 fill=%22%23477dfb%22/%3E%3Cpath d=%22M16 16h16v9a7 7 0 0 1-7 7h-9Z%22 fill=%22%23477dfb%22/%3E%3Cg fill=%22%23fff%22 font-family=%22ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif%22 font-size=%2210.5%22 font-weight=%22700%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3E%3Ctext x=%228.5%22 y=%228.5%22%3EM%3C/text%3E%3Ctext x=%2223.5%22 y=%228.5%22%3EM%3C/text%3E%3Ctext x=%228.5%22 y=%2223.5%22%3ES%3C/text%3E%3Ctext x=%2223.5%22 y=%2223.5%22%3EP%3C/text%3E%3C/g%3E%3C/svg%3E">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
    <script>
        // the stored theme applies before the first paint; without one the page follows the system
        try {
            const theme = localStorage.getItem('mmsp.playground.theme');
            if (theme === 'light' || theme === 'dark') {
                document.documentElement.dataset.theme = theme;
            }
        } catch (error) {
            // storage refused: the system theme it is
        }
    </script>
    <style>
        :root {
            --bg: #f5f5f6;
            --panel: #fafafa;
            --surface: #ffffff;
            --raised: #f0f0f2;
            --hover: rgba(20, 22, 28, 0.05);
            --ring: rgba(20, 22, 28, 0.09);
            --ring-strong: rgba(20, 22, 28, 0.17);
            --text: #16181d;
            --muted: #5c616c;
            --subtle: #8a8f99;
            --accent: #2f6fed;
            --accent-soft: rgba(47, 111, 237, 0.14);
            --on-accent: #ffffff;
            --green: #16945b;
            --green-soft: rgba(22, 148, 91, 0.12);
            --amber: #b16a0a;
            --amber-soft: rgba(177, 106, 10, 0.12);
            --red: #d23b3b;
            --red-soft: rgba(210, 59, 59, 0.1);
            --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(20, 22, 28, 0.04);
            --shadow-card-hover: 0 0 0 1px var(--ring-strong), 0 1px 2px rgba(20, 22, 28, 0.04);
            --shadow-menu: 0 0 0 1px var(--ring), 0 12px 32px -10px rgba(20, 22, 28, 0.22);
            --shadow-composer: 0 0 0 1px var(--ring), 0 10px 30px -14px rgba(20, 22, 28, 0.25);
            --ease: cubic-bezier(0.23, 1, 0.32, 1);
            --font: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
            --mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
            color-scheme: light;
        }

        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
                --bg: #1b1c1f;
                --panel: #18191c;
                --surface: #222327;
                --raised: #28292e;
                --hover: rgba(255, 255, 255, 0.05);
                --ring: rgba(255, 255, 255, 0.08);
                --ring-strong: rgba(255, 255, 255, 0.15);
                --text: #eceef1;
                --muted: #a3a8b1;
                --subtle: #6f747e;
                --accent: #4d8ef7;
                --accent-soft: rgba(77, 142, 247, 0.2);
                --green: #43c283;
                --green-soft: rgba(67, 194, 131, 0.14);
                --amber: #e3a646;
                --amber-soft: rgba(227, 166, 70, 0.14);
                --red: #f06a6a;
                --red-soft: rgba(240, 106, 106, 0.14);
                --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.3);
                --shadow-card-hover: 0 0 0 1px var(--ring-strong), 0 1px 2px rgba(0, 0, 0, 0.3);
                --shadow-menu: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 36px -10px rgba(0, 0, 0, 0.7);
                --shadow-composer: 0 0 0 1px rgba(255, 255, 255, 0.09), 0 14px 36px -14px rgba(0, 0, 0, 0.7);
                color-scheme: dark;
            }
        }

        :root[data-theme="dark"] {
            --bg: #1b1c1f;
            --panel: #18191c;
            --surface: #222327;
            --raised: #28292e;
            --hover: rgba(255, 255, 255, 0.05);
            --ring: rgba(255, 255, 255, 0.08);
            --ring-strong: rgba(255, 255, 255, 0.15);
            --text: #eceef1;
            --muted: #a3a8b1;
            --subtle: #6f747e;
            --accent: #4d8ef7;
            --accent-soft: rgba(77, 142, 247, 0.2);
            --green: #43c283;
            --green-soft: rgba(67, 194, 131, 0.14);
            --amber: #e3a646;
            --amber-soft: rgba(227, 166, 70, 0.14);
            --red: #f06a6a;
            --red-soft: rgba(240, 106, 106, 0.14);
            --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.3);
            --shadow-card-hover: 0 0 0 1px var(--ring-strong), 0 1px 2px rgba(0, 0, 0, 0.3);
            --shadow-menu: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 36px -10px rgba(0, 0, 0, 0.7);
            --shadow-composer: 0 0 0 1px rgba(255, 255, 255, 0.09), 0 14px 36px -14px rgba(0, 0, 0, 0.7);
            color-scheme: dark;
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        html, body {
            height: 100%;
            margin: 0;
        }

        body {
            background: var(--bg);
            color: var(--text);
            font: 14px/1.55 var(--font);
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
        }

        button, input, textarea {
            font: inherit;
            color: inherit;
        }

        button {
            cursor: pointer;
            background: none;
            border: 0;
            padding: 0;
        }

        button:disabled {
            cursor: not-allowed;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        svg {
            flex: none;
        }

        .hidden {
            display: none !important;
        }

        .mono {
            font-family: var(--mono);
        }

        :focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }

        ::selection {
            background: var(--accent-soft);
        }

        /* top bar */

        .topbar {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            align-items: center;
            gap: 16px;
            height: 56px;
            padding: 0 20px;
            background: var(--bg);
            box-shadow: 0 1px 0 var(--ring);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: none;
        }

        .brand-mark {
            width: 22px;
            height: 22px;
            flex: none;
            align-self: center;
        }

        .mark-bg {
            fill: #111116;
        }

        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) .mark-bg {
                fill: #2a2a33;
            }
        }

        :root[data-theme="dark"] .mark-bg {
            fill: #2a2a33;
        }

        .brand-name {
            font-size: 15px;
            font-weight: 600;
            letter-spacing: -0.01em;
        }

        .brand-sub {
            color: var(--subtle);
            font-size: 13px;
        }

        .topbar-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
        }

        .ghost-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 32px;
            padding: 0 10px;
            border-radius: 8px;
            color: var(--muted);
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            transition: color 0.15s, background-color 0.15s;
        }

        .ghost-btn:hover {
            color: var(--text);
            background: var(--hover);
        }

        .ghost-btn:disabled {
            color: var(--muted);
            background: none;
            opacity: 0.5;
        }

        .segmented {
            position: relative;
            display: flex;
            padding: 3px;
            border-radius: 9px;
            background: var(--raised);
            box-shadow: inset 0 0 0 1px var(--ring);
        }

        .segmented button, .segmented a {
            position: relative;
            z-index: 1;
            display: grid;
            place-items: center;
            min-width: 0;
            height: 26px;
            padding: 0 10px;
            border-radius: 6px;
            color: var(--muted);
            font-size: 12.5px;
            font-weight: 500;
            white-space: nowrap;
            transition: color 0.15s, background-color 0.15s;
        }

        .segmented button:hover, .segmented a:hover {
            color: var(--text);
        }

        .segmented [aria-checked="true"], .segmented [aria-current="true"] {
            color: var(--text);
        }

        .segmented a[aria-current="true"] {
            background: var(--surface);
            box-shadow: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.12);
        }

        .seg-thumb {
            position: absolute;
            top: 3px;
            bottom: 3px;
            left: 0;
            width: 0;
            border-radius: 6px;
            background: var(--surface);
            box-shadow: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.12);
            transition: transform 0.25s var(--ease), width 0.25s var(--ease);
        }

        .theme-toggle button {
            width: 29px;
            padding: 0;
        }

        /* groups and controls */

        .group-title {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 14px;
            color: var(--subtle);
            font-size: 12px;
            font-weight: 500;
        }

        .group-title::after {
            content: "";
            flex: 1;
            height: 1px;
            background: var(--ring);
        }

        .field-label {
            color: var(--muted);
            font-size: 12.5px;
            font-weight: 500;
        }

        .field-note {
            margin: 6px 0 0;
            color: var(--subtle);
            font-size: 12px;
            line-height: 1.45;
        }

        .field-error {
            margin: 6px 0 0;
            color: var(--red);
            font-size: 12px;
            line-height: 1.45;
            overflow-wrap: anywhere;
        }

        .control {
            display: block;
            width: 100%;
            min-height: 34px;
            padding: 7px 10px;
            background: var(--surface);
            border: 0;
            border-radius: 8px;
            box-shadow: 0 0 0 1px var(--ring);
            font-size: 13px;
            line-height: 20px;
            transition: box-shadow 0.15s var(--ease), background-color 0.15s;
        }

        .control::placeholder {
            color: var(--subtle);
        }

        .control:hover {
            box-shadow: 0 0 0 1px var(--ring-strong);
        }

        .control:focus, .control:focus-visible {
            outline: none;
            box-shadow: 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-soft);
        }

        .control.invalid {
            box-shadow: 0 0 0 1px var(--red), 0 0 0 4px var(--red-soft);
        }

        .control.code {
            font-family: var(--mono);
            font-size: 12px;
            line-height: 18px;
        }

        /* comboboxes */

        [data-combobox] {
            position: relative;
        }

        .combo-button {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            text-align: left;
        }

        .combo-button[aria-expanded="true"] {
            box-shadow: 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-soft);
        }

        .combo-button [data-combobox-label] {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Auto is a word, the client types are ids */
        .combo-button [data-combobox-label]:not(.mono) {
            font-family: var(--font);
            font-size: 13px;
        }

        .combo-button svg {
            color: var(--subtle);
            transition: transform 0.2s var(--ease);
        }

        .combo-button[aria-expanded="true"] svg {
            transform: rotate(180deg);
        }

        [data-combobox-menu] {
            position: absolute;
            z-index: 30;
            top: calc(100% + 6px);
            left: 0;
            right: 0;
            max-height: 320px;
            overflow-y: auto;
            padding: 4px;
            background: var(--surface);
            border-radius: 10px;
            box-shadow: var(--shadow-menu);
            transform-origin: top center;
            animation: menu-in 0.18s var(--ease);
        }

        @keyframes menu-in {
            from {
                opacity: 0;
                transform: translateY(-4px) scale(0.98);
            }
        }

        .menu-heading {
            padding: 8px 8px 4px;
            color: var(--subtle);
            font-size: 11.5px;
            font-weight: 500;
        }

        .combo-option {
            position: relative;
            display: block;
            width: 100%;
            padding: 6px 28px 6px 8px;
            border-radius: 6px;
            text-align: left;
            font-size: 13px;
            line-height: 18px;
            transition: background-color 0.1s;
        }

        .combo-option span {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .combo-option::after {
            content: attr(data-description);
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--subtle);
            font-family: var(--mono);
            font-size: 11px;
            line-height: 16px;
        }

        .combo-option[data-description=""]::after {
            display: none;
        }

        .combo-option:hover, .combo-option:focus-visible {
            outline: none;
            background: var(--hover);
        }

        .combo-option[aria-selected="true"] {
            background: var(--accent-soft);
        }

        .combo-option[aria-selected="true"]::before {
            content: "";
            position: absolute;
            right: 9px;
            top: 50%;
            width: 10px;
            height: 6px;
            margin-top: -5px;
            border-left: 1.75px solid var(--accent);
            border-bottom: 1.75px solid var(--accent);
            transform: rotate(-45deg);
        }

        .icon-btn {
            display: inline-grid;
            place-items: center;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            color: var(--muted);
            transition: color 0.15s, background-color 0.15s;
        }

        .icon-btn:hover {
            color: var(--text);
            background: var(--hover);
        }

        /* the server page */

        .page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 28px 20px 64px;
        }

        [role="tabpanel"][hidden] {
            display: none !important;
        }

        /* the dot, the status word and the buttons share one center line, 20px down */
        .status {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            min-height: 40px;
        }

        .status-dot {
            flex: none;
            width: 8px;
            height: 8px;
            margin-top: 16px;
            border-radius: 50%;
            background: var(--subtle);
        }

        .status-dot[data-state="running"] {
            background: var(--green);
        }

        .status-text {
            display: flex;
            flex: 1 1 0;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 4px 12px;
            min-width: 0;
            padding-top: 8px;
            font-size: 15px;
            font-weight: 600;
        }

        .status-text .mono {
            color: var(--muted);
            font-size: 13px;
            font-weight: 400;
            overflow-wrap: anywhere;
        }

        .status-url {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        /* the second line: open, uptime, streaming */
        .status-meta {
            display: flex;
            flex-basis: 100%;
            flex-wrap: wrap;
            gap: 4px 0;
            color: var(--muted);
            font-size: 13px;
            font-weight: 400;
        }

        .status-meta > span:not(.hidden) ~ span:not(.hidden)::before {
            content: "·";
            margin: 0 10px;
            color: var(--subtle);
        }

        /* a fact the page states in amber: the open-server banner, and the same warning in the Start dialog */
        .notice {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px 10px;
            margin: 0 0 16px;
            padding: 10px 14px;
            border-radius: 10px;
            background: var(--amber-soft);
            color: var(--text);
            font-size: 13px;
            line-height: 1.45;
        }

        .notice svg {
            flex: none;
            color: var(--amber);
        }

        .notice b {
            font-weight: 600;
        }

        .notice-text {
            flex: 1 1 320px;
            min-width: 0;
        }

        .notice .mono {
            overflow-wrap: anywhere;
        }

        .notice-action {
            color: var(--accent);
            font-weight: 500;
            white-space: nowrap;
            border-radius: 4px;
            transition: opacity 0.15s;
        }

        .notice-action:hover {
            opacity: 0.8;
        }

        .icon-btn.small {
            width: 24px;
            height: 24px;
            border-radius: 6px;
            color: var(--subtle);
        }

        /* the chat page's shimmer, on the status word while a start, an apply or a stop is on its way, and on a
           test's word while it runs (.state, defined further down, would otherwise give that word its colour back) */
        .loading, .state.loading {
            background: linear-gradient(90deg, var(--subtle) 0%, var(--subtle) 35%, var(--text) 50%, var(--subtle) 65%, var(--subtle) 100%);
            background-size: 250% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: shimmer 1.8s linear infinite;
        }

        @keyframes shimmer {
            from {
                background-position: 100% 0;
            }

            to {
                background-position: -150% 0;
            }
        }

        /* right-aligned with Apply left of Save: when Apply goes after a click, what slides under the pointer is
           a disabled Save, never Stop */
        .actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            margin: 4px 0 0 auto;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 32px;
            padding: 0 12px;
            border-radius: 8px;
            background: var(--accent);
            color: var(--on-accent);
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            transition: opacity 0.15s, background-color 0.15s;
        }

        .btn:hover {
            opacity: 0.9;
        }

        /* Stop is a ring: a running server has a filled button only while Apply waits */
        .btn.secondary {
            background: var(--surface);
            color: var(--text);
            box-shadow: 0 0 0 1px var(--ring-strong);
        }

        .btn:disabled {
            opacity: 0.5;
        }

        .kbd {
            margin-left: 2px;
            padding: 0 5px;
            border-radius: 4px;
            box-shadow: 0 0 0 1px var(--ring);
            color: var(--subtle);
            font: 500 11px/18px var(--mono);
        }

        /* the Saved flash reads at full strength, though the button is disabled again by then */
        #saveButton[data-flash="true"] {
            color: var(--text);
            opacity: 1;
        }

        #serverError {
            margin: 10px 0 0 20px;
            font-size: 12.5px;
        }

        /* tabs: underline, the accent under the open one */
        .tabs {
            display: flex;
            gap: 24px;
            margin: 20px 0 24px;
            box-shadow: inset 0 -1px 0 var(--ring);
        }

        .tabs [role="tab"] {
            position: relative;
            height: 36px;
            padding: 0 2px;
            color: var(--muted);
            font-size: 13px;
            font-weight: 500;
            transition: color 0.15s;
        }

        .tabs [role="tab"]:hover, .tabs [role="tab"][aria-selected="true"] {
            color: var(--text);
        }

        .tabs [role="tab"][aria-selected="true"]::after {
            content: "";
            position: absolute;
            right: 0;
            bottom: 0;
            left: 0;
            height: 2px;
            border-radius: 1px;
            background: var(--accent);
        }

        .tabs [role="tab"]:focus-visible {
            border-radius: 6px;
            outline-offset: -2px;
        }

        /* cards: the surface and its ring, one radius everywhere */
        .card {
            min-width: 0;
            background: var(--surface);
            border-radius: 12px;
            box-shadow: var(--shadow-card);
        }

        .card-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 48px;
            padding: 0 20px;
            box-shadow: inset 0 -1px 0 var(--ring);
        }

        .card-title {
            font-size: 13px;
            font-weight: 600;
        }

        /* a button that ends a card head lines up with the card's content; a group of them shifts as one */
        .card-head > .ghost-btn {
            margin-right: -8px;
        }

        .card-actions {
            display: flex;
            gap: 2px;
            margin-right: -8px;
        }

        /* the overview is one column; the running part shows between the checklist and the cards by order */
        #panelOverview {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .dashboard {
            display: contents;
        }

        #checklist {
            order: 0;
        }

        .toolbar {
            order: 1;
            display: flex;
            justify-content: flex-end;
        }

        .tiles {
            order: 2;
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 12px;
        }

        .models-grid {
            order: 3;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
            align-items: stretch;
        }

        .models-grid:empty {
            display: none;
        }

        .charts {
            order: 4;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .dashboard[data-stale="true"] .tiles, .dashboard[data-stale="true"] .chart-card {
            opacity: 0.5;
            transition: opacity 0.15s;
        }

        .toolbar .segmented button {
            padding: 0 12px;
        }

        /* the range: six presets and a custom segment whose popover takes two local times */
        .range {
            position: relative;
        }

        #rangeCustom {
            gap: 6px;
            grid-auto-flow: column;
        }

        .popover {
            position: absolute;
            z-index: 30;
            top: calc(100% + 6px);
            right: 0;
            width: min(280px, calc(100vw - 24px));
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 8px 10px;
            align-items: center;
            padding: 12px;
            background: var(--surface);
            border-radius: 10px;
            box-shadow: var(--shadow-menu);
            transform-origin: top right;
            animation: menu-in 0.18s var(--ease);
        }

        .popover .field-note, .popover .field-error {
            grid-column: 1 / -1;
            margin: 0;
        }

        .popover .btn {
            grid-column: 1 / -1;
            justify-self: end;
            height: 30px;
            padding: 0 12px;
        }

        .popover input[type="datetime-local"] {
            min-height: 32px;
            padding: 5px 8px;
        }

        /* tiles: a label, the number, its change, a line of context and a trend */
        .tile {
            display: grid;
            grid-template-rows: auto auto auto 28px;
            gap: 6px;
            padding: 14px 16px 12px;
        }

        .tile-label {
            color: var(--muted);
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
        }

        .tile-row {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 2px 10px;
            min-width: 0;
        }

        .tile-value {
            font-size: 24px;
            font-weight: 600;
            letter-spacing: -0.02em;
            line-height: 1.1;
            white-space: nowrap;
        }

        .tile-value[data-empty="true"] {
            color: var(--subtle);
            font-weight: 400;
        }

        .tile-delta {
            color: var(--muted);
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
        }

        .tile-delta[data-good="true"] {
            color: var(--green);
        }

        .tile-delta[data-good="false"] {
            color: var(--red);
        }

        .tile-foot {
            color: var(--subtle);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .spark {
            display: block;
            width: 100%;
            height: 28px;
            overflow: visible;
        }

        .spark path {
            fill: none;
            stroke: var(--subtle);
            stroke-width: 1.5;
            stroke-linejoin: round;
            stroke-linecap: round;
        }

        .spark .end {
            fill: var(--accent);
        }

        .spark .pt {
            fill: var(--subtle);
        }

        /* model cards */
        .model-card {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 16px 20px 14px;
            cursor: pointer;
            transition: box-shadow 0.15s;
        }

        @media (hover: hover) {
            .model-card:hover {
                box-shadow: var(--shadow-card-hover);
            }
        }

        .model-card:focus-visible {
            outline-offset: 2px;
        }

        .model-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-width: 0;
        }

        .model-head .served {
            min-width: 0;
            color: var(--text);
            font-size: 14px;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .model-card .upstream {
            margin-top: -6px;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Last holds words ("failed 3 min ago"), so its column is the widest */
        .model-stats {
            display: grid;
            grid-template-columns: minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 1.3fr);
            gap: 10px 12px;
            padding-top: 10px;
            box-shadow: inset 0 1px 0 var(--ring);
        }

        .model-stats .stat {
            display: flex;
            flex-direction: column;
            gap: 1px;
            min-width: 0;
        }

        .model-stats b {
            font-size: 15px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .model-stats b.words {
            font-size: 12px;
            font-weight: 500;
            line-height: 22px;
        }

        .model-stats b[data-empty="true"] {
            color: var(--subtle);
            font-weight: 400;
        }

        .model-stats span {
            color: var(--subtle);
            font-size: 11px;
        }

        .model-note {
            margin: 0;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .model-hint {
            margin: auto 0 0;
            padding-top: 10px;
            box-shadow: inset 0 1px 0 var(--ring);
            color: var(--subtle);
            font-size: 12px;
        }

        /* charts: one axis each, hairline grid, columns at most 24px with 2px of surface between segments */
        .chart-card .chart {
            position: relative;
            height: 212px;
            padding: 12px 20px 8px 12px;
        }

        .chart svg {
            display: block;
            width: 100%;
            height: 100%;
            overflow: visible;
        }

        .chart svg:focus-visible {
            border-radius: 4px;
            outline: 2px solid var(--accent);
            outline-offset: 4px;
        }

        .grid line {
            stroke: var(--ring);
            stroke-width: 1;
            shape-rendering: crispEdges;
        }

        .axis text {
            fill: var(--subtle);
            font: 11px var(--mono);
            font-variant-numeric: tabular-nums;
        }

        .bar.ok {
            fill: var(--accent);
        }

        .bar.fail {
            fill: var(--red);
        }

        .bar.drop {
            fill: var(--subtle);
        }

        .hit {
            fill: transparent;
        }

        .line {
            fill: none;
            stroke-width: 2;
            stroke-linejoin: round;
            stroke-linecap: round;
        }

        .line.p90, .dot.p90 {
            stroke: var(--accent);
        }

        .line.p50, .dot.p50 {
            stroke: var(--muted);
        }

        .dot.p90 {
            fill: var(--accent);
        }

        .dot.p50 {
            fill: var(--muted);
        }

        .dot {
            stroke-width: 0;
        }

        .cross {
            stroke: var(--ring-strong);
            stroke-width: 1;
            shape-rendering: crispEdges;
        }

        .legend {
            display: flex;
            gap: 14px;
            color: var(--muted);
            font-size: 12px;
        }

        .key::before {
            content: "";
            display: inline-block;
            width: 8px;
            height: 8px;
            margin-right: 6px;
            border-radius: 2px;
            vertical-align: 0;
        }

        .key.ok::before {
            background: var(--accent);
        }

        .key.fail::before {
            background: var(--red);
        }

        .key.drop::before {
            background: var(--subtle);
        }

        .key.line::before {
            width: 12px;
            height: 2px;
            border-radius: 1px;
            vertical-align: 3px;
        }

        .key.line.p90::before {
            background: var(--accent);
        }

        .key.line.p50::before {
            background: var(--muted);
        }

        .chart-tip {
            position: fixed;
            z-index: 20;
            min-width: 150px;
            padding: 8px 10px;
            pointer-events: none;
            background: var(--surface);
            border-radius: 8px;
            box-shadow: var(--shadow-menu);
            font-size: 12px;
        }

        .chart-tip .when {
            margin-bottom: 4px;
            color: var(--subtle);
            font-family: var(--mono);
            font-size: 11px;
        }

        .chart-tip .r {
            display: flex;
            align-items: center;
            gap: 8px;
            line-height: 20px;
        }

        .chart-tip .r i {
            flex: none;
            width: 10px;
            height: 2px;
            border-radius: 1px;
            background: transparent;
        }

        .chart-tip .r i.ok, .chart-tip .r i.p90 {
            background: var(--accent);
        }

        .chart-tip .r i.fail {
            background: var(--red);
        }

        .chart-tip .r i.drop {
            background: var(--subtle);
        }

        .chart-tip .r i.p50 {
            background: var(--muted);
        }

        .chart-tip .r b {
            min-width: 48px;
            font-family: var(--mono);
            font-weight: 500;
            font-variant-numeric: tabular-nums;
        }

        .chart-tip .r span {
            color: var(--muted);
        }

        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
            white-space: nowrap;
        }

        /* errors */
        /* up to a hundred over a month: about ten rows show, the rest scroll inside the card */
        .errors {
            max-height: 372px;
            margin: 0;
            padding: 6px 20px 10px;
            overflow-y: auto;
            list-style: none;
        }

        .errors li {
            display: grid;
            grid-template-columns: 70px minmax(80px, 160px) minmax(0, 1fr);
            gap: 12px;
            padding: 8px 0;
            font-size: 12.5px;
        }

        .errors li + li {
            box-shadow: inset 0 1px 0 var(--ring);
        }

        .errors .time {
            color: var(--subtle);
        }

        .errors .model {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .errors .message {
            color: var(--muted);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .errors li.none {
            display: block;
            padding: 14px 0;
            color: var(--subtle);
        }

        /* a range of a day or more puts the day in front of the time */
        .errors[data-days="true"] li {
            grid-template-columns: 118px minmax(80px, 160px) minmax(0, 1fr);
        }

        /* the checklist while stopped */
        .checklist .steps {
            margin: 0;
            padding: 4px 20px 8px;
            list-style: none;
        }

        .step {
            display: grid;
            grid-template-columns: 24px minmax(0, 1fr) auto;
            gap: 14px;
            align-items: center;
            padding: 14px 0;
        }

        .step + .step {
            box-shadow: inset 0 1px 0 var(--ring);
        }

        .step-mark {
            display: grid;
            place-items: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            box-shadow: inset 0 0 0 1.5px var(--ring-strong);
            color: var(--muted);
            font-size: 12px;
            font-weight: 600;
        }

        .step[data-done="true"] .step-mark {
            background: var(--green);
            box-shadow: none;
            color: var(--on-accent);
        }

        .step-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }

        .step-text b {
            font-size: 13px;
            font-weight: 600;
        }

        .step-text span {
            color: var(--muted);
            font-size: 12px;
        }

        .step[data-done="true"] .step-text b {
            color: var(--muted);
            font-weight: 500;
        }

        /* the Models tab: rows that open to edit */
        .table {
            --cols: minmax(140px, 1fr) minmax(180px, 2fr) 96px 20px;
            padding: 4px 12px 8px;
        }

        .table-head {
            display: grid;
            grid-template-columns: var(--cols) 32px;
            gap: 8px;
            padding: 8px;
            color: var(--subtle);
            font-size: 12px;
            font-weight: 500;
        }

        /* a row scrolled to (a refusal under it) stops below the sticky top bar */
        .row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 32px;
            column-gap: 8px;
            align-items: center;
            scroll-margin-top: 72px;
        }

        .row + .row {
            border-top: 1px solid var(--ring);
        }

        /* the editor follows the summary in the tab order and Remove comes last, though Remove sits beside the summary */
        .row > .remove-btn {
            grid-row: 1;
            grid-column: 2;
        }

        .summary {
            display: grid;
            grid-template-columns: var(--cols);
            gap: 8px;
            align-items: center;
            min-height: 44px;
            padding: 10px 8px;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.15s;
        }

        /* only where a pointer hovers: on a touch screen a tapped row would keep the tint */
        @media (hover: hover) {
            .summary:hover {
                background: var(--hover);
            }
        }

        .summary:focus-visible {
            outline-offset: -2px;
        }

        .summary .cell {
            min-width: 0;
        }

        .served {
            color: var(--text);
            font-size: 13px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .served[data-empty="true"] {
            color: var(--subtle);
        }

        .upstream {
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .row-chevron {
            display: grid;
            place-items: center;
            color: var(--subtle);
        }

        .row-chevron svg {
            transition: transform 0.2s var(--ease);
        }

        .row[data-open="true"] .row-chevron svg {
            transform: rotate(180deg);
        }

        .row-note {
            grid-column: 1 / -1;
            margin: -4px 0 10px 8px;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .row-note.err {
            color: var(--red);
            white-space: normal;
            overflow-wrap: anywhere;
        }

        /* the last Test of a row: its word, then what the upstream answered */
        .row-test {
            grid-column: 1 / -1;
            display: flex;
            align-items: baseline;
            gap: 10px;
            margin: -4px 0 10px 8px;
            color: var(--muted);
            font-size: 12px;
        }

        .row-test .test-text {
            min-width: 0;
            overflow-wrap: anywhere;
        }

        .row-test[data-state="error"] .test-text {
            color: var(--red);
        }

        .test-field .btn {
            align-self: flex-start;
        }

        /* only opacity and a 4px rise: the layout itself never animates */
        .editor {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px 16px;
            padding: 4px 8px 16px;
            animation: editor-in 0.18s var(--ease);
        }

        @keyframes editor-in {
            from {
                opacity: 0;
                transform: translateY(-4px);
            }
        }

        .field {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 0;
        }

        .field > span {
            color: var(--muted);
            font-size: 12px;
            font-weight: 500;
        }

        .key-wrap {
            position: relative;
            min-width: 0;
        }

        .key-wrap .control {
            padding-right: 36px;
        }

        .key-eye {
            position: absolute;
            top: 50%;
            right: 4px;
            display: grid;
            place-items: center;
            width: 26px;
            height: 26px;
            margin-top: -13px;
            border-radius: 6px;
            color: var(--subtle);
            transition: color 0.15s, background-color 0.15s;
        }

        .key-eye:hover {
            color: var(--text);
            background: var(--hover);
        }

        .remove-btn {
            align-self: start;
            margin-top: 6px;
            color: var(--subtle);
        }

        /* wider than its field, so every client type and both headings fit on one line */
        .row [data-combobox-menu] {
            right: auto;
            width: max(100%, 300px);
        }

        /* Settings */
        .settings {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            align-items: start;
        }

        .card-body {
            padding: 12px 20px 16px;
        }

        .key-row {
            grid-template-columns: 96px minmax(0, 1fr) 32px;
            padding: 6px 0;
        }

        .key-row > .remove-btn {
            grid-column: 3;
            align-self: center;
            margin-top: 0;
        }

        #keysNote {
            margin: 0;
            padding: 6px 0;
        }

        .listen-row {
            display: grid;
            grid-template-columns: auto minmax(120px, 1fr) auto 96px auto;
            gap: 8px 10px;
            align-items: center;
        }

        /* the saved file, formatted: keys muted, strings in the accent, punctuation and masked keys subtle */
        .file-card {
            margin-top: 16px;
        }

        .file-path {
            flex: 1;
            min-width: 0;
            color: var(--muted);
            font-size: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .file-actions {
            display: flex;
            gap: 2px;
            margin-right: -8px;
        }

        .icon-btn:disabled {
            color: var(--subtle);
            background: none;
            opacity: 0.5;
        }

        .file-note {
            margin: 0;
            padding: 14px 20px;
            color: var(--subtle);
            font-size: 12.5px;
        }

        .file-note[data-error="true"] {
            color: var(--red);
            overflow-wrap: anywhere;
        }

        .json {
            margin: 0;
            padding: 12px 20px 16px;
            max-height: 520px;
            overflow: auto;
            font: 12px/1.65 var(--mono);
            color: var(--text);
            white-space: pre;
        }

        .json .k {
            color: var(--muted);
            font-weight: 500;
        }

        .json .s {
            color: var(--accent);
        }

        .json .n {
            color: var(--text);
        }

        .json .p, .json .m {
            color: var(--subtle);
        }

        /* a file that is not JSON, shown as it is */
        .json[data-raw="true"] {
            color: var(--muted);
        }

        .json:focus-visible {
            outline-offset: -2px;
        }

        /* a state is a dot and its word, everywhere: amber ring unsaved, neutral saved, green live */
        .state {
            display: inline-flex;
            flex: none;
            align-items: center;
            gap: 6px;
            color: var(--muted);
            font-size: 12px;
            white-space: nowrap;
        }

        .state::before {
            content: "";
            flex: none;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            box-shadow: inset 0 0 0 1.5px var(--amber);
        }

        .state[data-state="saved"]::before {
            box-shadow: none;
            background: var(--subtle);
        }

        .state[data-state="live"]::before {
            box-shadow: none;
            background: var(--green);
        }

        .state[data-state="ok"]::before {
            box-shadow: none;
            background: var(--green);
        }

        .state[data-state="error"]::before {
            box-shadow: none;
            background: var(--red);
        }

        .state[data-state="testing"]::before {
            box-shadow: none;
            background: var(--subtle);
        }

        /* the Start and Apply confirmation: what the saved file will serve, and where */
        .modal {
            width: min(440px, calc(100vw - 32px));
            padding: 20px 22px 18px;
            border: 0;
            border-radius: 12px;
            background: var(--surface);
            color: var(--text);
            box-shadow: var(--shadow-menu);
        }

        .modal::backdrop {
            background: rgba(0, 0, 0, 0.35);
        }

        /* focusable, so that Enter pressed after a click on its text reaches handleDialogKeydown; the buttons
           carry the ring */
        .modal:focus-visible {
            outline: none;
        }

        .modal[open] {
            animation: menu-in 0.18s var(--ease);
        }

        .modal-title {
            margin: 0 0 14px;
            font-size: 15px;
            font-weight: 600;
            letter-spacing: -0.01em;
        }

        .facts {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 8px 14px;
            margin: 0;
            font-size: 13px;
        }

        .facts dt {
            color: var(--muted);
            font-size: 12.5px;
            font-weight: 500;
        }

        .facts dd {
            margin: 0;
            overflow-wrap: anywhere;
        }

        .modal .field-note {
            margin: 12px 0 0;
        }

        .modal .notice {
            flex-wrap: nowrap;
            align-items: flex-start;
            margin: 14px 0 0;
        }

        .modal .notice svg {
            margin-top: 2px;
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 18px;
        }

        @media (max-width: 1100px) {
            .tiles {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .models-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 900px) {
            .status {
                flex-wrap: wrap;
            }

            .actions {
                width: 100%;
                margin: 8px 0 0 20px;
            }

            .kbd {
                display: none;
            }

            .tabs {
                gap: 18px;
            }

            .settings {
                grid-template-columns: 1fr;
            }

            .chart-card .chart {
                height: 196px;
            }

            .errors li {
                grid-template-columns: 62px minmax(0, 1fr);
            }

            .errors[data-days="true"] li {
                grid-template-columns: 118px minmax(0, 1fr);
            }

            .errors .message {
                grid-column: 1 / -1;
            }

            .table-head {
                display: none;
            }

            .summary {
                grid-template-columns: minmax(0, 1fr) auto 20px;
                row-gap: 4px;
            }

            .summary .state {
                grid-row: 1;
                grid-column: 2;
            }

            .summary .row-chevron {
                grid-row: 1;
                grid-column: 3;
            }

            .summary .upstream {
                grid-column: 1 / -1;
            }

            /* a line that would only repeat the served id goes */
            .summary .upstream:empty, .summary .upstream[data-same="true"] {
                display: none;
            }

            .editor {
                grid-template-columns: 1fr;
            }

            .listen-row {
                grid-template-columns: auto 1fr;
            }

            .listen-row .state {
                grid-column: 1 / -1;
            }
        }

        @media (max-width: 700px) {
            .tiles {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }

            .tile-value {
                font-size: 22px;
            }

            .models-grid {
                grid-template-columns: 1fr;
                gap: 12px;
            }

            .model-card {
                padding: 14px 16px 12px;
            }

            .toolbar .segmented button {
                padding: 0 8px;
            }

            .errors[data-days="true"] li {
                grid-template-columns: 110px minmax(0, 1fr);
            }
        }

        @media (max-width: 640px) {
            .topbar {
                gap: 10px;
                padding: 0 12px;
            }

            .label-wide {
                display: none;
            }

            .page {
                padding: 20px 12px 48px;
            }

            .tile {
                padding: 12px 14px;
            }

            .card-head {
                padding: 0 14px;
            }

            .card-body {
                padding: 10px 14px 14px;
            }

            .table, .errors, .checklist .steps {
                padding-right: 6px;
                padding-left: 6px;
            }

            .errors, .checklist .steps {
                padding-right: 14px;
                padding-left: 14px;
            }

            .chart-card .chart {
                padding: 12px 10px 8px 4px;
            }

            /* seven segments fill a phone; a custom range's words go under the control, right-aligned with it */
            .range[data-custom="true"] {
                padding-bottom: 22px;
            }

            #rangeCustomLabel {
                position: absolute;
                top: calc(100% + 9px);
                right: -3px;
                color: var(--muted);
                font-size: 12px;
                font-weight: 400;
            }

            .json {
                padding: 12px 14px 14px;
                font-size: 11.5px;
            }

            .file-note {
                padding: 12px 14px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                transition-duration: 0.01ms !important;
            }
        }
    </style>
</head>
<body>
    <header class="topbar">
        <a class="brand" href="/server/"><svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M15.5 0H25a7 7 0 0 1 7 7v9.5H15.5Z" class="mark-bg"></path><path d="M0 15.5h16.5V32H7a7 7 0 0 1-7-7Z" class="mark-bg"></path><path d="M0 16V7a7 7 0 0 1 7-7h9v16Z" fill="#477dfb"></path><path d="M16 16h16v9a7 7 0 0 1-7 7h-9Z" fill="#477dfb"></path><g fill="#fff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="10.5" font-weight="700" text-anchor="middle" dominant-baseline="central"><text x="8.5" y="8.5">M</text><text x="23.5" y="8.5">M</text><text x="8.5" y="23.5">S</text><text x="23.5" y="23.5">P</text></g></svg><span class="brand-name">MMSP</span><span class="brand-sub">Server</span></a>
        <div class="topbar-actions">
            <a href="https://github.com/Prism-Shadow/model-message-stream-protocol" target="_blank" rel="noopener noreferrer" class="ghost-btn" title="GitHub"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"></path></svg><span class="label-wide">GitHub</span></a>
            <div class="segmented theme-toggle" id="themeToggle" role="radiogroup" aria-label="Theme">
                <span class="seg-thumb" aria-hidden="true"></span>
                <button type="button" role="radio" aria-checked="false" aria-label="Light theme" title="Light" data-theme-choice="light" onclick="setTheme('light')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg></button>
                <button type="button" role="radio" aria-checked="false" aria-label="Dark theme" title="Dark" data-theme-choice="dark" onclick="setTheme('dark')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path></svg></button>
            </div>
        </div>
    </header>
    <main class="page">
        <div id="openBanner" class="notice hidden" role="status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4M12 17h.01"></path></svg>
            <span class="notice-text"><b>Open server.</b> No keys: anyone who can reach <span id="openBannerUrl" class="mono"></span> can use its models.</span>
            <button type="button" id="openBannerAction" class="notice-action" onclick="addKeyFromBanner()">Add a key</button>
        </div>
        <section class="status" id="statusBar">
            <span class="status-dot" id="statusDot" data-state="stopped" aria-hidden="true"></span>
            <div class="status-text" role="status">
                <span id="statusText">Stopped</span>
                <span id="statusUrlWrap" class="status-url hidden">
                    <span id="statusUrl" class="mono"></span>
                    <button type="button" id="copyUrlButton" class="icon-btn small" title="Copy" aria-label="Copy base URL" onclick="copyBaseUrl()"><svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><svg class="copied-icon hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg></button>
                </span>
                <span class="status-meta hidden" id="statusMeta"><span id="statusOpen" class="hidden" title="No keys: open to every request">open</span><span id="statusUptime"></span><span id="statusStreaming" class="hidden"></span></span>
            </div>
            <div class="actions">
                <button type="button" id="applyButton" class="btn hidden" onclick="openStartDialog('apply')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg><span id="applyLabel">Apply</span></button>
                <button type="button" id="saveButton" class="ghost-btn" onclick="saveServerConfig()" disabled><svg class="save-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><path d="M17 21v-8H7v8M7 3v5h8"></path></svg><svg class="saved-icon hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg><span id="saveLabel">Save</span><kbd id="saveKey" class="kbd" aria-hidden="true">⌘S</kbd></button>
                <button type="button" id="serverToggle" class="btn" data-state="stopped" onclick="toggleServer()" disabled title="Save first">
                    <svg id="serverToggleStart" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8Z"></path></svg>
                    <svg id="serverToggleStop" class="hidden" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>
                    <span id="serverToggleLabel">Start</span>
                </button>
            </div>
        </section>
        <p id="serverError" class="field-error hidden" role="alert"></p>

        <nav class="tabs" id="tabs" role="tablist" aria-label="Sections">
            <button type="button" role="tab" id="tabOverview" aria-selected="true" aria-controls="panelOverview" data-tab="overview" onclick="showTab('overview')" onkeydown="handleTabKeydown(event)">Overview</button>
            <button type="button" role="tab" id="tabModels" aria-selected="false" aria-controls="panelModels" data-tab="models" tabindex="-1" onclick="showTab('models')" onkeydown="handleTabKeydown(event)">Models</button>
            <button type="button" role="tab" id="tabSettings" aria-selected="false" aria-controls="panelSettings" data-tab="settings" tabindex="-1" onclick="showTab('settings')" onkeydown="handleTabKeydown(event)">Settings</button>
        </nav>

        <section id="panelOverview" role="tabpanel" aria-labelledby="tabOverview">
            <div class="card checklist" id="checklist">
                <div class="card-head"><span class="card-title">Start the server</span></div>
                <ol class="steps">
                    <li class="step" data-done="false"><span class="step-mark">1</span><span class="step-text"><b>Add a model</b><span>Model id, served id and key.</span></span><button type="button" class="ghost-btn" onclick="showTab('models', true)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>Model</span></button></li>
                    <li class="step" data-done="false"><span class="step-mark">2</span><span class="step-text"><b>Save</b><span>Writes the file Start reads.</span></span><button type="button" class="ghost-btn" id="checklistSave" onclick="saveServerConfig()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><path d="M17 21v-8H7v8M7 3v5h8"></path></svg><span>Save</span></button></li>
                    <li class="step" data-done="false"><span class="step-mark">3</span><span class="step-text"><b>Start</b><span>Serves the file; the numbers appear here.</span></span></li>
                </ol>
            </div>
            <div class="dashboard hidden" id="dashboard" data-stale="false">
                <div class="toolbar">
                    <div class="range" id="rangeWrap">
                        <div class="segmented" id="rangeControl" role="radiogroup" aria-label="Range">
                            <span class="seg-thumb" aria-hidden="true"></span>
                            <button type="button" role="radio" aria-checked="true" data-range="900" onclick="setRange(900)">15 min</button>
                            <button type="button" role="radio" aria-checked="false" data-range="3600" onclick="setRange(3600)">1 h</button>
                            <button type="button" role="radio" aria-checked="false" data-range="21600" onclick="setRange(21600)">6 h</button>
                            <button type="button" role="radio" aria-checked="false" data-range="86400" onclick="setRange(86400)">24 h</button>
                            <button type="button" role="radio" aria-checked="false" data-range="604800" onclick="setRange(604800)">7 d</button>
                            <button type="button" role="radio" aria-checked="false" data-range="2592000" onclick="setRange(2592000)">30 d</button>
                            <button type="button" role="radio" aria-checked="false" data-range="custom" id="rangeCustom" aria-haspopup="dialog" aria-expanded="false" aria-controls="rangePopover" title="Custom range" onclick="toggleRangePopover()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg><span id="rangeCustomLabel" class="hidden"></span></button>
                        </div>
                        <div class="popover hidden" id="rangePopover" role="dialog" aria-label="Custom range" onkeydown="handleRangeKeydown(event)">
                            <label class="field-label" for="rangeFrom">From</label><input id="rangeFrom" class="control code" type="datetime-local" step="60">
                            <label class="field-label" for="rangeTo">To</label><input id="rangeTo" class="control code" type="datetime-local" step="60">
                            <p class="field-note hidden" id="rangeSince"></p>
                            <p class="field-error hidden" id="rangeError" role="alert"></p>
                            <button type="button" class="btn" id="rangeApply" onclick="applyCustomRange()">Show</button>
                        </div>
                    </div>
                </div>
                <div class="tiles" id="tiles">
                    <div class="card tile" id="tileRequests"><span class="tile-label">Requests</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                    <div class="card tile" id="tileSuccess"><span class="tile-label">Success</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                    <div class="card tile" id="tileLatencyP50"><span class="tile-label">Latency p50</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                    <div class="card tile" id="tileLatencyP90"><span class="tile-label">Latency p90</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                    <div class="card tile" id="tileTokens"><span class="tile-label">Tokens out</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                    <div class="card tile" id="tileTps"><span class="tile-label" title="Output tokens per second of generation (thinking + response)">TPS</span><div class="tile-row"><b class="tile-value">–</b><span class="tile-delta"></span></div><span class="tile-foot"></span><svg class="spark" aria-hidden="true"></svg></div>
                </div>
                <div class="charts">
                    <div class="card chart-card">
                        <div class="card-head"><span class="card-title">Requests</span><span class="legend"><span class="key ok">ok</span><span class="key fail">failed</span><span class="key drop">dropped</span></span></div>
                        <div class="chart" id="requestsChart"></div>
                    </div>
                    <div class="card chart-card">
                        <div class="card-head"><span class="card-title">Latency</span><span class="legend"><span class="key line p90">p90</span><span class="key line p50">p50</span></span></div>
                        <div class="chart" id="latencyChart"></div>
                    </div>
                    <div class="card">
                        <div class="card-head"><span class="card-title">Errors</span></div>
                        <ul class="errors" id="errorList"></ul>
                    </div>
                </div>
            </div>
            <div class="models-grid" id="modelCards"></div>
            <div class="chart-tip hidden" id="chartTip" role="tooltip"></div>
        </section>

        <section id="panelModels" role="tabpanel" aria-labelledby="tabModels" hidden>
            <div class="card">
                <div class="card-head"><span class="card-title">Models</span><span class="card-actions"><button type="button" id="testAllButton" class="ghost-btn" onclick="testAll()" disabled title="Model id and key first"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12.5 2.5 2.5 4.5-5"></path></svg><span>Test all</span></button><button type="button" id="addRowButton" class="ghost-btn" onclick="addRow()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>Model</span></button></span></div>
                <div class="table" id="modelTable">
                    <div class="table-head" id="tableHead" aria-hidden="true"><span>Served as</span><span>Model</span><span>State</span><span></span><span></span></div>
                    <div id="modelRows" role="list"></div>
                </div>
            </div>
        </section>

        <section id="panelSettings" role="tabpanel" aria-labelledby="tabSettings" hidden>
            <div class="settings">
                <div class="card">
                    <div class="card-head"><span class="card-title">Keys</span><button type="button" id="addKeyButton" class="ghost-btn" onclick="addKey()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>Key</span></button></div>
                    <div class="card-body">
                        <div id="apiKeyRows" role="list"></div>
                        <p id="keysNote" class="field-note">None: open to every request.</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-head"><span class="card-title">Listen</span></div>
                    <div class="card-body">
                        <div class="listen-row">
                            <label class="field-label" for="hostInput">Host</label>
                            <input id="hostInput" class="control code" type="text" value="127.0.0.1" placeholder="127.0.0.1" spellcheck="false" autocomplete="off" oninput="saveDraft()">
                            <label class="field-label" for="portInput">Port</label>
                            <input id="portInput" class="control code" type="number" min="0" max="65535" value="25752" placeholder="25752" oninput="saveDraft()">
                            <span class="state" id="listenState" data-state="unsaved">Unsaved</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card file-card" id="fileCard">
                <div class="card-head">
                    <span class="card-title">File</span>
                    <span id="configPath" class="mono file-path"></span>
                    <span class="file-actions">
                        <button type="button" id="fileReveal" class="icon-btn small" data-visible="false" aria-label="Show keys" title="Show keys" onclick="toggleFileKeys()" disabled><svg class="eye-off" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.7 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.3 4.3"></path><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a10.9 10.9 0 0 0 5.4-1.4"></path><path d="M9.9 9.9A3 3 0 0 0 14.1 14.1"></path><path d="M3 3l18 18"></path></svg><svg class="eye-on hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                        <button type="button" id="fileCopy" class="icon-btn small" aria-label="Copy file" title="Copy" onclick="copyFile()" disabled><svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><svg class="copied-icon hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg></button>
                    </span>
                </div>
                <p id="fileNote" class="file-note hidden"></p>
                <pre id="fileView" class="json" tabindex="0"><code></code></pre>
            </div>
        </section>

        <dialog id="startDialog" class="modal" tabindex="-1" aria-labelledby="startDialogTitle" onkeydown="handleDialogKeydown(event)" onclose="handleDialogClose()">
            <h2 id="startDialogTitle" class="modal-title">Start the server?</h2>
            <dl class="facts">
                <dt>Listens at</dt><dd id="startDialogUrl" class="mono"></dd>
                <dt>Models</dt><dd id="startDialogModels"></dd>
                <dt>Keys</dt><dd id="startDialogKeys"></dd>
            </dl>
            <p id="startDialogNote" class="field-note hidden">The running server stops and this file is served.</p>
            <p id="startDialogWarning" class="notice hidden"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4M12 17h.01"></path></svg><span class="notice-text">No keys: anyone who can reach the URL can use its models.</span></p>
            <div class="modal-actions">
                <button type="button" id="startDialogCancel" class="btn secondary" onclick="closeStartDialog()">Cancel</button>
                <button type="button" id="startDialogConfirm" class="btn" onclick="confirmStartDialog()">Start</button>
            </div>
        </dialog>
    </main>

    <script>
        // the client types the playground knows, official and compatible, for the client type menus
        const PLAYGROUND = __PLAYGROUND_DEFAULTS__;
        const CLIENT_TYPE_DESCRIPTIONS = {
            'openai-official': 'OpenAI',
            'anthropic-official': 'Anthropic',
            'google-official': 'Google Gemini',
            'zai-official': 'Z.AI',
            'moonshot-official': 'Moonshot',
            'deepseek-official': 'DeepSeek',
            'minimax-official': 'MiniMax',
            'openai-responses': 'OpenAI Responses',
            'openai-chat': 'OpenAI Chat Completions',
            'openai-chat-vllm-adapter': 'Chat Completions on vLLM',
            'openai-embedding': 'OpenAI Embeddings',
            'ant-messages': 'Anthropic Messages',
            'google-genai': 'Google generateContent',
            'mmsp': 'MMSP server'
        };
        const DRAFT_KEY = 'mmsp.playground.server';
        const RANGE_KEY = 'mmsp.playground.server.range';
        const API = '/server/api';
        const METRICS = '/server/api/metrics';
        const DEFAULT_HOST = '127.0.0.1';
        const DEFAULT_PORT = 25752;
        // a row's cells in the order the server's config lists them; the last two may be left out
        const COLUMNS = ['model_id', 'base_url', 'api_key', 'server_model_id', 'client_type'];
        const OPTIONAL_COLUMNS = ['base_url', 'client_type'];
        const METRICS_MS = 3000;
        const RANGES = [[900, '15 min'], [3600, '1 h'], [21600, '6 h'], [86400, '24 h'], [604800, '7 d'], [2592000, '30 d']];
        // the history the server keeps: a custom range is at most this long
        const MAX_RANGE_S = 5184000;
        const DAY = 86400;
        // the time axis steps, round local minutes up to a week
        const TICK_STEPS = [60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400, 172800, 604800];
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        // a key of the saved file shown masked, whatever its length
        const MASK = '••••••••';
        const TABS = ['overview', 'models', 'settings'];
        const PANELS = { overview: 'panelOverview', models: 'panelModels', settings: 'panelSettings' };
        // the plot inside a chart card: gutters for the y labels and the time axis, column width and gap; the page
        // asks the server for a column per wantSlot pixels; past 60 columns it merges below minSlot
        const CHART = { left: 44, right: 8, top: 8, bottom: 20, maxBar: 24, gap: 2, minSlot: 8, wantSlot: 12 };
        // window columns that add up when buckets merge; percentiles merge to their peak, TPS is recomputed
        const SUMMED = ['requests', 'successes', 'failures', 'disconnects', 'refused', 'tokens_out', 'thoughts', 'response', 'generation_ms'];
        const STATE_LABELS = { live: 'Live', saved: 'Saved', unsaved: 'Unsaved' };
        const TEST_LABELS = { testing: 'Testing…', ok: 'Passed', error: 'Failed' };
        // tests run against the vendors themselves, so a long table is not sent all at once
        const TEST_CONCURRENCY = 3;
        const TEST_TITLE = 'Model id and key first';
        const OUTCOME_WORDS = { success: 'ok', failure: 'failed', disconnect: 'dropped' };
        const CHEVRON_ICON = '<svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>';
        const REMOVE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>';
        const CHECK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
        const EYE_BUTTON = '<button type="button" class="key-eye" data-visible="false" aria-label="Show key" title="Show key" onclick="toggleKeyVisibility(this)">'
            + '<svg class="eye-on hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
            + '<svg class="eye-off" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.7 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.3 4.3"></path><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a10.9 10.9 0 0 0 5.4-1.4"></path><path d="M9.9 9.9A3 3 0 0 0 14.1 14.1"></path><path d="M3 3l18 18"></path></svg>'
            + '</button>';
        // set while the saved table is laid out again, which is not the user typing
        let restoring = false;
        let saved = null; // the GET /config body
        let status = { running: false };
        // stopped, starting, running, applying or stopping: what the buttons offer
        let phase = 'stopped';
        let metrics = null; // the last /api/metrics body: the running server's, or the history's while stopped
        let series = null; // its window: the range in columns of the span the server chose
        let range = { seconds: 900 }; // a preset, or { from, to } in unix seconds
        let lastColumns = 60; // the columns the last request asked for
        let fileKeysVisible = false;
        let fileText = ''; // what the File card shows, for Copy
        let fileCopyTimer = null;
        let tab = 'overview';
        let tip = null; // the tooltip shown: which chart, which column, where
        let pollTimer = null;
        // bumped by every poll and by a stop, so an answer that arrives late is dropped
        let metricsSeq = 0;
        let saving = false;
        let flashTimer = null;
        let copyTimer = null;
        let resizeTimer = null;
        let nextRowId = 1;
        let nextKeyId = 1;
        let testingAll = false;
        let dialogAction = 'start'; // what the Start dialog confirms: start or apply

        function $(id) {
            return document.getElementById(id);
        }

        function updateSegmentThumb(root) {
            const thumb = root && root.querySelector('.seg-thumb');
            const checked = root && root.querySelector('[aria-checked="true"]');
            if (!thumb || !checked || !checked.offsetWidth) {
                return;
            }
            thumb.style.width = checked.offsetWidth + 'px';
            thumb.style.transform = 'translateX(' + checked.offsetLeft + 'px)';
        }

        function updateThemeToggle() {
            const stored = document.documentElement.dataset.theme;
            const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.querySelectorAll('#themeToggle [data-theme-choice]').forEach(function (button) {
                button.setAttribute('aria-checked', button.dataset.themeChoice === theme ? 'true' : 'false');
            });
            updateSegmentThumb(document.getElementById('themeToggle'));
        }

        function setTheme(theme) {
            document.documentElement.dataset.theme = theme;
            try {
                localStorage.setItem('mmsp.playground.theme', theme);
            } catch (error) {
                // a browser that refuses storage keeps the choice for this page only
            }
            updateThemeToggle();
        }

        function closeCombobox(comboboxId) {
            const root = document.getElementById(comboboxId);
            if (!root) {
                return;
            }
            const menu = root.querySelector('[data-combobox-menu]');
            const button = root.querySelector('[data-combobox-button]');
            if (!menu || !button) {
                return;
            }
            menu.classList.add('hidden');
            button.setAttribute('aria-expanded', 'false');
        }

        function closeComboboxes(exceptId) {
            document.querySelectorAll('[data-combobox]').forEach((root) => {
                if (root.id !== exceptId) {
                    closeCombobox(root.id);
                }
            });
        }

        function visibleOptions(menu) {
            return Array.from(menu.querySelectorAll('[data-combobox-option]')).filter((option) => !option.classList.contains('hidden'));
        }

        function toggleCombobox(comboboxId) {
            const root = document.getElementById(comboboxId);
            const menu = root.querySelector('[data-combobox-menu]');
            const isOpen = !menu.classList.contains('hidden');
            closeComboboxes(comboboxId);
            if (isOpen) {
                closeCombobox(comboboxId);
                return;
            }
            menu.classList.remove('hidden');
            root.querySelector('[data-combobox-button]').setAttribute('aria-expanded', 'true');

            // the arrows need somewhere to start: the selected option, else the first
            const selected = menu.querySelector('[data-combobox-option][aria-selected="true"]') || visibleOptions(menu)[0];
            if (selected) {
                selected.scrollIntoView({ block: 'nearest' });
                selected.focus();
            }
        }

        function selectComboboxOption(comboboxId, option) {
            const root = document.getElementById(comboboxId);
            root.querySelector('[data-combobox-value]').value = option.dataset.value || '';
            const label = root.querySelector('[data-combobox-label]');
            label.textContent = option.dataset.label;
            label.classList.toggle('mono', !!option.dataset.value);

            root.querySelectorAll('[data-combobox-option]').forEach((item) => {
                item.setAttribute('aria-selected', item === option ? 'true' : 'false');
            });

            const wasOpen = root.querySelector('[data-combobox-button][aria-expanded="true"]');
            closeCombobox(comboboxId);
            if (wasOpen) {
                wasOpen.focus();
            }
            if (comboboxId.startsWith('clientType-')) {
                handleRowClientType(comboboxId.slice('clientType-'.length));
            }
        }

        function handleComboboxKeydown(event, comboboxId) {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                event.preventDefault();
                toggleCombobox(comboboxId);
            } else if (event.key === 'Escape') {
                // an open menu takes the Escape, so the editor around it stays open
                if (!document.getElementById(comboboxId + '-menu').classList.contains('hidden')) {
                    event.preventDefault();
                }
                closeCombobox(comboboxId);
            }
        }

        // arrows walk the open menu, Escape hands focus back to its button
        function handleMenuKeydown(event, comboboxId) {
            const root = document.getElementById(comboboxId);
            const menu = root.querySelector('[data-combobox-menu]');
            const options = visibleOptions(menu);
            const index = options.indexOf(document.activeElement);
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const step = event.key === 'ArrowDown' ? 1 : -1;
                const next = index < 0 ? (step > 0 ? 0 : options.length - 1) : Math.min(Math.max(index + step, 0), options.length - 1);
                if (options[next]) {
                    options[next].focus();
                }
            } else if (event.key === 'Enter' && index < 0 && options.length) {
                event.preventDefault();
                selectComboboxOption(comboboxId, options[0]);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                closeCombobox(comboboxId);
                root.querySelector('[data-combobox-button]').focus();
            }
        }

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }
            if (!target.closest('[data-combobox]')) {
                closeComboboxes();
            }
        });

        function clientTypeOption(comboboxId, value, label, description) {
            const option = document.createElement('button');
            option.type = 'button';
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            option.className = 'combo-option';
            option.setAttribute('data-combobox-option', '');
            option.dataset.value = value;
            option.dataset.label = label;
            option.dataset.description = description;
            const text = document.createElement('span');
            text.textContent = label;
            if (value) {
                text.className = 'mono';
            }
            option.appendChild(text);
            option.onclick = () => selectComboboxOption(comboboxId, option);
            return option;
        }

        function populateClientTypes(comboboxId) {
            const menu = document.getElementById(comboboxId + '-menu');
            const auto = clientTypeOption(comboboxId, '', 'Auto', 'The official client the model id names');
            auto.setAttribute('aria-selected', 'true');
            menu.appendChild(auto);
            [['Official: the vendor’s own API', PLAYGROUND.official], ['Compatible: any endpoint serving the protocol', PLAYGROUND.compatible]].forEach(([title, types]) => {
                const header = document.createElement('div');
                header.className = 'menu-heading';
                header.textContent = title;
                menu.appendChild(header);
                types.forEach((type) => menu.appendChild(clientTypeOption(comboboxId, type, type, CLIENT_TYPE_DESCRIPTIONS[type] || '')));
            });
        }

        function modelRows() {
            return Array.from(document.getElementById('modelRows').children);
        }

        function keyInputs() {
            return Array.from(document.querySelectorAll('#apiKeyRows [data-key]'));
        }

        function rowCell(row, column) {
            return row.querySelector('[data-column="' + column + '"]');
        }

        // a type the menu does not list (written into the file by hand) is kept, listed after Auto, so the
        // row still equals its saved form and the server can name it
        function setRowClientType(rowId, type) {
            const menu = document.getElementById('clientType-' + rowId + '-menu');
            let option = visibleOptions(menu).find((item) => item.dataset.value === type);
            if (!option) {
                option = clientTypeOption('clientType-' + rowId, type, type, '');
                menu.insertBefore(option, menu.querySelector('.menu-heading'));
            }
            selectComboboxOption('clientType-' + rowId, option);
        }
        function addRow(cells) {
            const rowId = 'r' + nextRowId++;
            const row = document.createElement('div');
            row.className = 'row';
            row.setAttribute('role', 'listitem');
            row.dataset.rowId = rowId;
            row.dataset.open = 'false';
            row.innerHTML = `
                <div class="summary" role="button" tabindex="0" aria-expanded="false" aria-controls="editor-${rowId}" aria-label="Edit" onclick="toggleRow('${rowId}')" onkeydown="handleSummaryKeydown(event, '${rowId}')">
                    <span class="cell served mono" data-label="Served as" data-empty="true">–</span>
                    <span class="cell upstream mono" data-label="Model"></span>
                    <span class="state" data-state="unsaved">Unsaved</span>
                    <span class="row-chevron" aria-hidden="true">${CHEVRON_ICON}</span>
                </div>
                <p class="row-note mono hidden"></p>
                <p class="row-test hidden"><span class="state test-state" data-state="testing">Testing…</span><span class="test-text mono"></span></p>
                <div class="editor hidden" id="editor-${rowId}">
                    <label class="field"><span>Model id</span><input class="control code" data-column="model_id" type="text" placeholder="claude-sonnet-5-5" aria-label="Model id" spellcheck="false" autocomplete="off" oninput="handleModelIdInput(this)"></label>
                    <label class="field"><span>Served as</span><input class="control code" data-column="server_model_id" type="text" placeholder="claude" aria-label="Served as" spellcheck="false" autocomplete="off" oninput="handleServerIdInput(this)"></label>
                    <div class="field"><span>API key</span><div class="key-wrap"><input class="control code key" data-column="api_key" type="password" placeholder="$ANTHROPIC_API_KEY" aria-label="API key" autocomplete="off" oninput="handleCellInput(this)">${EYE_BUTTON}</div></div>
                    <div class="field">
                        <span>Client type</span>
                        <div id="clientType-${rowId}" data-combobox>
                            <input type="hidden" data-combobox-value data-column="client_type" value="">
                            <button type="button" role="combobox" aria-expanded="false" aria-controls="clientType-${rowId}-menu" aria-label="Client type" class="control code combo-button" onclick="toggleCombobox('clientType-${rowId}')" onkeydown="handleComboboxKeydown(event, 'clientType-${rowId}')" data-combobox-button><span data-combobox-label>Auto</span>${CHEVRON_ICON}</button>
                            <div id="clientType-${rowId}-menu" class="hidden" role="listbox" aria-label="Client type" data-combobox-menu onkeydown="handleMenuKeydown(event, 'clientType-${rowId}')"></div>
                        </div>
                    </div>
                    <label class="field"><span>Base URL</span><input class="control code" data-column="base_url" type="url" placeholder="Default" aria-label="Base URL" spellcheck="false" autocomplete="off" oninput="handleCellInput(this)"></label>
                    <div class="field test-field"><span>Upstream</span><button type="button" class="btn secondary test-btn" onclick="testRow('${rowId}')" disabled title="Model id and key first">Test</button></div>
                </div>
                <button type="button" class="icon-btn remove-btn" onclick="removeRow('${rowId}')" aria-label="Remove model" title="Remove">${REMOVE_ICON}</button>
            `;
            $('modelRows').appendChild(row);
            populateClientTypes('clientType-' + rowId);

            const serverId = rowCell(row, 'server_model_id');
            serverId.dataset.auto = 'true';
            if (cells) {
                const text = (column) => (typeof cells[column] === 'string' ? cells[column] : '');
                rowCell(row, 'model_id').value = text('model_id');
                setRowClientType(rowId, text('client_type'));
                rowCell(row, 'base_url').value = text('base_url');
                rowCell(row, 'api_key').value = text('api_key');
                serverId.value = text('server_model_id');
                serverId.dataset.auto = text('server_model_id') === text('model_id') ? 'true' : 'false';
            } else if (!restoring) {
                toggleRow(rowId, true);
                rowCell(row, 'model_id').focus();
            }
            saveDraft();
            return row;
        }

        function removeRow(rowId) {
            const row = document.querySelector('#modelRows [data-row-id="' + rowId + '"]');
            if (row) {
                row.remove();
            }
            saveDraft();
        }

        // one editor open at a time: opening a row closes the others
        function toggleRow(rowId, open) {
            const row = document.querySelector('#modelRows [data-row-id="' + rowId + '"]');
            if (!row) {
                return;
            }
            const next = open === undefined ? row.dataset.open !== 'true' : !!open;
            modelRows().forEach((item) => {
                const isOpen = item === row ? next : next ? false : item.dataset.open === 'true';
                item.dataset.open = isOpen ? 'true' : 'false';
                item.querySelector('.summary').setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                item.querySelector('.editor').classList.toggle('hidden', !isOpen);
            });
            closeComboboxes();
        }

        function handleSummaryKeydown(event, rowId) {
            if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
                event.preventDefault();
                toggleRow(rowId);
            }
        }

        function updateKeysNote() {
            $('keysNote').classList.toggle('hidden', $('apiKeyRows').children.length > 0);
        }

        function addKey(value) {
            const keyId = 'k' + nextKeyId++;
            const row = document.createElement('div');
            row.className = 'row key-row';
            row.setAttribute('role', 'listitem');
            row.dataset.keyId = keyId;
            row.innerHTML = `
                <span class="state" data-state="unsaved">Unsaved</span>
                <div class="key-wrap"><input class="control code key" data-key type="password" placeholder="$MMSP_SERVER_API_KEY" aria-label="Key" autocomplete="off" oninput="handleCellInput(this)">${EYE_BUTTON}</div>
                <button type="button" class="icon-btn remove-btn" onclick="removeKey('${keyId}')" aria-label="Remove key" title="Remove">${REMOVE_ICON}</button>
            `;
            $('apiKeyRows').appendChild(row);
            const input = row.querySelector('[data-key]');
            input.value = typeof value === 'string' ? value : '';
            updateKeysNote();
            if (!restoring) {
                input.focus();
            }
            saveDraft();
        }

        function removeKey(keyId) {
            const row = document.querySelector('#apiKeyRows [data-key-id="' + keyId + '"]');
            if (row) {
                row.remove();
            }
            updateKeysNote();
            saveDraft();
        }

        // only Served as follows the model id: an empty client type and base URL are the defaults
        function handleModelIdInput(input) {
            const row = input.closest('.row');
            const serverId = rowCell(row, 'server_model_id');
            if (serverId.dataset.auto !== 'false') {
                serverId.value = input.value;
            }
            clearRing(row);
            saveDraft();
        }

        function handleServerIdInput(input) {
            input.dataset.auto = input.value ? 'false' : 'true';
            clearRing(input.closest('.row'));
            saveDraft();
        }

        function handleCellInput(input) {
            clearRing(input.closest('.row'));
            saveDraft();
        }

        function handleRowClientType(rowId) {
            const row = document.querySelector('#modelRows [data-row-id="' + rowId + '"]');
            if (!row) {
                return;
            }
            clearRing(row);
            saveDraft();
        }

        function toggleKeyVisibility(button) {
            const input = button.parentElement.querySelector('input');
            const visible = button.dataset.visible !== 'true';
            const label = visible ? 'Hide key' : 'Show key';
            button.dataset.visible = visible ? 'true' : 'false';
            button.setAttribute('aria-label', label);
            button.setAttribute('title', label);
            button.querySelector('.eye-on').classList.toggle('hidden', !visible);
            button.querySelector('.eye-off').classList.toggle('hidden', visible);
            input.type = visible ? 'text' : 'password';
        }

        function rowCells(row) {
            return Object.fromEntries(COLUMNS.map((column) => [column, rowCell(row, column).value]));
        }

        // a row as it is saved: trimmed cells in COLUMNS order, an empty client type or base URL left out
        function normalizeRow(row) {
            const normalized = {};
            COLUMNS.forEach((column) => {
                const value = row && typeof row[column] === 'string' ? row[column].trim() : '';
                if (value || !OPTIONAL_COLUMNS.includes(column)) {
                    normalized[column] = value;
                }
            });
            return normalized;
        }

        // rows are told apart by content, not position: removing a row moves every index after it
        function rowKey(row) {
            return JSON.stringify(normalizeRow(row));
        }

        function configKey(config) {
            const value = config || {};
            return JSON.stringify({
                models: (Array.isArray(value.models) ? value.models : []).map(normalizeRow),
                api_keys: (Array.isArray(value.api_keys) ? value.api_keys : []).map((key) => (typeof key === 'string' ? key.trim() : '')),
                host: value.host,
                port: value.port
            });
        }

        // empty keys stay in, so the server can name them by index
        function collectConfig() {
            const port = $('portInput').value.trim();
            return {
                models: modelRows().map((row) => normalizeRow(rowCells(row))),
                api_keys: keyInputs().map((input) => input.value.trim()),
                host: $('hostInput').value.trim() || DEFAULT_HOST,
                port: port === '' ? DEFAULT_PORT : Number(port)
            };
        }

        function rowState(key, savedKeys, runningKeys) {
            if (runningKeys.has(key)) {
                return 'live';
            }
            return savedKeys.has(key) ? 'saved' : 'unsaved';
        }

        function setState(element, state) {
            element.dataset.state = state;
            element.textContent = STATE_LABELS[state];
        }

        function isDirty() {
            const savedConfig = saved && saved.config;
            return !savedConfig || configKey(collectConfig()) !== configKey(savedConfig);
        }

        function renderStates() {
            const savedConfig = saved && saved.config;
            const runningConfig = status.running ? status.config : null;
            const rowKeys = (config) => new Set(config && Array.isArray(config.models) ? config.models.map(rowKey) : []);
            const apiKeys = (config) => new Set(config && Array.isArray(config.api_keys) ? config.api_keys.map((key) => (typeof key === 'string' ? key.trim() : '')) : []);
            const listenKeys = (config) => new Set(config ? [JSON.stringify([config.host, config.port])] : []);
            const savedRows = rowKeys(savedConfig);
            const runningRows = rowKeys(runningConfig);
            modelRows().forEach((row) => setState(row.querySelector('.state'), rowState(rowKey(rowCells(row)), savedRows, runningRows)));
            const savedKeys = apiKeys(savedConfig);
            const runningKeys = apiKeys(runningConfig);
            keyInputs().forEach((input) => setState(input.closest('.row').querySelector('.state'), rowState(input.value.trim(), savedKeys, runningKeys)));
            const current = collectConfig();
            setState($('listenState'), rowState(JSON.stringify([current.host, current.port]), listenKeys(savedConfig), listenKeys(runningConfig)));
            const byId = new Map(metrics && Array.isArray(metrics.models) ? metrics.models.map((entry) => [entry.id, entry]) : []);
            modelRows().forEach((row) => renderRow(row, byId));
            renderActions();
            renderChecklist();
            renderModelCards(series);
            renderTestControls();
        }

        function upstreamText(cells) {
            return [cells.model_id, cells.client_type, cells.base_url && hostOf(cells.base_url)].filter((part) => part).join(' · ');
        }

        // the summary line of a row on Models: the served id, where it goes, its state, and its last error
        function renderRow(row, byId) {
            const cells = normalizeRow(rowCells(row));
            const served = row.querySelector('.served');
            served.textContent = cells.server_model_id || '–';
            served.dataset.empty = cells.server_model_id ? 'false' : 'true';
            served.title = cells.server_model_id;
            const upstream = row.querySelector('.upstream');
            upstream.textContent = upstreamText(cells);
            upstream.title = upstream.textContent;
            upstream.dataset.same = upstream.textContent === cells.model_id && cells.model_id === cells.server_model_id ? 'true' : 'false';
            row.querySelector('.summary').setAttribute('aria-label', cells.server_model_id ? 'Edit ' + cells.server_model_id : 'Edit');

            // a refusal shown under the row stays until the next action; otherwise the note is the last error
            const entry = metrics && cells.server_model_id ? byId.get(cells.server_model_id) : undefined;
            const note = row.querySelector('.row-note');
            if (!note.classList.contains('err')) {
                const message = entry && entry.last_error ? entry.last_error.message || '' : '';
                note.textContent = message;
                note.title = message;
                note.classList.toggle('hidden', !message);
            }
        }

        function isBlankRow(row) {
            const cells = normalizeRow(rowCells(row));
            return !cells.model_id && !cells.server_model_id && !cells.api_key;
        }

        // the steps done so far; Start is never done here, the card shows only while stopped
        function renderChecklist() {
            const complete = modelRows().some((row) => {
                const cells = normalizeRow(rowCells(row));
                return cells.model_id && cells.server_model_id && cells.api_key;
            });
            const steps = document.querySelectorAll('#checklist .step');
            [complete, !!(saved && saved.config) && !isDirty(), false].forEach((done, index) => {
                const mark = steps[index].querySelector('.step-mark');
                if (steps[index].dataset.done !== String(done) || !mark.firstChild) {
                    steps[index].dataset.done = done ? 'true' : 'false';
                    if (done) {
                        mark.innerHTML = CHECK_ICON;
                    } else {
                        mark.textContent = String(index + 1);
                    }
                }
            });
            $('checklistSave').disabled = !isDirty();
        }

        // one filled button at a time: Start while stopped, Apply while the saved table waits; Stop is a ring
        function renderActions() {
            const savable = !!(saved && saved.config);
            const pending = !!(status.running && savable && status.config && configKey(saved.config) !== configKey(status.config));
            const apply = $('applyButton');
            apply.classList.toggle('hidden', !(phase === 'applying' || (phase === 'running' && pending)));
            apply.disabled = phase === 'applying';
            $('applyLabel').textContent = phase === 'applying' ? 'Applying…' : 'Apply';
            $('saveButton').disabled = saving || phase === 'starting' || phase === 'applying' || !isDirty();
            const toggle = $('serverToggle');
            const live = phase === 'running' || phase === 'applying' || phase === 'stopping';
            toggle.classList.toggle('secondary', live);
            toggle.dataset.state = live ? 'running' : 'stopped';
            toggle.disabled = phase === 'starting' || phase === 'applying' || phase === 'stopping' || (phase === 'stopped' && !savable);
            $('serverToggleLabel').textContent = { stopped: 'Start', starting: 'Starting…', running: 'Stop', applying: 'Stop', stopping: 'Stopping…' }[phase];
            $('serverToggleStart').classList.toggle('hidden', live);
            $('serverToggleStop').classList.toggle('hidden', !live);
            if (phase === 'stopped' && !savable) {
                toggle.setAttribute('title', 'Save first');
            } else {
                toggle.removeAttribute('title');
            }
        }

        // the draft is kept only while it differs from the saved file, so a reload after Save reads the file
        function saveDraft() {
            if (restoring) {
                return;
            }
            const draft = {
                models: modelRows().map(rowCells),
                api_keys: keyInputs().map((input) => input.value),
                host: $('hostInput').value,
                port: $('portInput').value
            };
            try {
                if (isDirty()) {
                    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                } else {
                    localStorage.removeItem(DRAFT_KEY);
                }
            } catch (error) {
                // a browser that refuses storage keeps the table for this page only
            }
            renderStates();
        }

        function restoreTable() {
            let draft = null;
            try {
                draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
            } catch (error) {
                draft = null;
            }
            if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
                draft = null;
            }
            const source = draft || (saved && saved.config) || null;
            restoring = true;
            try {
                (source && Array.isArray(source.models) ? source.models : []).forEach((row) => addRow(row && typeof row === 'object' ? row : {}));
                (source && Array.isArray(source.api_keys) ? source.api_keys : []).forEach((key) => addKey(String(key)));
                if (source && typeof source.host === 'string') {
                    $('hostInput').value = source.host;
                }
                if (source && (typeof source.port === 'string' || typeof source.port === 'number')) {
                    $('portInput').value = String(source.port);
                }
                // an empty table opens its one empty row, so a first visit starts at the fields
                const rows = modelRows();
                if (!rows.length) {
                    toggleRow(addRow().dataset.rowId, true);
                } else if (rows.length === 1) {
                    const cells = normalizeRow(rowCells(rows[0]));
                    if (!cells.model_id && !cells.server_model_id && !cells.api_key) {
                        toggleRow(rows[0].dataset.rowId, true);
                    }
                }
            } finally {
                restoring = false;
            }
            renderStates();
        }

        async function sendJson(method, path, body) {
            const response = await fetch(API + path, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            let answer = {};
            try {
                answer = await response.json();
            } catch (error) {
                // a body that is not JSON leaves only the status to report
            }
            return { response, answer };
        }

        function postJson(path, body) {
            return sendJson('POST', path, body);
        }

        async function loadServerConfig() {
            try {
                const response = await fetch(API + '/config', { cache: 'no-store' });
                if (!response.ok) {
                    return;
                }
                const body = await response.json();
                saved = body;
                renderFile();
                if (body.error) {
                    showError(body.error);
                }
            } catch (error) {
                // the playground is out of reach: the page compares against what it last read
            }
        }

        async function saveServerConfig() {
            if (saving) {
                return;
            }
            saving = true;
            hideError();
            try {
                const { response, answer } = await sendJson('PUT', '/config', collectConfig());
                if (response.ok) {
                    saved = answer;
                    renderFile();
                    if (answer.config) {
                        $('hostInput').value = answer.config.host;
                        $('portInput').value = String(answer.config.port);
                    }
                    saveDraft();
                    flashSaved();
                } else {
                    const message = answer.error || ('HTTP ' + response.status);
                    showError(message, markRow(message, 'page'));
                }
            } catch (error) {
                showError(error.message);
            } finally {
                saving = false;
                renderStates();
            }
        }

        function flashSaved() {
            const button = $('saveButton');
            button.dataset.flash = 'true';
            $('saveLabel').textContent = 'Saved';
            button.querySelector('.save-icon').classList.add('hidden');
            button.querySelector('.saved-icon').classList.remove('hidden');
            clearTimeout(flashTimer);
            flashTimer = setTimeout(() => {
                delete button.dataset.flash;
                $('saveLabel').textContent = 'Save';
                button.querySelector('.save-icon').classList.remove('hidden');
                button.querySelector('.saved-icon').classList.add('hidden');
            }, 1500);
        }

        async function refreshStatus() {
            try {
                const response = await fetch(API + '/status', { cache: 'no-store' });
                if (response.ok) {
                    renderStatus(await response.json());
                }
            } catch (error) {
                // the playground is out of reach: the view keeps what it last knew
            }
        }

        async function refreshAll() {
            await loadServerConfig();
            await refreshStatus();
        }

        function setLoading(word) {
            $('statusText').textContent = word;
            $('statusText').classList.add('loading');
        }

        function renderStatus(next) {
            status = next && typeof next === 'object' ? next : { running: false };
            const running = !!status.running;
            phase = running ? 'running' : 'stopped';
            $('statusDot').dataset.state = running ? 'running' : 'stopped';
            $('statusText').textContent = running ? 'Running' : 'Stopped';
            $('statusText').classList.remove('loading');
            $('statusUrl').textContent = running ? status.base_url : '';
            $('statusUrlWrap').classList.toggle('hidden', !running);
            $('statusMeta').classList.toggle('hidden', !running);
            $('statusOpen').classList.toggle('hidden', !(running && status.open));
            // no dismiss: the banner mirrors a live fact, and goes with it
            const open = running && !!status.open;
            $('openBanner').classList.toggle('hidden', !open);
            $('openBannerUrl').textContent = open ? status.base_url : '';
            $('checklist').classList.toggle('hidden', running);
            if (running) {
                requestAnimationFrame(paintRange);
                startPolling();
            } else {
                // a stopped server's history is read once; the last drawing waits at half strength for it
                stopPolling();
                $('dashboard').dataset.stale = 'true';
                fetchMetrics();
            }
            renderStates();
        }

        function startPolling() {
            if (pollTimer === null) {
                pollTimer = setInterval(() => {
                    if (!document.hidden) {
                        fetchMetrics();
                    }
                }, METRICS_MS);
            }
            fetchMetrics();
        }

        function stopPolling() {
            clearInterval(pollTimer);
            pollTimer = null;
            metricsSeq += 1;
        }

        // the range as a query: the last N seconds, or from and to
        function rangeQuery() {
            return isCustom() ? '?from=' + range.from + '&to=' + range.to : '?window=' + range.seconds;
        }

        // a column per wantSlot pixels of the requests chart, 30 to 90; a hidden chart measures nothing
        function wantedColumns() {
            const plotW = chartGeometry($('requestsChart'), 1).plotW;
            return plotW > 0 ? Math.max(30, Math.min(90, Math.round(plotW / CHART.wantSlot))) : lastColumns;
        }

        async function fetchMetrics() {
            const seq = ++metricsSeq;
            lastColumns = wantedColumns();
            let body = null;
            let refusal = '';
            try {
                const response = await fetch(METRICS + rangeQuery() + '&columns=' + lastColumns, { cache: 'no-store' });
                if (response.ok) {
                    body = await response.json();
                } else if (response.status === 400) {
                    const answer = await response.json().catch(() => ({}));
                    refusal = answer.error || 'HTTP 400';
                }
            } catch (error) {
                // out of reach for a moment: the last numbers stay
                body = null;
            }
            if (seq !== metricsSeq) {
                return;
            }
            $('dashboard').dataset.stale = 'false';
            if (refusal) {
                showError(refusal);
                return;
            }
            if (!body) {
                return;
            }
            // started or stopped under the page (from another tab): read the status again
            if (!!status.running !== !!body.running) {
                refreshStatus();
                return;
            }
            metrics = body;
            series = body.window || null;
            const dashboard = $('dashboard');
            const appeared = dashboard.classList.contains('hidden') && !!series;
            dashboard.classList.toggle('hidden', !series);
            if (appeared) {
                paintRange();
            }
            if (!series) {
                resetOverview();
            }
            renderMetrics(metrics);
            renderStates();
            // the first answer came while the chart was hidden and could not measure: ask again at its width
            if (series && tab === 'overview' && wantedColumns() !== lastColumns) {
                fetchMetrics();
            }
        }

        // the header line (open, uptime, streaming) while the server runs, then the Overview
        function renderMetrics(m) {
            const live = !!(m && status.running);
            $('statusUptime').textContent = live ? 'up ' + formatUptime(m.uptime_s) : '';
            $('statusStreaming').textContent = live ? formatCount(m.in_flight) + ' streaming' : '';
            $('statusStreaming').classList.toggle('hidden', !(live && m.in_flight > 0));
            if (live) {
                $('statusOpen').classList.toggle('hidden', !status.open);
            }
            if (!m) {
                resetOverview();
                return;
            }
            renderOverview(series);
        }

        // nothing to show: no numbers stay behind for the next start to show first
        function resetOverview() {
            hideTip();
            document.querySelectorAll('#tiles .tile').forEach((tile) => {
                setTile(tile.id, '–', { text: '', good: null }, '', [], 'count');
            });
            $('requestsChart').replaceChildren();
            $('latencyChart').replaceChildren();
            $('errorList').replaceChildren();
        }

        function showTab(name, withRow) {
            tab = TABS.includes(name) ? name : 'overview';
            document.querySelectorAll('#tabs [role="tab"]').forEach((button) => {
                const selected = button.dataset.tab === tab;
                button.setAttribute('aria-selected', selected ? 'true' : 'false');
                button.tabIndex = selected ? 0 : -1;
            });
            TABS.forEach((item) => {
                $(PANELS[item]).hidden = item !== tab;
            });
            if (location.hash.slice(1) !== tab) {
                history.replaceState(null, '', '#' + tab);
            }
            closeComboboxes();
            closeRangePopover(false);
            hideTip();
            // the checklist's + Model: the blank row if there is one, else a new one, open and focused
            if (withRow) {
                const blank = modelRows().find(isBlankRow);
                if (blank) {
                    toggleRow(blank.dataset.rowId, true);
                    rowCell(blank, 'model_id').focus();
                } else {
                    addRow();
                }
            }
            // charts measure their width, so they draw once their tab is visible, at the columns it calls for
            if (tab === 'overview') {
                paintRange();
                if (series && wantedColumns() !== lastColumns) {
                    fetchMetrics();
                } else {
                    renderOverview(series);
                }
            }
        }

        function handleTabKeydown(event) {
            const index = TABS.indexOf(tab);
            const next = {
                ArrowRight: TABS[(index + 1) % TABS.length],
                ArrowLeft: TABS[(index + TABS.length - 1) % TABS.length],
                Home: TABS[0],
                End: TABS[TABS.length - 1]
            }[event.key];
            if (!next) {
                return;
            }
            event.preventDefault();
            showTab(next);
            document.querySelector('#tabs [data-tab="' + next + '"]').focus();
        }

        function isCustom() {
            return range.seconds === undefined;
        }

        function storeRange(value) {
            try {
                localStorage.setItem(RANGE_KEY, value);
            } catch (error) {
                // the choice holds for this page only
            }
        }

        function setRange(seconds) {
            if (!RANGES.some(([value]) => value === seconds)) {
                return;
            }
            range = { seconds };
            storeRange(String(seconds));
            closeRangePopover(false);
            refetchRange();
        }

        function setCustomRange(from, to) {
            range = { from, to };
            storeRange(from + '-' + to);
            refetchRange();
        }

        // the range scopes every number on Overview; the last drawing waits at half strength for the answer
        function refetchRange() {
            paintRange();
            if (series) {
                $('dashboard').dataset.stale = 'true';
            }
            fetchMetrics();
        }

        function paintRange() {
            const custom = isCustom();
            document.querySelectorAll('#rangeControl [data-range]').forEach((button) => {
                const checked = custom ? button.dataset.range === 'custom' : button.dataset.range === String(range.seconds);
                button.setAttribute('aria-checked', checked ? 'true' : 'false');
            });
            const label = $('rangeCustomLabel');
            label.textContent = custom ? formatRangeLabel(range.from, range.to) : '';
            label.classList.toggle('hidden', !custom);
            $('rangeWrap').dataset.custom = custom ? 'true' : 'false';
            updateSegmentThumb($('rangeControl'));
        }

        function rangePopoverOpen() {
            return !$('rangePopover').classList.contains('hidden');
        }

        function toggleRangePopover() {
            if (rangePopoverOpen()) {
                closeRangePopover(true);
            } else {
                openRangePopover();
            }
        }

        // From and To start at the custom range, else at the range on screen, To never past now
        function openRangePopover() {
            closeComboboxes();
            const now = Math.ceil(Date.now() / 60000) * 60;
            let from = now - (range.seconds || 3600);
            let to = now;
            if (isCustom()) {
                from = range.from;
                to = range.to;
            } else if (series) {
                from = series.start;
                to = Math.min(series.end, now);
            }
            $('rangeFrom').value = toInputValue(from);
            $('rangeTo').value = toInputValue(to);
            const since = metrics && metrics.since;
            $('rangeSince').textContent = since ? 'Since ' + formatStamp(since, { day: true }) : '';
            $('rangeSince').classList.toggle('hidden', !since);
            $('rangeError').textContent = '';
            $('rangeError').classList.add('hidden');
            $('rangePopover').classList.remove('hidden');
            $('rangeCustom').setAttribute('aria-expanded', 'true');
            $('rangeFrom').focus();
        }

        function closeRangePopover(restoreFocus) {
            const popover = $('rangePopover');
            if (popover.classList.contains('hidden')) {
                return;
            }
            const inside = popover.contains(document.activeElement);
            popover.classList.add('hidden');
            $('rangeCustom').setAttribute('aria-expanded', 'false');
            if (restoreFocus && inside) {
                $('rangeCustom').focus();
            }
        }

        // Escape closes, Enter in a time shows the range
        function handleRangeKeydown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeRangePopover(true);
            } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
                event.preventDefault();
                applyCustomRange();
            }
        }

        function applyCustomRange() {
            const from = fromInputValue($('rangeFrom').value);
            const to = fromInputValue($('rangeTo').value);
            let message = '';
            if (from === null || to === null || to <= from) {
                message = 'To must be after From.';
            } else if (to - from > MAX_RANGE_S) {
                message = 'At most 60 days.';
            }
            $('rangeError').textContent = message;
            $('rangeError').classList.toggle('hidden', !message);
            if (message) {
                return;
            }
            setCustomRange(from, to);
            closeRangePopover(true);
        }

        // a moment as a datetime-local value, local time to the minute
        function toInputValue(unix) {
            const d = new Date(unix * 1000);
            return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        }

        function fromInputValue(value) {
            const match = /^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})/.exec(value || '');
            if (!match) {
                return null;
            }
            const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
            return Number.isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
        }

        function renderOverview(w) {
            if (!w || tab !== 'overview') {
                return;
            }
            renderTiles(w);
            renderModelCards(w);
            renderRequestsChart(w);
            renderLatencyChart(w);
            renderErrors(w);
        }

        // the smallest k with ceil(n / k) at most maxBars; the last merged column may hold fewer
        function mergeFactor(n, maxBars) {
            return Math.max(1, Math.ceil(n / Math.max(maxBars, 1)));
        }

        // k buckets into one: counts add up, percentiles keep their peak, TPS comes from the merged sums
        function mergeBuckets(columns, k) {
            const merged = {};
            Object.keys(columns).forEach((key) => {
                const values = columns[key];
                const out = [];
                for (let i = 0; i < values.length; i += k) {
                    const part = values.slice(i, i + k).filter((value) => value != null);
                    if (!part.length) {
                        out.push(null);
                    } else if (SUMMED.includes(key)) {
                        out.push(part.reduce((sum, value) => sum + value, 0));
                    } else {
                        out.push(Math.max(...part));
                    }
                }
                merged[key] = out;
            });
            if (merged.tokens_out && merged.generation_ms) {
                merged.tps = merged.tokens_out.map((tokens, i) => (merged.generation_ms[i] ? Math.round((tokens * 10000) / merged.generation_ms[i]) / 10 : null));
            }
            return merged;
        }

        // the change against the previous window: an arrow and an amount, or nothing when there is no comparison
        function delta(kind, current, previous) {
            if (current == null || previous == null || current === previous || (kind === 'pct' && previous === 0)) {
                return { text: '', up: null };
            }
            const diff = current - previous;
            let amount;
            if (kind === 'pct') {
                const pct = Math.abs((diff / previous) * 100);
                amount = (pct < 10 ? pct.toFixed(1) : String(Math.round(pct))) + '%';
            } else if (kind === 'pt') {
                amount = Math.abs(diff * 100).toFixed(1) + ' pt';
            } else {
                amount = formatMs(Math.abs(diff));
            }
            if (/^0(\\.0)?( |%)/.test(amount)) {
                return { text: '', up: null };
            }
            return { text: (diff > 0 ? '↑ ' : '↓ ') + amount, up: diff > 0 };
        }

        function setTile(id, value, change, foot, values, mode, title) {
            const tile = $(id);
            const valueEl = tile.querySelector('.tile-value');
            valueEl.textContent = value;
            valueEl.dataset.empty = value === '–' ? 'true' : 'false';
            if (title) {
                valueEl.setAttribute('title', title);
            } else {
                valueEl.removeAttribute('title');
            }
            const deltaEl = tile.querySelector('.tile-delta');
            deltaEl.textContent = change.text;
            if (change.text && change.good !== null && change.good !== undefined) {
                deltaEl.dataset.good = change.good ? 'true' : 'false';
            } else {
                delete deltaEl.dataset.good;
            }
            if (change.text && change.title) {
                deltaEl.setAttribute('title', change.title);
            } else {
                deltaEl.removeAttribute('title');
            }
            const footEl = tile.querySelector('.tile-foot');
            footEl.textContent = foot;
            footEl.setAttribute('title', foot);
            sparkline(tile.querySelector('.spark'), values, { mode });
        }

        // a count per minute, hour or day of the part of the range the history covers, by the range's length
        function perUnit(n, elapsed, seconds) {
            const [unit, word] = seconds <= 21600 ? [60, '/min'] : seconds <= 259200 ? [3600, '/h'] : [DAY, '/d'];
            const value = n / (elapsed / unit);
            return (value >= 100 ? formatCount(Math.round(value)) : value.toFixed(1)) + word;
        }

        function renderTiles(w) {
            const t = w.total;
            const p = w.previous;
            const spark = mergeBuckets(t.series, mergeFactor((t.series.requests || []).length, 60));
            const vs = 'vs previous ' + rangeLabel(w.seconds);
            // a delta is neutral for volumes, good or bad for rates and latencies
            const judged = (kind, current, previous, upIsGood) => {
                const d = delta(kind, current, previous);
                return { text: d.text, good: upIsGood === null || d.up === null ? null : d.up === upIsGood, title: vs };
            };
            const latency = t.latency_ms || { first_event: {}, total: {} };
            const before = p && p.latency_ms ? p.latency_ms.total : {};
            // the rate over the part of the range the history covers, up to now (the last column is partial)
            const since = (metrics && metrics.since) || w.start;
            const elapsed = Math.max(Math.min(w.end, Date.now() / 1000) - Math.max(w.start, since), w.bucket_s);
            const rates = spark.successes.map((ok, i) => (ok == null || ok + spark.failures[i] === 0 ? null : ok / (ok + spark.failures[i])));
            setTile('tileRequests', formatCount(t.requests), judged('pct', t.requests, p && p.requests, null),
                perUnit(t.requests, elapsed, w.seconds) + (t.refused > 0 ? ' · ' + formatCount(t.refused) + ' refused' : ''), spark.requests, 'count');
            setTile('tileSuccess', formatRate(t.success_rate), judged('pt', t.success_rate, p && p.success_rate, true),
                formatCount(t.successes) + ' ok · ' + formatCount(t.failures) + ' failed · ' + formatCount(t.disconnects) + ' dropped', rates, 'level');
            setTile('tileLatencyP50', formatMs(latency.total.p50), judged('ms', latency.total.p50, before.p50, false),
                'first event p50 ' + formatMs(latency.first_event.p50), spark.p50, 'level');
            setTile('tileLatencyP90', formatMs(latency.total.p90), judged('ms', latency.total.p90, before.p90, false),
                'first event p90 ' + formatMs(latency.first_event.p90), spark.p90, 'level');
            setTile('tileTokens', formatCompact(t.tokens_out), judged('pct', t.tokens_out, p && p.tokens_out, null),
                formatCompact(t.thoughts) + ' thinking · ' + formatCompact(t.response) + ' response', spark.tokens_out, 'count', formatCount(t.tokens_out));
            setTile('tileTps', formatTps(t.tps), judged('pct', t.tps, p && p.tps, true),
                formatUptime((t.generation_ms || 0) / 1000) + ' generating', spark.tps, 'level');
        }

        // a trend in the quiet colour with the latest value in the accent; gaps where a bucket has no value,
        // a lone value drawn as a point so a sparse trend still shows
        function sparkline(svg, values, options) {
            const width = svg.clientWidth || svg.getBoundingClientRect().width;
            const height = svg.clientHeight || 28;
            const list = Array.isArray(values) ? values : [];
            const present = list.filter((value) => value != null);
            if (!width || list.length < 2 || !present.length) {
                svg.replaceChildren();
                return;
            }
            const pad = 3;
            let low = options.mode === 'count' ? 0 : Math.min(...present);
            let high = Math.max(...present);
            if (high === low) {
                if (options.mode === 'count') {
                    high = low + 1;
                } else {
                    low -= 1;
                    high += 1;
                }
            }
            const x = (i) => (pad + (i / (list.length - 1)) * (width - 2 * pad)).toFixed(1);
            const y = (value) => (height - pad - ((value - low) / (high - low)) * (height - 2 * pad)).toFixed(1);
            let d = '';
            let points = '';
            let last = -1;
            list.forEach((value, i) => {
                if (value == null) {
                    return;
                }
                const alone = (i === 0 || list[i - 1] == null) && (i === list.length - 1 || list[i + 1] == null);
                if (alone) {
                    points += '<circle class="pt" cx="' + x(i) + '" cy="' + y(value) + '" r="1.5"></circle>';
                }
                d += (i > 0 && list[i - 1] != null ? 'L' : 'M') + x(i) + ' ' + y(value);
                last = i;
            });
            svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
            svg.innerHTML = '<path d="' + d + '"></path>' + points + '<circle class="end" cx="' + x(last) + '" cy="' + y(list[last]) + '" r="2.5"></circle>';
        }

        // one card per model row, in page order, updated in place so focus survives the 3 s poll
        function renderModelCards(w) {
            const grid = $('modelCards');
            const rows = modelRows().filter((row) => !isBlankRow(row));
            const wanted = new Set(rows.map((row) => row.dataset.rowId));
            Array.from(grid.children).forEach((card) => {
                if (!wanted.has(card.dataset.rowId)) {
                    card.remove();
                }
            });
            const entries = new Map(w && Array.isArray(w.models) ? w.models.map((entry) => [entry.id, entry]) : []);
            const since = new Map(metrics && Array.isArray(metrics.models) ? metrics.models.map((entry) => [entry.id, entry]) : []);
            rows.forEach((row, index) => {
                const card = grid.querySelector('[data-row-id="' + row.dataset.rowId + '"]') || buildModelCard(row.dataset.rowId);
                if (grid.children[index] !== card) {
                    grid.insertBefore(card, grid.children[index] || null);
                }
                fillModelCard(card, row, w, entries, since);
            });
        }

        function buildModelCard(rowId) {
            const card = document.createElement('div');
            card.className = 'card model-card';
            card.setAttribute('role', 'button');
            card.tabIndex = 0;
            card.dataset.rowId = rowId;
            card.onclick = () => openModel(rowId);
            card.onkeydown = (event) => handleCardKeydown(event, rowId);
            card.innerHTML = '<div class="model-head"><span class="served mono"></span><span class="state" data-state="unsaved">Unsaved</span></div>'
                + '<span class="upstream mono"></span>'
                + '<div class="model-stats">'
                + ['Requests', 'Success', 'Last', 'p50', 'p90', 'TPS'].map((label) => '<div class="stat"><b class="mono' + (label === 'Last' ? ' words' : '') + '">–</b><span>' + label + '</span></div>').join('')
                + '</div><svg class="spark" aria-hidden="true"></svg><p class="model-note mono hidden"></p><p class="model-hint hidden"></p>';
            return card;
        }

        function fillModelCard(card, row, w, entries, since) {
            const cells = normalizeRow(rowCells(row));
            const state = row.querySelector('.state').dataset.state;
            const name = cells.server_model_id || cells.model_id;
            card.dataset.state = state;
            card.setAttribute('aria-label', 'Open ' + (name || '–') + ' in Models');
            const served = card.querySelector('.served');
            served.textContent = cells.server_model_id || '–';
            served.title = cells.server_model_id;
            setState(card.querySelector('.state'), state);
            const upstream = card.querySelector('.upstream');
            upstream.textContent = upstreamText(cells);
            upstream.title = upstream.textContent;

            const live = state === 'live';
            const hint = card.querySelector('.model-hint');
            hint.textContent = state === 'saved' ? (status.running ? 'Apply to serve' : 'Start to serve') : 'Save first';
            hint.classList.toggle('hidden', live);
            card.querySelector('.model-stats').classList.toggle('hidden', !live);
            const spark = card.querySelector('.spark');
            spark.classList.toggle('hidden', !live);
            const note = card.querySelector('.model-note');
            if (!live) {
                note.classList.add('hidden');
                return;
            }
            const entry = entries.get(cells.server_model_id);
            const latest = since.get(cells.server_model_id);
            const now = metrics ? metrics.started_at + metrics.uptime_s : 0;
            const latency = entry && entry.latency_ms ? entry.latency_ms.total : {};
            const last = latest && latest.last_outcome && latest.last_request_at != null
                ? OUTCOME_WORDS[latest.last_outcome] + ' ' + formatAgo(Math.max(0, now - latest.last_request_at))
                : '–';
            const values = [
                entry ? formatCount(entry.requests) : '–',
                entry ? formatRate(entry.success_rate) : '–',
                last,
                formatMs(latency.p50),
                formatMs(latency.p90),
                entry ? formatTps(entry.tps) : '–'
            ];
            card.querySelectorAll('.model-stats b').forEach((b, i) => {
                b.textContent = values[i];
                b.dataset.empty = values[i] === '–' ? 'true' : 'false';
                b.title = values[i];
            });
            if (entry && entry.series && w) {
                const requests = entry.series.requests || [];
                sparkline(spark, mergeBuckets({ requests }, mergeFactor(requests.length, 30)).requests, { mode: 'count' });
            } else {
                spark.replaceChildren();
            }
            const message = latest && latest.last_error ? latest.last_error.message || '' : '';
            note.textContent = message;
            note.title = message;
            note.classList.toggle('hidden', !message);
        }

        function openModel(rowId) {
            showTab('models');
            toggleRow(rowId, true);
            const row = document.querySelector('#modelRows [data-row-id="' + rowId + '"]');
            if (row) {
                row.scrollIntoView({ block: 'nearest' });
                row.querySelector('.summary').focus({ preventScroll: true });
            }
        }

        function handleCardKeydown(event, rowId) {
            if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
                event.preventDefault();
                openModel(rowId);
            }
        }

        // the drawing area of a chart container: its box minus padding, the plot inside the gutters
        function chartGeometry(container, columns) {
            const style = getComputedStyle(container);
            const width = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            const height = container.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
            const plotW = width - CHART.left - CHART.right;
            const plotH = height - CHART.top - CHART.bottom;
            return { width, height, plotW, plotH, base: CHART.top + plotH, slot: plotW / Math.max(columns, 1), left: CHART.left, top: CHART.top, padRight: parseFloat(style.paddingRight) };
        }

        // 1, 2, 2.5, 5 or 10 times a power of ten, the first at least v (2.5 only from 25 up, so ticks stay whole)
        function niceMax(v) {
            if (!(v > 0)) {
                return 1;
            }
            const scale = Math.pow(10, Math.floor(Math.log10(v)));
            for (const step of [1, 2, 2.5, 5, 10]) {
                if (step === 2.5 && step * scale < 10) {
                    continue;
                }
                if (step * scale >= v) {
                    return step * scale;
                }
            }
            return 10 * scale;
        }

        // ticks at round local minutes, hours, days or Mondays: the first step giving at most `limit` labels, about
        // one per 72px; past a week, every other Monday or fewer
        function timeTicks(from, to, plotW) {
            const limit = Math.max(2, Math.min(8, Math.floor(plotW / 72)));
            const offset = -new Date(from * 1000).getTimezoneOffset() * 60;
            const at = (step) => {
                // unix 0 was a Thursday, so local Mondays lie 4 days past the multiples of a week
                const phase = step === 604800 ? 345600 : 0;
                const ticks = [];
                for (let t = Math.ceil((from + offset - phase) / step) * step + phase - offset; t <= to; t += step) {
                    ticks.push(t);
                }
                return ticks;
            };
            for (const step of TICK_STEPS) {
                const ticks = at(step);
                if (ticks.length <= limit) {
                    return { step, ticks };
                }
            }
            const step = TICK_STEPS[TICK_STEPS.length - 1];
            const ticks = at(step);
            const every = Math.ceil(ticks.length / limit);
            return { step, ticks: ticks.filter((t, i) => i % every === 0) };
        }

        // HH:MM within a day, the day on day steps and at the midnights of a range of a day or more
        function formatTick(t, step, rangeSeconds) {
            const d = new Date(t * 1000);
            if (step >= DAY || (rangeSeconds >= DAY && d.getHours() === 0 && d.getMinutes() === 0)) {
                return formatDay(t);
            }
            return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        }

        // the frame every chart shares: three hairlines (0, half, top), their labels, the time labels; a time label
        // that would reach under the y labels or past the card's padding is set flush with its tick instead
        function chartFrame(g, max, label, w, whole) {
            const levels = [0, max / 2, max].filter((v) => !whole || Number.isInteger(v));
            let grid = '';
            let axis = '';
            levels.forEach((v) => {
                const y = (g.base - (v / max) * g.plotH).toFixed(1);
                grid += '<line x1="' + g.left + '" x2="' + (g.left + g.plotW).toFixed(1) + '" y1="' + y + '" y2="' + y + '"></line>';
                axis += '<text x="' + (g.left - 8) + '" y="' + y + '" dy="0.35em" text-anchor="end">' + label(v) + '</text>';
            });
            const rangeSeconds = w.end - w.start;
            const { step, ticks } = timeTicks(w.start, w.end, g.plotW);
            ticks.forEach((t) => {
                const x = g.left + ((t - w.start) / rangeSeconds) * g.plotW;
                const text = formatTick(t, step, rangeSeconds);
                // 11px mono is 6.6px a character
                const half = text.length * 3.3 + 2;
                let anchor = 'middle';
                if (x - half < g.left - 10) {
                    anchor = 'start';
                } else if (x + half > g.width + g.padRight - 2) {
                    anchor = 'end';
                }
                axis += '<text class="tick" x="' + x.toFixed(1) + '" y="' + (g.base + 15) + '" text-anchor="' + anchor + '">' + text + '</text>';
            });
            return '<g class="grid">' + grid + '</g><g class="axis">' + axis + '</g>';
        }

        // a column segment; the top one of a stack gets a rounded end, 4px, less on a narrow column so it stays a column
        function segment(cls, x, y, width, height, rounded) {
            const r = rounded ? Math.min(4, width / 3, height) : 0;
            const f = (v) => v.toFixed(1);
            if (!r) {
                return '<rect class="bar ' + cls + '" x="' + f(x) + '" y="' + f(y) + '" width="' + f(width) + '" height="' + f(height) + '"></rect>';
            }
            return '<path class="bar ' + cls + '" d="M' + f(x) + ' ' + f(y + height) + 'V' + f(y + r) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(x + r) + ' ' + f(y)
                + 'H' + f(x + width - r) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(x + width) + ' ' + f(y + r) + 'V' + f(y + height) + 'Z"></path>';
        }

        function hits(g, columns) {
            return columns.map((column, i) => '<rect class="hit" x="' + (g.left + i * g.slot).toFixed(1) + '" y="' + g.top + '" width="' + g.slot.toFixed(1) + '" height="' + g.plotH.toFixed(1) + '"></rect>').join('');
        }

        // a new drawing in place of the old; a keyboard user's focus stays on the chart
        function paintChart(container, html) {
            const focused = container.contains(document.activeElement);
            container._swapping = true;
            container.innerHTML = html;
            if (focused) {
                container.querySelector('svg').focus({ preventScroll: true });
            }
            container._swapping = false;
        }

        // the chart as a table for a screen reader; a table ignores a 1px height, so a clipped box holds it
        function tableTwin(caption, heads, rows) {
            return '<div class="sr-only"><table><caption>' + caption + '</caption><thead><tr>' + heads.map((head) => '<th>' + head + '</th>').join('') + '</tr></thead><tbody>'
                + rows.map((cells) => '<tr>' + cells.map((cell) => '<td>' + cell + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
        }

        // outcomes over time: ok, failed and dropped stacked from the baseline, one column per server column; past
        // 60 columns narrower than minSlot (a long custom range on a phone) neighbours merge
        function renderRequestsChart(w) {
            const container = $('requestsChart');
            const t = w.total.series || {};
            const n = (t.requests || []).length;
            const probe = chartGeometry(container, n);
            if (!(probe.plotW > 0) || !n) {
                return;
            }
            const maxBars = Math.max(60, Math.floor(probe.plotW / CHART.minSlot));
            const k = n > maxBars ? mergeFactor(n, maxBars) : 1;
            const merged = mergeBuckets({ requests: t.requests, successes: t.successes, failures: t.failures, disconnects: t.disconnects }, k);
            const span = k * w.bucket_s;
            const rangeSeconds = w.end - w.start;
            const columns = merged.requests.map((requests, i) => ({
                start: w.start + i * span,
                end: Math.min(w.start + (i + 1) * span, w.end),
                requests: requests || 0,
                successes: merged.successes[i] || 0,
                failures: merged.failures[i] || 0,
                disconnects: merged.disconnects[i] || 0
            }));
            const g = chartGeometry(container, columns.length);
            const max = niceMax(Math.max(0, ...columns.map((c) => c.successes + c.failures + c.disconnects)));
            const barW = Math.min(CHART.maxBar, g.slot - CHART.gap);
            let marks = '';
            columns.forEach((c, i) => {
                const parts = [['ok', c.successes], ['fail', c.failures], ['drop', c.disconnects]].filter((part) => part[1] > 0);
                const x = g.left + i * g.slot + (g.slot - barW) / 2;
                let cursor = g.base;
                parts.forEach(([cls, value], j) => {
                    const gap = j > 0 ? CHART.gap : 0;
                    // a single request stays visible however tall the scale
                    const height = Math.max((value / max) * g.plotH, 2 + gap);
                    marks += segment(cls, x, cursor - height, barW, height - gap, j === parts.length - 1);
                    cursor -= height;
                });
            });
            const total = w.total;
            const label = 'Requests per ' + formatSpan(span) + ' ' + rangeText(w) + ': ' + total.requests + ' requests, '
                + total.successes + ' ok, ' + total.failures + ' failed, ' + total.disconnects + ' dropped';
            const stamp = { seconds: span < 60, day: rangeSeconds >= DAY };
            paintChart(container, '<svg role="img" tabindex="0" aria-label="' + label + '" viewBox="0 0 ' + g.width + ' ' + g.height + '">'
                + chartFrame(g, max, formatCompact, w, true) + marks + '<g>' + hits(g, columns) + '</g></svg>'
                + tableTwin('Requests', ['Time', 'ok', 'failed', 'dropped', 'streaming'], columns.filter((c) => c.requests).map((c) => [formatStamp(c.start, stamp), c.successes, c.failures, c.disconnects, streamingOf(c)])));
            attachTooltip(container, columns, (c) => formatRequestsTip(c, span, rangeSeconds), g);
        }

        function streamingOf(c) {
            return Math.max(0, c.requests - c.successes - c.failures - c.disconnects);
        }

        // p90, the headline, in the accent over p50 in the muted ink; one point per server column, a gap where none
        function renderLatencyChart(w) {
            const container = $('latencyChart');
            const t = w.total.series || {};
            const n = (t.requests || []).length;
            const g = chartGeometry(container, n);
            if (!(g.plotW > 0) || !n) {
                return;
            }
            const rangeSeconds = w.end - w.start;
            const columns = t.requests.map((requests, i) => ({
                start: w.start + i * w.bucket_s,
                end: w.start + (i + 1) * w.bucket_s,
                p50: t.p50 ? t.p50[i] : null,
                p90: t.p90 ? t.p90[i] : null,
                successes: t.successes ? t.successes[i] || 0 : 0
            }));
            const peak = Math.max(0, ...columns.map((c) => c.p90 || 0), ...columns.map((c) => c.p50 || 0));
            const max = peak ? niceMax(peak) : 1000;
            const line = (key) => {
                let d = '';
                let dots = '';
                columns.forEach((c, i) => {
                    if (c[key] == null) {
                        return;
                    }
                    const x = (g.left + (i + 0.5) * g.slot).toFixed(1);
                    const y = (g.base - (c[key] / max) * g.plotH).toFixed(1);
                    const joined = i > 0 && columns[i - 1][key] != null;
                    if (!joined && (i === columns.length - 1 || columns[i + 1][key] == null)) {
                        dots += '<circle class="dot ' + key + '" cx="' + x + '" cy="' + y + '" r="3"></circle>';
                    }
                    d += (joined ? 'L' : 'M') + x + ' ' + y;
                });
                return (d ? '<path class="line ' + key + '" d="' + d + '"></path>' : '') + dots;
            };
            const summary = w.total.latency_ms ? w.total.latency_ms.total : {};
            const label = 'Latency ' + rangeText(w) + ': p50 ' + formatMs(summary.p50) + ', p90 ' + formatMs(summary.p90);
            const stamp = { seconds: w.bucket_s < 60, day: rangeSeconds >= DAY };
            paintChart(container, '<svg role="img" tabindex="0" aria-label="' + label + '" viewBox="0 0 ' + g.width + ' ' + g.height + '">'
                + chartFrame(g, max, formatAxisMs, w, false) + line('p50') + line('p90') + '<g>' + hits(g, columns) + '</g></svg>'
                + tableTwin('Latency', ['Time', 'p50', 'p90', 'ok'], columns.filter((c) => c.p50 != null || c.successes).map((c) => [formatStamp(c.start, stamp), formatMs(c.p50), formatMs(c.p90), c.successes])));
            attachTooltip(container, columns, (c) => formatLatencyTip(c, w.bucket_s, rangeSeconds), g);
        }

        // the chart's columns for its tooltip; the listeners are wired once per container and read them
        function attachTooltip(container, columns, format, g) {
            container._chart = { columns, format, g };
            if (!container._wired) {
                container._wired = true;
                container.addEventListener('pointermove', (event) => {
                    const chart = container._chart;
                    const svg = container.querySelector('svg');
                    if (!chart || !svg) {
                        return;
                    }
                    const x = event.clientX - svg.getBoundingClientRect().left;
                    const index = Math.floor((x - chart.g.left) / chart.g.slot);
                    if (x < chart.g.left || index < 0 || index >= chart.columns.length) {
                        hideTip();
                        return;
                    }
                    showTip(container, index, event.clientX, event.clientY);
                });
                container.addEventListener('pointerleave', hideTip);
                container.addEventListener('focusin', () => {
                    if (!container._swapping) {
                        showTip(container, lastIndex(container._chart));
                    }
                });
                container.addEventListener('focusout', () => {
                    if (!container._swapping) {
                        hideTip();
                    }
                });
                container.addEventListener('keydown', (event) => {
                    const chart = container._chart;
                    if (!chart) {
                        return;
                    }
                    const current = tip && tip.chart === container.id ? tip.index : chart.columns.length;
                    let index = null;
                    if (event.key === 'ArrowLeft') {
                        index = stepIndex(chart, current, -1);
                    } else if (event.key === 'ArrowRight') {
                        index = stepIndex(chart, current, 1);
                    } else if (event.key === 'Home') {
                        index = stepIndex(chart, -1, 1);
                    } else if (event.key === 'End') {
                        index = lastIndex(chart);
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        hideTip();
                        return;
                    }
                    if (index !== null) {
                        event.preventDefault();
                        showTip(container, index);
                    }
                });
            }
            // a tooltip open on this chart follows the new numbers in place
            if (tip && tip.chart === container.id) {
                showTip(container, Math.min(tip.index, columns.length - 1), tip.x, tip.y);
            }
        }

        function lastIndex(chart) {
            return chart && chart.columns.length ? chart.columns.length - 1 : null;
        }

        // the next column in a direction; at either end the tooltip stays where it is
        function stepIndex(chart, from, direction) {
            const next = from + direction;
            if (next >= 0 && next < chart.columns.length) {
                return next;
            }
            return from >= 0 && from < chart.columns.length ? from : null;
        }

        // the crosshair at the column, the readout beside the pointer (or above the column from the keyboard)
        function showTip(container, index, clientX, clientY) {
            const chart = container._chart;
            const svg = container.querySelector('svg');
            if (!chart || !svg || index === null || index < 0 || !chart.columns[index]) {
                hideTip();
                return;
            }
            const g = chart.g;
            const x = g.left + (index + 0.5) * g.slot;
            let cross = svg.querySelector('.cross');
            if (!cross) {
                cross = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                cross.setAttribute('class', 'cross');
                svg.insertBefore(cross, svg.lastChild);
            }
            cross.setAttribute('x1', x.toFixed(1));
            cross.setAttribute('x2', x.toFixed(1));
            cross.setAttribute('y1', g.top);
            cross.setAttribute('y2', g.base.toFixed(1));

            const readout = chart.format(chart.columns[index]);
            const el = $('chartTip');
            const when = document.createElement('div');
            when.className = 'when';
            when.textContent = readout.when;
            const rows = readout.rows.map(([value, label, key]) => {
                const row = document.createElement('div');
                row.className = 'r';
                const mark = document.createElement('i');
                mark.className = key;
                const b = document.createElement('b');
                b.textContent = value;
                const span = document.createElement('span');
                span.textContent = label;
                row.append(mark, b, span);
                return row;
            });
            el.replaceChildren(when, ...rows);
            el.classList.remove('hidden');
            const box = svg.getBoundingClientRect();
            const atX = clientX === undefined ? box.left + x : clientX;
            const atY = clientY === undefined ? box.top + g.top + 24 : clientY;
            tip = { chart: container.id, index, x: clientX, y: clientY };
            const width = el.offsetWidth;
            const height = el.offsetHeight;
            let left = atX + 12;
            if (left + width > window.innerWidth - 8) {
                left = Math.max(8, atX - 12 - width);
            }
            const top = Math.min(Math.max(8, atY - height / 2), window.innerHeight - height - 8);
            el.style.left = left + 'px';
            el.style.top = top + 'px';
        }

        // a scroll moves a keyboard tooltip with its chart; a pointer's goes, the pointer is elsewhere now
        function handleScroll() {
            if (tip && tip.x === undefined) {
                showTip($(tip.chart), tip.index);
            } else if (tip) {
                hideTip();
            }
        }

        function hideTip() {
            tip = null;
            const el = $('chartTip');
            if (el) {
                el.classList.add('hidden');
            }
            document.querySelectorAll('.chart .cross').forEach((cross) => cross.remove());
        }

        function formatRequestsTip(c, span, rangeSeconds) {
            const rows = [[formatCount(c.successes), 'ok', 'ok'], [formatCount(c.failures), 'failed', 'fail'], [formatCount(c.disconnects), 'dropped', 'drop']];
            if (streamingOf(c) > 0) {
                rows.push([formatCount(streamingOf(c)), 'streaming', '']);
            }
            return { when: formatWhen(c.start, c.end, span, rangeSeconds), rows };
        }

        function formatLatencyTip(c, span, rangeSeconds) {
            return { when: formatWhen(c.start, c.end, span, rangeSeconds), rows: [[formatMs(c.p90), 'p90', 'p90'], [formatMs(c.p50), 'p50', 'p50'], [formatCount(c.successes), 'ok', '']] };
        }

        // the range's failures, newest first, from the latest hundred the server keeps
        function renderErrors(w) {
            const list = $('errorList');
            const days = w.end - w.start >= DAY;
            list.dataset.days = days ? 'true' : 'false';
            const errors = (metrics && Array.isArray(metrics.errors) ? metrics.errors : []).filter((error) => error.at >= w.start && error.at < w.end);
            if (!errors.length) {
                const none = document.createElement('li');
                none.className = 'none';
                none.textContent = isCustom() ? 'None in this range' : 'None in the last ' + rangeLabel(w.seconds);
                list.replaceChildren(none);
                return;
            }
            list.replaceChildren(...errors.map((error) => {
                const item = document.createElement('li');
                const time = document.createElement('span');
                time.className = 'mono time';
                time.textContent = formatStamp(error.at, { seconds: true, day: days });
                const model = document.createElement('span');
                model.className = 'mono model';
                model.textContent = error.model || '';
                model.title = error.model || '';
                const message = document.createElement('span');
                message.className = 'message';
                message.textContent = error.message || '–';
                message.title = error.message || '';
                item.append(time, model, message);
                return item;
            }));
        }

        function handleResize() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                paintRange();
                if (series && tab === 'overview' && wantedColumns() !== lastColumns) {
                    fetchMetrics();
                } else {
                    renderOverview(series);
                }
                renderModelCards(series);
            }, 150);
        }

        function toggleServer() {
            return status.running ? stopServer() : openStartDialog('start');
        }

        // mirrors server_base_url: an IPv6 host goes in brackets
        function baseUrlOf(host, port) {
            return 'http://' + (host.includes(':') ? '[' + host + ']' : host) + ':' + port + '/v1';
        }

        // Start and Apply say first what the saved file serves, where, and with which keys; Stop exposes nothing
        function openStartDialog(action) {
            const dialog = $('startDialog');
            if (!saved || !saved.config || dialog.open) {
                return;
            }
            dialogAction = action;
            const c = saved.config;
            const models = Array.isArray(c.models) ? c.models.length : 0;
            const keys = Array.isArray(c.api_keys) ? c.api_keys.length : 0;
            $('startDialogTitle').textContent = action === 'apply' ? 'Apply the saved file?' : 'Start the server?';
            $('startDialogConfirm').textContent = action === 'apply' ? 'Apply' : 'Start';
            $('startDialogUrl').textContent = c.port === 0 ? c.host + ', a port the system picks' : baseUrlOf(c.host, c.port);
            $('startDialogModels').textContent = models === 1 ? '1 model' : models + ' models';
            $('startDialogKeys').textContent = keys === 0 ? 'None' : keys === 1 ? '1 key' : keys + ' keys';
            $('startDialogWarning').classList.toggle('hidden', keys !== 0);
            $('startDialogNote').classList.toggle('hidden', action !== 'apply');
            closeComboboxes();
            closeRangePopover(false);
            hideTip();
            dialog.showModal();
            $('startDialogConfirm').focus();
        }

        function closeStartDialog() {
            const dialog = $('startDialog');
            if (dialog.open) {
                dialog.close();
            }
        }

        function confirmStartDialog() {
            const action = dialogAction;
            closeStartDialog();
            if (action === 'apply') {
                restartServer();
            } else {
                startServer();
            }
        }

        // Enter anywhere in the dialog confirms; a focused button acts on Enter by itself, so it is left alone and
        // nothing starts twice. Escape is the dialog's own cancel.
        function handleDialogKeydown(event) {
            if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement) && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
                event.preventDefault();
                confirmStartDialog();
            }
        }

        function handleDialogClose() {
            const apply = $('applyButton');
            if (dialogAction === 'apply' && !apply.classList.contains('hidden')) {
                apply.focus();
            } else {
                $('serverToggle').focus();
            }
        }

        function addKeyFromBanner() {
            showTab('settings');
            const blank = keyInputs().find((input) => !input.value.trim());
            if (blank) {
                blank.focus();
            } else {
                addKey();
            }
        }

        // Start and Apply run the saved file, so the body is empty and unsaved edits stay unsaved
        async function startServer() {
            if (phase === 'starting' || phase === 'applying') {
                return;
            }
            hideError();
            phase = 'starting';
            renderActions();
            setLoading('Starting…');
            try {
                const { response, answer } = await postJson('/start', {});
                if (response.ok) {
                    renderStatus(answer);
                } else {
                    const message = answer.error || ('HTTP ' + response.status);
                    showError(message, markRow(message, 'saved'));
                    // started from another tab: the button becomes Stop
                    if (response.status === 409) {
                        refreshAll();
                    }
                }
            } catch (error) {
                showError(error.message);
            } finally {
                if (phase === 'starting') {
                    renderStatus(status);
                }
            }
        }

        // a refused table leaves the old server running; a failed bind leaves none, so the status is read again
        async function restartServer() {
            if (phase === 'starting' || phase === 'applying') {
                return;
            }
            hideError();
            phase = 'applying';
            renderActions();
            setLoading('Applying…');
            try {
                const { response, answer } = await postJson('/restart', {});
                if (response.ok) {
                    renderStatus(answer);
                } else {
                    const message = answer.error || ('HTTP ' + response.status);
                    showError(message, markRow(message, 'saved'));
                    await refreshStatus();
                }
            } catch (error) {
                showError(error.message);
            } finally {
                if (phase === 'applying') {
                    renderStatus(status);
                }
            }
        }

        async function stopServer() {
            hideError();
            phase = 'stopping';
            renderActions();
            setLoading('Stopping…');
            try {
                const { response, answer } = await postJson('/stop', {});
                if (response.ok) {
                    renderStatus({ running: false });
                } else {
                    showError(answer.error || ('HTTP ' + response.status));
                }
            } catch (error) {
                showError(error.message);
            } finally {
                if (phase === 'stopping') {
                    renderStatus(status);
                }
            }
        }

        function hideError() {
            const error = $('serverError');
            error.textContent = '';
            error.classList.add('hidden');
            document.querySelectorAll('.invalid').forEach((item) => item.classList.remove('invalid'));
            document.querySelectorAll('.row-note.err').forEach((note) => {
                note.classList.remove('err');
                note.textContent = '';
                note.classList.add('hidden');
            });
            renderStates();
        }

        // a refusal that names a model row is shown under that row, on Models; anything else under the header
        function showError(message, target) {
            if (target && target.dataset && target.dataset.rowId) {
                showTab('models');
                const note = target.querySelector('.row-note');
                note.textContent = message;
                note.removeAttribute('title');
                note.classList.add('err');
                note.classList.remove('hidden');
                target.scrollIntoView({ block: 'nearest' });
                return;
            }
            const error = $('serverError');
            error.textContent = message;
            error.classList.remove('hidden');
        }

        // every cell handler comes here, so an edited row also drops a test result that no longer describes it
        function clearRing(row) {
            row.classList.remove('invalid');
            row.querySelectorAll('.invalid').forEach((item) => item.classList.remove('invalid'));
            clearTest(row);
        }

        function testableRow(row) {
            const c = normalizeRow(rowCells(row));
            return !!(c.model_id && c.api_key);
        }

        function renderTestControls() {
            modelRows().forEach((row) => {
                const button = row.querySelector('.test-btn');
                const testable = testableRow(row);
                const testing = row.dataset.testing === 'true';
                button.disabled = !testable || testing;
                if (testable) {
                    button.removeAttribute('title');
                } else {
                    button.setAttribute('title', TEST_TITLE);
                }
                button.textContent = testing ? TEST_LABELS.testing : 'Test';
            });
            const all = $('testAllButton');
            const any = modelRows().some(testableRow);
            all.disabled = testingAll || !any;
            if (any) {
                all.removeAttribute('title');
            } else {
                all.setAttribute('title', TEST_TITLE);
            }
            all.querySelector('span').textContent = testingAll ? TEST_LABELS.testing : 'Test all';
        }

        function setTestResult(row, state, text) {
            const line = row.querySelector('.row-test');
            line.classList.remove('hidden');
            line.dataset.state = state;
            const word = line.querySelector('.test-state');
            word.dataset.state = state;
            word.textContent = TEST_LABELS[state];
            word.classList.toggle('loading', state === 'testing');
            const detail = line.querySelector('.test-text');
            detail.textContent = text;
            detail.title = text;
        }

        // a key row has no result to clear
        function clearTest(row) {
            const line = row.querySelector('.row-test');
            if (line) {
                line.classList.add('hidden');
            }
            delete row.dataset.testKey;
        }

        function formatTestResult(result) {
            const first = result.first_token_ms == null ? 'no tokens' : 'first token ' + formatMs(result.first_token_ms);
            const tokens = result.tokens_out == null
                ? 'no usage reported'
                : formatCount(result.tokens_out) + ' tokens out' + (result.tps == null ? '' : ' · ' + formatTps(result.tps) + ' TPS');
            return first + ' · total ' + formatMs(result.total_ms) + ' · ' + tokens;
        }

        // the row as it is edited now, not as saved; a result is not kept, it describes a moment, not the table
        async function runTest(row) {
            const cells = normalizeRow(rowCells(row));
            const key = rowKey(cells);
            row.dataset.testing = 'true';
            row.dataset.testKey = key;
            setTestResult(row, 'testing', '');
            renderTestControls();
            let state = 'error';
            let text = '';
            try {
                const { response, answer } = await postJson('/test', { model: cells });
                if (response.ok && answer.ok) {
                    state = 'ok';
                    text = formatTestResult(answer);
                } else {
                    text = answer.error || ('HTTP ' + response.status);
                }
            } catch (error) {
                text = error.message;
            } finally {
                delete row.dataset.testing;
                renderTestControls();
            }
            // an edit while the test ran disowns its answer
            if (row.isConnected && row.dataset.testKey === key) {
                setTestResult(row, state, text);
            }
        }

        function testRow(rowId) {
            const row = document.querySelector('#modelRows [data-row-id="' + rowId + '"]');
            if (row && testableRow(row) && row.dataset.testing !== 'true') {
                runTest(row);
            }
        }

        async function testAll() {
            if (testingAll) {
                return;
            }
            testingAll = true;
            renderTestControls();
            const queue = modelRows().filter((row) => testableRow(row) && row.dataset.testing !== 'true');
            const worker = async () => {
                while (queue.length) {
                    const row = queue.shift();
                    if (row.isConnected && testableRow(row) && row.dataset.testing !== 'true') {
                        await runTest(row);
                    }
                }
            };
            try {
                await Promise.all(Array.from({ length: TEST_CONCURRENCY }, worker));
            } finally {
                testingAll = false;
                renderTestControls();
            }
        }

        // the server names a row by its index, and mostly the cell too: that cell is ringed and its editor opened,
        // on the tab that holds it. A save names the index of the page's table; a start or apply the index of the
        // saved file, which the page finds again by content, as the table may have changed since. Returns the row
        // or key it found.
        function markRow(message, source) {
            const config = source === 'saved' && saved && saved.config ? saved.config : null;
            const key = /^api_keys\\[(\\d+)\\]/.exec(message);
            if (key) {
                const index = Number(key[1]);
                let input = null;
                if (source === 'saved') {
                    const wanted = config && Array.isArray(config.api_keys) ? config.api_keys[index] : undefined;
                    input = typeof wanted === 'string' ? keyInputs().find((item) => item.value.trim() === wanted.trim()) : null;
                } else {
                    input = keyInputs()[index] || null;
                }
                if (input) {
                    showTab('settings');
                    input.classList.add('invalid');
                }
                return input;
            }
            const model = /^models\\[(\\d+)\\](?:(?:: |\\.)(model_id|base_url|api_key|server_model_id|client_type)\\b)?/.exec(message);
            if (!model) {
                return null;
            }
            const index = Number(model[1]);
            let row = null;
            if (source === 'saved') {
                const wanted = config && Array.isArray(config.models) ? config.models[index] : undefined;
                row = wanted && typeof wanted === 'object' ? modelRows().find((item) => rowKey(rowCells(item)) === rowKey(wanted)) || null : null;
            } else {
                row = modelRows()[index] || null;
            }
            if (!row) {
                return null;
            }
            // the client's own refusal of a type names no cell, but it can only mean that one
            const column = model[2] || (/Unknown client type/.test(message) ? 'client_type' : null);
            if (column) {
                showTab('models');
                const cell = column === 'client_type' ? row.querySelector('[data-combobox-button]') : rowCell(row, column);
                cell.classList.add('invalid');
                toggleRow(row.dataset.rowId, true);
            }
            return row;
        }

        // Ctrl/Cmd+S saves from anywhere, inputs included; Escape closes the editor the focus is in
        function handleShortcut(event) {
            const key = (event.key || '').toLowerCase();
            // inert while the Start dialog asks, the browser's own Save page included
            if ($('startDialog').open) {
                if ((event.metaKey || event.ctrlKey) && key === 's') {
                    event.preventDefault();
                }
                return;
            }
            if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === 's') {
                event.preventDefault();
                if (phase !== 'starting' && phase !== 'applying') {
                    saveServerConfig();
                }
                return;
            }
            if (key === 'escape' && !event.defaultPrevented && rangePopoverOpen()) {
                closeRangePopover(true);
                return;
            }
            if (key === 'escape' && !event.defaultPrevented) {
                const active = document.activeElement;
                const editor = active && active.closest ? active.closest('.editor') : null;
                if (editor) {
                    const row = editor.closest('.row');
                    toggleRow(row.dataset.rowId, false);
                    row.querySelector('.summary').focus();
                }
            }
        }

        function shortcutLabel() {
            return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘S' : 'Ctrl+S';
        }

        async function copyBaseUrl() {
            const button = $('copyUrlButton');
            try {
                await navigator.clipboard.writeText(status.base_url || '');
            } catch (error) {
                // no clipboard (an insecure origin, a refused permission): the URL stays selectable
                return;
            }
            button.setAttribute('title', 'Copied');
            button.querySelector('.copy-icon').classList.add('hidden');
            button.querySelector('.copied-icon').classList.remove('hidden');
            clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                button.setAttribute('title', 'Copy');
                button.querySelector('.copy-icon').classList.remove('hidden');
                button.querySelector('.copied-icon').classList.add('hidden');
            }, 1500);
        }

        function hostOf(url) {
            try {
                return new URL(url).host;
            } catch (error) {
                return url;
            }
        }

        function formatMs(ms) {
            if (ms == null) {
                return '–';
            }
            return ms < 1000 ? ms + ' ms' : (ms / 1000).toFixed(1) + ' s';
        }

        function formatRate(rate) {
            return rate == null ? '–' : (rate * 100).toFixed(1) + '%';
        }

        function formatCount(n) {
            return n == null ? '–' : n.toLocaleString('en-US');
        }

        function formatAgo(seconds) {
            if (seconds == null) {
                return '–';
            }
            if (seconds < 60) {
                return Math.floor(seconds) + ' s ago';
            }
            if (seconds < 3600) {
                return Math.floor(seconds / 60) + ' min ago';
            }
            if (seconds < 86400) {
                return Math.floor(seconds / 3600) + ' h ago';
            }
            return Math.floor(seconds / 86400) + ' d ago';
        }

        function formatUptime(seconds) {
            const s = Math.max(0, Math.floor(seconds));
            if (s < 60) {
                return s + ' s';
            }
            if (s < 3600) {
                return Math.floor(s / 60) + ' min';
            }
            if (s < 86400) {
                return Math.floor(s / 3600) + ' h ' + Math.floor((s % 3600) / 60) + ' min';
            }
            return Math.floor(s / 86400) + ' d ' + Math.floor((s % 86400) / 3600) + ' h';
        }

        function formatTps(v) {
            return v == null ? '–' : v.toFixed(1);
        }

        function formatCompact(n) {
            if (n == null) {
                return '–';
            }
            if (n < 10000) {
                return formatCount(n);
            }
            return n < 1e6 ? (n / 1e3).toFixed(1) + 'K' : (n / 1e6).toFixed(2) + 'M';
        }

        // an axis label in milliseconds: 500 ms, 1 s, 1.25 s
        function formatAxisMs(ms) {
            return ms < 1000 ? ms + ' ms' : Number((ms / 1000).toFixed(2)) + ' s';
        }

        function pad2(n) {
            return String(n).padStart(2, '0');
        }

        // Oct 3: a local day without the year
        function formatDay(unix) {
            const d = new Date(unix * 1000);
            return MONTHS[d.getMonth()] + ' ' + d.getDate();
        }

        // [Oct 3 ]14:05[:09], local
        function formatStamp(unix, options) {
            const o = options || {};
            const d = new Date(unix * 1000);
            return (o.day ? formatDay(unix) + ' ' : '') + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + (o.seconds ? ':' + pad2(d.getSeconds()) : '');
        }

        function sameDay(a, b) {
            return new Date(a * 1000).toDateString() === new Date(b * 1000).toDateString();
        }

        // a column's time: seconds for columns under a minute, the day once the range is a day or more, the
        // second day only when the column ends on another
        function formatWhen(start, end, span, rangeSeconds) {
            const o = { seconds: span < 60, day: rangeSeconds >= DAY };
            return formatStamp(start, o) + '–' + formatStamp(end, { seconds: o.seconds, day: o.day && !sameDay(start, end) });
        }

        // the custom segment's words: Oct 1 14:00–16:00, or Oct 1 14:00 – Oct 3 16:00
        function formatRangeLabel(from, to) {
            if (sameDay(from, to)) {
                return formatStamp(from, { day: true }) + '–' + formatStamp(to);
            }
            return formatStamp(from, { day: true }) + ' – ' + formatStamp(to, { day: true });
        }

        // 20 s, 2.5 min, 1 h 30 min, 2 d 12 h
        function formatSpan(seconds) {
            const s = Math.round(seconds);
            if (s < 60) {
                return s + ' s';
            }
            if (s < 3600) {
                return Number((s / 60).toFixed(1)) + ' min';
            }
            if (s < DAY) {
                const minutes = Math.floor((s % 3600) / 60);
                return Math.floor(s / 3600) + ' h' + (minutes ? ' ' + minutes + ' min' : '');
            }
            const hours = Math.floor((s % DAY) / 3600);
            return Math.floor(s / DAY) + ' d' + (hours ? ' ' + hours + ' h' : '');
        }

        function rangeLabel(seconds) {
            const preset = RANGES.find(([value]) => value === seconds);
            return preset ? preset[1] : formatSpan(seconds);
        }

        // what the charts cover, in words for their labels
        function rangeText(w) {
            return isCustom() ? 'from ' + formatStamp(w.start, { day: true }) + ' to ' + formatStamp(w.end, { day: true }) : 'over the last ' + rangeLabel(w.seconds);
        }

        // the saved file with its plain-text keys masked: a model's api_key and the server's api_keys that are not
        // $VAR references; everything else as written, in its order
        function maskKeys(config, reveal) {
            const copy = JSON.parse(JSON.stringify(config));
            if (reveal || !copy || typeof copy !== 'object' || Array.isArray(copy)) {
                return copy;
            }
            const hide = (value) => (typeof value === 'string' && value !== '' && !value.startsWith('$') ? MASK : value);
            if (Array.isArray(copy.models)) {
                copy.models.forEach((row) => {
                    if (row && typeof row === 'object' && !Array.isArray(row) && 'api_key' in row) {
                        row.api_key = hide(row.api_key);
                    }
                });
            }
            if (Array.isArray(copy.api_keys)) {
                copy.api_keys = copy.api_keys.map(hide);
            }
            return copy;
        }

        // the text of JSON.stringify(value, null, 2), its keys, strings, numbers and punctuation in spans; every
        // string goes in as text, never as markup
        function renderJson(code, value) {
            const out = document.createDocumentFragment();
            const span = (cls, text) => {
                const el = document.createElement('span');
                el.className = cls;
                el.textContent = text;
                out.append(el);
            };
            const walk = (v, indent) => {
                const inner = indent + '  ';
                if (Array.isArray(v) || (v && typeof v === 'object')) {
                    const keys = Array.isArray(v) ? null : Object.keys(v);
                    const items = keys || v;
                    const [open, close] = keys ? ['{', '}'] : ['[', ']'];
                    if (!items.length) {
                        span('p', open + close);
                        return;
                    }
                    span('p', open);
                    items.forEach((item, i) => {
                        out.append('\\n' + inner);
                        if (keys) {
                            span('k', JSON.stringify(item));
                            span('p', ':');
                            out.append(' ');
                        }
                        walk(keys ? v[item] : item, inner);
                        if (i < items.length - 1) {
                            span('p', ',');
                        }
                    });
                    out.append('\\n' + indent);
                    span('p', close);
                } else if (typeof v === 'string') {
                    span(v === MASK ? 'm' : 's', JSON.stringify(v));
                } else {
                    span('n', JSON.stringify(v));
                }
            };
            walk(value, '');
            code.replaceChildren(out);
        }

        // the File card on Settings: the saved file formatted, or why there is none, or the text that is not a config
        function renderFile() {
            if (!saved) {
                return;
            }
            const path = $('configPath');
            path.textContent = saved.path || '';
            path.title = saved.path || '';
            const note = $('fileNote');
            const view = $('fileView');
            const code = view.firstChild;
            const reveal = $('fileReveal');
            const copy = $('fileCopy');
            delete note.dataset.error;
            delete view.dataset.raw;
            if (!saved.exists) {
                note.textContent = 'Not saved yet';
                note.classList.remove('hidden');
                view.classList.add('hidden');
                code.replaceChildren();
                reveal.disabled = true;
                copy.disabled = true;
                fileText = '';
                return;
            }
            view.classList.remove('hidden');
            let value = null;
            if (!saved.error) {
                try {
                    value = JSON.parse(typeof saved.text === 'string' ? saved.text : JSON.stringify(saved.config));
                } catch (error) {
                    value = null;
                }
            }
            if (value === null || typeof value !== 'object') {
                note.textContent = saved.error || '';
                note.dataset.error = 'true';
                note.classList.toggle('hidden', !saved.error);
                view.dataset.raw = 'true';
                fileText = typeof saved.text === 'string' ? saved.text : '';
                code.textContent = fileText;
                reveal.disabled = true;
                copy.disabled = !fileText;
                return;
            }
            note.classList.add('hidden');
            // nothing written in plain text: there is nothing to reveal
            const plain = JSON.stringify(maskKeys(value, false)) !== JSON.stringify(value);
            fileKeysVisible = fileKeysVisible && plain;
            const shown = maskKeys(value, fileKeysVisible);
            fileText = JSON.stringify(shown, null, 2) + '\\n';
            renderJson(code, shown);
            reveal.disabled = !plain;
            copy.disabled = false;
            const label = fileKeysVisible ? 'Hide keys' : 'Show keys';
            reveal.dataset.visible = fileKeysVisible ? 'true' : 'false';
            reveal.setAttribute('aria-label', label);
            reveal.setAttribute('title', label);
            reveal.querySelector('.eye-on').classList.toggle('hidden', !fileKeysVisible);
            reveal.querySelector('.eye-off').classList.toggle('hidden', fileKeysVisible);
        }

        function toggleFileKeys() {
            fileKeysVisible = !fileKeysVisible;
            renderFile();
        }

        // what the card shows goes to the clipboard: masked, revealed, or the raw text
        async function copyFile() {
            const button = $('fileCopy');
            try {
                await navigator.clipboard.writeText(fileText);
            } catch (error) {
                // no clipboard (an insecure origin, a refused permission): the text stays selectable
                return;
            }
            button.setAttribute('title', 'Copied');
            button.querySelector('.copy-icon').classList.add('hidden');
            button.querySelector('.copied-icon').classList.remove('hidden');
            clearTimeout(fileCopyTimer);
            fileCopyTimer = setTimeout(() => {
                button.setAttribute('title', 'Copy');
                button.querySelector('.copy-icon').classList.remove('hidden');
                button.querySelector('.copied-icon').classList.add('hidden');
            }, 1500);
        }

        // a preset ("900"), or a custom range ("F-T", at most MAX_RANGE_S long); anything else is 15 min
        try {
            const stored = localStorage.getItem(RANGE_KEY) || '';
            const custom = /^(\\d{1,10})-(\\d{1,10})$/.exec(stored);
            if (RANGES.some(([value]) => String(value) === stored)) {
                range = { seconds: Number(stored) };
            } else if (custom && Number(custom[1]) < Number(custom[2]) && Number(custom[2]) - Number(custom[1]) <= MAX_RANGE_S) {
                range = { from: Number(custom[1]), to: Number(custom[2]) };
            }
        } catch (error) {
            // the default range it is
        }
        (async () => {
            await loadServerConfig();
            restoreTable();
            await refreshStatus();
        })();
        showTab(TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview');
        updateThemeToggle();
        $('saveKey').textContent = shortcutLabel();
        $('saveButton').setAttribute('title', shortcutLabel());
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeToggle);
        document.fonts.ready.then(() => {
            updateThemeToggle();
            paintRange();
        });
        document.addEventListener('keydown', handleShortcut);
        // a press outside the range control closes its popover, and so does focus that leaves it
        document.addEventListener('pointerdown', (event) => {
            if (rangePopoverOpen() && event.target instanceof Node && !$('rangeWrap').contains(event.target)) {
                closeRangePopover(false);
            }
        });
        $('rangeWrap').addEventListener('focusout', (event) => {
            if (event.relatedTarget instanceof Node && !$('rangeWrap').contains(event.relatedTarget)) {
                closeRangePopover(false);
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                refreshAll();
            }
        });
        window.addEventListener('resize', handleResize);
        window.addEventListener('hashchange', () => {
            const next = location.hash.slice(1);
            if (TABS.includes(next) && next !== tab) {
                showTab(next);
            }
        });
        document.addEventListener('scroll', handleScroll, true);
    </script>
</body>
</html>
"""
# -- SERVER_TEMPLATE end --


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Start the MMSP server, which serves the models of its table as MMSP streams"
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help='The JSON config file: {"models": [...], "api_keys": [...]} (default: MMSP_SERVER_CONFIG)',
    )
    parser.add_argument("--host", type=str, default=DEFAULT_HOST, help="Host address to bind to")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port number to listen on")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument(
        "--metrics",
        type=str,
        default=None,
        help="The metrics history file, continued across restarts; one server per file (default: none is written)",
    )

    args = parser.parse_args()
    config_path = args.config or os.getenv("MMSP_SERVER_CONFIG")
    if not config_path:
        parser.error("A config file is required: pass --config PATH or set MMSP_SERVER_CONFIG.")

    config = load_server_config(config_path)
    start_server(
        config["models"],
        config["api_keys"],
        host=args.host,
        port=args.port,
        debug=args.debug,
        metrics_path=args.metrics,
    )
