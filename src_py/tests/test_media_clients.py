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


"""The image, speech and transcription clients against a local server: what each request carries and what its answer becomes."""

import asyncio
import base64
import io
import json
import threading
import wave
from contextlib import suppress
from email.parser import BytesParser
from email.policy import default as email_policy
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Iterator

import pytest
from stream_grammar import assert_stream_grammar

from mmsp import (
    AutoLLMClient,
    InvalidMessageError,
    ProviderStreamError,
    UnsupportedContentError,
    UnsupportedParameterError,
)
from mmsp.abort_signal import AbortSignal


_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24
_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 24
_PCM = bytes(range(256)) * 8
_MP3 = b"ID3" + b"\x00" * 61

# Answers in the shape each live endpoint returned them (api_captures/*_images/), by model: OpenAI
# names the format of its PNGs, OpenRouter the type of each image, and TokenDance links each JPEG and
# names neither; the link is filled in with the local server's address.
_IMAGE_ANSWERS: dict[str, dict[str, Any]] = {
    "gpt-image-2.5-flare": {
        "created": 1793813590,
        "background": "opaque",
        "data": [{"b64_json": base64.b64encode(_PNG).decode(), "generation_id": "cb66cd80"}],
        "output_format": "png",
        "quality": "low",
        "size": "1024x1024",
        "usage": {
            "input_tokens": 18,
            "input_tokens_details": {"image_tokens": 0, "text_tokens": 18},
            "output_tokens": 196,
            "output_tokens_details": {"image_tokens": 196, "text_tokens": 0},
            "total_tokens": 214,
        },
    },
    "bytedance-seed/seedream-5-0-flash": {
        "created": 1793813712,
        "data": [{"b64_json": base64.b64encode(_JPEG).decode(), "media_type": "image/jpeg"}],
        "usage": {"prompt_tokens": 15, "completion_tokens": 4096, "total_tokens": 4111, "cost": 0.018},
    },
    "seedream-5.0-lite": {
        "model": "doubao-seedream-5-0-260128",
        "created": 1793813961,
        "data": [{"url": "{origin}/storage/image.jpeg?X-Tos-Signature=abc", "size": "2048x2048"}],
        "usage": {"generated_images": 1, "output_tokens": 16384, "total_tokens": 16384},
    },
    "expired-link": {
        "data": [{"url": "{origin}/storage/expired.jpeg"}],
        "usage": {"generated_images": 1, "output_tokens": 16384, "total_tokens": 16384},
    },
}

# The content type of each speech model's answer: OpenRouter's PCM, and OpenAI's MP3
_SPEECH_TYPES = {"fish-audio/drama-3": "audio/pcm;rate=44100;channels=1", "tts-1": "audio/mpeg"}


class _MediaServer(BaseHTTPRequestHandler):
    """Records every request and answers it as the endpoint of its path does."""

    requests: list[dict[str, Any]] = []

    def _record(self, body: Any) -> None:
        type(self).requests.append(
            {
                "method": self.command,
                "path": self.path,
                "headers": {name.lower(): value for name, value in self.headers.items()},
                "body": body,
            }
        )

    def _send(self, status: int, content_type: str, payload: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:  # noqa: N802 - the name is BaseHTTPRequestHandler's
        self._record(None)
        if self.path.startswith("/storage/image.jpeg"):
            self._send(200, "image/jpeg", _JPEG)
        else:
            self._send(403, "application/xml", b"<Error><Code>AccessDenied</Code></Error>")

    def do_POST(self) -> None:  # noqa: N802 - the name is BaseHTTPRequestHandler's
        raw = self.rfile.read(int(self.headers["Content-Length"]))
        if self.path == "/v1/audio/transcriptions":
            message = BytesParser(policy=email_policy).parsebytes(
                f"Content-Type: {self.headers['Content-Type']}\r\n\r\n".encode() + raw
            )
            form = {}
            for part in message.iter_parts():
                name = part.get_param("name", header="content-disposition")
                if part.get_filename():
                    form[name] = (part.get_filename(), part.get_content_type(), part.get_payload(decode=True))
                else:
                    form[name] = part.get_content()
            self._record(form)
            self._send(200, "application/json", json.dumps({"text": "Hello.", "usage": {"seconds": 7.6}}).encode())
            return

        body = json.loads(raw)
        self._record(body)
        if self.path == "/v1/images/generations":
            origin = f"http://127.0.0.1:{self.server.server_address[1]}"
            answer = json.dumps(_IMAGE_ANSWERS[body["model"]]).replace("{origin}", origin).encode()
            self._send(200, "application/json", answer)
        else:
            # the audio arrives in pieces, as the endpoint makes it
            payload = _PCM if body["model"] == "fish-audio/drama-3" else _MP3
            self.send_response(200)
            self.send_header("Content-Type", _SPEECH_TYPES[body["model"]])
            self.end_headers()
            for start in range(0, len(payload), 500):
                self.wfile.write(payload[start : start + 500])
                self.wfile.flush()

    def log_message(self, *args: object) -> None:
        """Keep the request log out of the test output."""


@pytest.fixture
def media_server() -> Iterator[str]:
    _MediaServer.requests = []
    server = ThreadingHTTPServer(("127.0.0.1", 0), _MediaServer)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/v1"
    finally:
        server.shutdown()
        server.server_close()


def _text(text: str) -> dict[str, Any]:
    return {"role": "user", "content_items": [{"type": "text.done", "text": text}]}


def _audio(data: bytes, mime_type: str) -> dict[str, Any]:
    return {"role": "user", "content_items": [{"type": "inline_data.done", "data": data, "mime_type": mime_type}]}


async def _run(
    model: str, client_type: str, base_url: str, messages: list[dict[str, Any]], config: dict[str, Any], **options: Any
) -> list[Any]:
    client = AutoLLMClient(model=model, client_type=client_type, api_key="sk-PROBE", base_url=base_url, **options)
    events = [event async for event in client.streaming_response(messages=messages, config=config)]
    assert_stream_grammar(events)
    return events


def _done(events: list[Any], item_type: str) -> list[dict[str, Any]]:
    return [item for event in events for item in event["content_items"] if item["type"] == item_type]


# --- openai-image: the size table, the request, the image's bytes and type, the usage

_SIZE_TABLE = [
    ("1:1", "1024x1024", "2048x2048"),
    ("2:3", "848x1264", "1696x2528"),
    ("3:2", "1264x848", "2528x1696"),
    ("3:4", "896x1200", "1792x2400"),
    ("4:3", "1200x896", "2400x1792"),
    ("9:16", "768x1376", "1536x2752"),
    ("16:9", "1376x768", "2752x1536"),
    ("21:9", "1584x672", "3168x1344"),
]


def _image_params(config: dict[str, Any]) -> dict[str, Any]:
    client = AutoLLMClient(model="gpt-image-2.5-flare", api_key="sk-PROBE")
    return client.transform_uni_config_to_model_config(config)


@pytest.mark.parametrize(("aspect_ratio", "size_1k", "size_2k"), _SIZE_TABLE)
def test_an_image_config_is_sent_as_the_size_of_geminis_table(aspect_ratio: str, size_1k: str, size_2k: str):
    for image_size, size in (("1K", size_1k), ("2K", size_2k)):
        assert _image_params({"image_config": {"aspect_ratio": aspect_ratio, "image_size": image_size}}) == {
            "model": "gpt-image-2.5-flare",
            "size": size,
        }
        # every size keeps OpenAI's rules for GPT Image sizes
        width, height = map(int, size.split("x"))
        assert width % 16 == 0 and height % 16 == 0
        assert 655_360 <= width * height <= 8_294_400
        assert max(width, height) <= 3840
        assert max(width, height) / min(width, height) <= 3
    # an aspect ratio alone takes its 1K size
    assert _image_params({"image_config": {"aspect_ratio": aspect_ratio}})["size"] == size_1k


def test_an_image_size_alone_is_square_and_no_image_config_sends_no_size():
    assert _image_params({"image_config": {"image_size": "2K"}})["size"] == "2048x2048"
    assert _image_params({}) == {"model": "gpt-image-2.5-flare"}
    assert _image_params({"image_config": {}}) == {"model": "gpt-image-2.5-flare"}


def test_an_image_config_outside_the_table_is_refused():
    with pytest.raises(UnsupportedParameterError) as exc_info:
        _image_params({"image_config": {"aspect_ratio": "5:4", "image_size": "1K"}})
    assert exc_info.value.parameter == "image_config"


@pytest.mark.asyncio
async def test_an_image_request_carries_the_model_prompt_and_size_alone(media_server: str):
    events = await _run(
        "gpt-image-2.5-flare",
        "openai-official",
        media_server,
        [_text("A red "), _text("A paper boat")],
        {"image_config": {"aspect_ratio": "16:9", "image_size": "2K"}, "thinking_level": "high", "max_tokens": 10},
    )

    # one request per message, with neither response_format nor stream
    assert [(request["path"], request["body"]) for request in _MediaServer.requests] == [
        ("/v1/images/generations", {"model": "gpt-image-2.5-flare", "size": "2752x1536", "prompt": "A red "}),
        ("/v1/images/generations", {"model": "gpt-image-2.5-flare", "size": "2752x1536", "prompt": "A paper boat"}),
    ]
    assert _MediaServer.requests[0]["headers"]["authorization"] == "Bearer sk-PROBE"
    assert [(item["data"], item["mime_type"]) for item in _done(events, "inline_data.done")] == [
        (_PNG, "image/png"),
        (_PNG, "image/png"),
    ]
    # OpenAI's input and output tokens, summed over the requests
    assert events[-1]["usage_metadata"] == {
        "cached_tokens": None,
        "prompt_tokens": 36,
        "thoughts_tokens": None,
        "response_tokens": 392,
    }
    assert events[-1]["finish_reason"] == "stop"


@pytest.mark.asyncio
async def test_an_image_takes_its_media_type_and_openrouters_prompt_and_completion_tokens(media_server: str):
    events = await _run("bytedance-seed/seedream-5-0-flash", "openai-image", media_server, [_text("A boat")], {})

    assert "size" not in _MediaServer.requests[0]["body"]
    assert [(item["data"], item["mime_type"]) for item in _done(events, "inline_data.done")] == [(_JPEG, "image/jpeg")]
    assert (events[-1]["usage_metadata"]["prompt_tokens"], events[-1]["usage_metadata"]["response_tokens"]) == (
        15,
        4096,
    )


@pytest.mark.asyncio
async def test_a_linked_image_is_downloaded_without_any_credential_and_typed_by_its_bytes(media_server: str):
    events = await _run(
        "seedream-5.0-lite",
        "openai-image",
        media_server,
        [_text("A boat")],
        {"image_config": {"image_size": "2K"}},
        default_headers={"X-Gateway-Probe": "secret"},
    )

    post, download = _MediaServer.requests
    assert (post["headers"]["authorization"], post["headers"]["x-gateway-probe"]) == ("Bearer sk-PROBE", "secret")
    assert (download["method"], download["path"]) == ("GET", "/storage/image.jpeg?X-Tos-Signature=abc")
    # neither the key nor the default headers nor anything of OpenAI's go with the download
    assert not {"authorization", "x-gateway-probe", "openai-organization", "openai-project"} & set(download["headers"])
    assert [(item["data"], item["mime_type"]) for item in _done(events, "inline_data.done")] == [(_JPEG, "image/jpeg")]
    # TokenDance reports its output tokens alone
    assert (events[-1]["usage_metadata"]["prompt_tokens"], events[-1]["usage_metadata"]["response_tokens"]) == (
        None,
        16384,
    )


@pytest.mark.asyncio
async def test_a_link_that_cannot_be_downloaded_raises_with_its_status(media_server: str):
    client = AutoLLMClient(model="expired-link", client_type="openai-image", api_key="sk-PROBE", base_url=media_server)

    with pytest.raises(ProviderStreamError) as exc_info:
        [event async for event in client.streaming_response(messages=[_text("A boat")], config={})]
    assert exc_info.value.code == 403


# --- openai-speech: the voice, the audio's chunks and type, the bytes billed


def test_a_voice_is_sent_only_from_one_speaker():
    client = AutoLLMClient(model="fish-audio/drama-3", client_type="openai-speech", api_key="sk-PROBE")

    assert client.transform_uni_config_to_model_config({"tts_config": [{"voice": "Adrian"}]}) == {
        "model": "fish-audio/drama-3",
        "voice": "Adrian",
    }
    with pytest.raises(UnsupportedParameterError) as exc_info:
        client.transform_uni_config_to_model_config(
            {"tts_config": [{"voice": "Adrian", "speaker": "A"}, {"voice": "Delia", "speaker": "B"}]}
        )
    assert exc_info.value.parameter == "tts_config"


@pytest.mark.asyncio
async def test_speech_streams_its_pcm_as_one_item_per_message_and_counts_the_inputs_bytes(media_server: str):
    texts = ["Héllo, wörld.", "你好，世界。"]
    events = await _run("fish-audio/drama-3", "openai-speech", media_server, [_text(text) for text in texts], {})

    # no voice without tts_config, and the endpoint's default format
    assert [request["body"] for request in _MediaServer.requests] == [
        {"model": "fish-audio/drama-3", "input": text} for text in texts
    ]
    assert _MediaServer.requests[0]["headers"]["authorization"] == "Bearer sk-PROBE"
    deltas = _done(events, "inline_data.delta")
    assert len(deltas) >= 2
    assert {delta["mime_type"] for delta in deltas} == {"audio/l16; rate=44100; channels=1"}
    assert [(item["data"], item["mime_type"]) for item in _done(events, "inline_data.done")] == [
        (_PCM, "audio/l16; rate=44100; channels=1"),
        (_PCM, "audio/l16; rate=44100; channels=1"),
    ]
    # 15 + 18 UTF-8 bytes, as Fish Audio bills them
    assert events[-1]["usage_metadata"] == {
        "cached_tokens": None,
        "prompt_tokens": 33,
        "thoughts_tokens": None,
        "response_tokens": 0,
    }


@pytest.mark.asyncio
async def test_speech_in_another_format_keeps_its_content_type_and_sends_the_voice(media_server: str):
    events = await _run("tts-1", "openai-speech", media_server, [_text("Hi")], {"tts_config": [{"voice": "alloy"}]})

    assert _MediaServer.requests[0]["body"] == {"model": "tts-1", "input": "Hi", "voice": "alloy"}
    assert [(item["data"], item["mime_type"]) for item in _done(events, "inline_data.done")] == [(_MP3, "audio/mpeg")]


@pytest.mark.parametrize("stop", ["aclose", "abort"])
@pytest.mark.asyncio
async def test_stopping_a_speech_stream_closes_its_connection(stop: str, monkeypatch: pytest.MonkeyPatch):
    # the client under test reaches the local endpoint directly
    for name in ("http_proxy", "https_proxy", "all_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY"):
        monkeypatch.delenv(name, raising=False)
    closed = asyncio.Event()

    async def speak(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        head = (await reader.readuntil(b"\r\n\r\n")).decode().lower()
        await reader.readexactly(int(head.split("content-length:")[1].split("\r\n")[0]))
        writer.write(b"HTTP/1.1 200 OK\r\nContent-Type: audio/pcm;rate=44100;channels=1\r\n")
        writer.write(b"Transfer-Encoding: chunked\r\n\r\n%x\r\n%s\r\n" % (len(_PCM), _PCM))
        await writer.drain()
        # the endpoint is still speaking: nothing more arrives until the client closes the connection
        with suppress(ConnectionError):
            while await reader.read(1024):
                pass
        closed.set()
        writer.close()

    server = await asyncio.start_server(speak, "127.0.0.1", 0)
    try:
        client = AutoLLMClient(
            model="fish-audio/drama-3",
            client_type="openai-speech",
            api_key="sk-PROBE",
            base_url=f"http://127.0.0.1:{server.sockets[0].getsockname()[1]}/v1",
        )
        signal = AbortSignal()
        stream = client.streaming_response(messages=[_text("Count to a thousand.")], config={}, signal=signal)
        first = await anext(stream)
        assert first["content_items"][0]["type"] == "inline_data.delta"

        if stop == "aclose":
            await stream.aclose()
        else:
            reading = asyncio.create_task(anext(stream))
            await asyncio.sleep(0.05)
            signal.abort("stop")
            with pytest.raises(asyncio.CancelledError):
                await reading
        await asyncio.wait_for(closed.wait(), 0.5)
    finally:
        server.close()
        await server.wait_closed()


# --- openai-transcription: the upload, PCM wrapped as WAV, the refusals, the seconds billed


@pytest.mark.asyncio
async def test_a_transcription_uploads_the_audio_as_it_is_and_counts_its_seconds_rounded_up(media_server: str):
    events = await _run(
        "fish-audio/transcribe-1",
        "openai-transcription",
        media_server,
        [_audio(_MP3, "audio/mpeg"), _audio(_MP3, "audio/mpeg")],
        {},
    )

    request = _MediaServer.requests[0]
    assert request["headers"]["authorization"] == "Bearer sk-PROBE"
    assert request["headers"]["content-type"].startswith("multipart/form-data; boundary=")
    # the model and the file, and no prompt
    assert request["body"] == {"model": "fish-audio/transcribe-1", "file": ("audio.mp3", "audio/mpeg", _MP3)}
    assert [item["text"] for item in _done(events, "text.done")] == ["Hello.", "Hello."]
    assert events[-1]["usage_metadata"] == {
        "cached_tokens": None,
        "prompt_tokens": 16,
        "thoughts_tokens": None,
        "response_tokens": 0,
    }


@pytest.mark.parametrize("mime_type", ["audio/l16; rate=24000; channels=1", "audio/pcm;rate=24000;channels=2"])
@pytest.mark.asyncio
async def test_headerless_pcm_is_uploaded_as_wav_of_its_rate_and_channels(mime_type: str, media_server: str):
    await _run("fish-audio/transcribe-1", "openai-transcription", media_server, [_audio(_PCM, mime_type)], {})

    name, content_type, data = _MediaServer.requests[0]["body"]["file"]
    assert (name, content_type) == ("audio.wav", "audio/wav")
    with wave.open(io.BytesIO(data)) as wav:
        channels = 2 if "channels=2" in mime_type else 1
        assert (wav.getframerate(), wav.getnchannels(), wav.getsampwidth()) == (24000, channels, 2)
        assert wav.readframes(wav.getnframes()) == _PCM


@pytest.mark.parametrize(
    ("content_items", "error"),
    [
        ([{"type": "inline_data.done", "data": _PCM, "mime_type": "audio/l16"}], InvalidMessageError),
        (
            [
                {"type": "inline_data.done", "data": _MP3, "mime_type": "audio/mpeg"},
                {"type": "inline_data.done", "data": _MP3, "mime_type": "audio/mpeg"},
            ],
            InvalidMessageError,
        ),
        (
            [
                {"type": "inline_data.done", "data": _MP3, "mime_type": "audio/mpeg"},
                {"type": "text.done", "text": "Transcribe this."},
            ],
            UnsupportedContentError,
        ),
        ([{"type": "inline_data.done", "data": _PNG, "mime_type": "image/png"}], UnsupportedContentError),
        ([{"type": "image_url.done", "image_url": "https://example.com/a.png"}], UnsupportedContentError),
    ],
    ids=["pcm-without-rate", "two-audio-items", "text-beside-audio", "image-inline-data", "image-url"],
)
@pytest.mark.asyncio
async def test_a_transcription_refuses_a_message_that_is_not_one_audio_item(
    content_items: list[dict[str, Any]], error: type[Exception], media_server: str
):
    client = AutoLLMClient(
        model="fish-audio/transcribe-1", client_type="openai-transcription", api_key="sk-PROBE", base_url=media_server
    )

    with pytest.raises(error):
        [
            event
            async for event in client.streaming_response(
                messages=[{"role": "user", "content_items": content_items}], config={}
            )
        ]
    assert _MediaServer.requests == []


# --- all three: what they cannot send is refused before any request


@pytest.mark.parametrize(
    ("model", "client_type"),
    [
        ("gpt-image-2.5-flare", "openai-image"),
        ("fish-audio/drama-3", "openai-speech"),
        ("fish-audio/transcribe-1", "openai-transcription"),
    ],
)
@pytest.mark.asyncio
async def test_a_media_client_refuses_fast_mode_and_what_it_cannot_send_before_any_request(
    model: str, client_type: str, media_server: str
):
    client = AutoLLMClient(model=model, client_type=client_type, api_key="sk-PROBE", base_url=media_server)
    image = {"role": "user", "content_items": [{"type": "image_url.done", "image_url": "https://example.com/a.png"}]}

    with pytest.raises(UnsupportedContentError):
        [event async for event in client.streaming_response(messages=[image], config={})]
    with pytest.raises(UnsupportedParameterError):
        [event async for event in client.streaming_response(messages=[_text("x")], config={"fast_mode": True})]
    assert _MediaServer.requests == []
