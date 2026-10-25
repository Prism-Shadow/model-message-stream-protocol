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

import asyncio
import copy
import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any, AsyncIterator

import pytest
from stream_grammar import assert_stream_grammar

from mmsp import AutoLLMClient, legacy
from mmsp.abort_signal import AbortSignal
from mmsp.base_client import LLMClient
from mmsp.errors import (
    ConcurrentCallError,
    EmptyResponseError,
    IncompleteStreamError,
    InvalidMessageError,
    StreamProtocolError,
    ToolCallArgumentParseError,
    UnsupportedParameterError,
)
from mmsp.legacy import normalize_legacy_messages
from mmsp.types import EventContentItem, FinishReason, UniConfig, UniEvent, UniMessage, UsageMetadata


USAGE: UsageMetadata = {"cached_tokens": None, "prompt_tokens": 10, "thoughts_tokens": None, "response_tokens": 5}

USER: UniMessage = {"role": "user", "content_items": [{"type": "text.done", "text": "hi"}]}


def delta(*items: EventContentItem) -> UniEvent:
    return {
        "role": "assistant",
        "event_type": "delta",
        "content_items": list(items),
        "usage_metadata": None,
        "finish_reason": None,
    }


def stop(
    usage: UsageMetadata | None, finish: FinishReason | None, items: list[EventContentItem] | None = None
) -> UniEvent:
    return {
        "role": "assistant",
        "event_type": "stop",
        "content_items": items or [],
        "usage_metadata": usage,
        "finish_reason": finish,
    }


def with_id(item_id: str, item: EventContentItem) -> EventContentItem:
    """The item with fidelity.item_id in front of the fidelity it already carries."""
    return {**item, "fidelity": {"item_id": item_id, **item.get("fidelity", {})}}


FINISH = stop(USAGE, "stop")


class ScriptedClient(LLMClient):
    """A client that replays a fixed list of events and records the messages it was sent."""

    def __init__(self, events: list[UniEvent]) -> None:
        self._model = "scripted"
        self._history = []
        self._events = events
        self.sent_messages: list[list[UniMessage]] = []

    def transform_uni_config_to_model_config(self, config: UniConfig) -> None:
        return None

    def transform_uni_message_to_model_input(self, messages: list[UniMessage]) -> list[UniMessage]:
        return messages

    def transform_model_output_to_uni_event(self, model_output: UniEvent) -> UniEvent:
        return model_output

    async def _streaming_response_internal(
        self,
        messages: list[UniMessage],
        config: UniConfig,
    ) -> AsyncIterator[UniEvent]:
        self.sent_messages.append(messages)
        for event in self._events:
            yield self.transform_model_output_to_uni_event(event)

    async def list_models(self) -> list[str]:
        return []


async def collect(script: list[UniEvent], config: UniConfig | None = None) -> list[UniEvent]:
    return [event async for event in ScriptedClient(script).streaming_response(messages=[USER], config=config or {})]


def items(events: list[UniEvent]) -> list[EventContentItem]:
    return [item for event in events for item in event["content_items"]]


@pytest.mark.asyncio
async def test_text_streams_as_deltas_a_done_item_then_the_stop_event():
    events = await collect(
        [
            delta(with_id("0", {"type": "text.delta", "text": "Hel"})),
            delta(with_id("0", {"type": "text.delta", "text": "lo"})),
            FINISH,
        ]
    )

    assert_stream_grammar(events)
    assert items(events) == [
        {"type": "text.delta", "text": "Hel"},
        {"type": "text.delta", "text": "lo"},
        {"type": "text.done", "text": "Hello"},
    ]
    assert events[-1]["event_type"] == "stop"
    assert events[-1]["usage_metadata"] == USAGE
    assert events[-1]["finish_reason"] == "stop"


@pytest.mark.asyncio
async def test_the_fidelity_a_delta_carries_is_the_done_items_fidelity():
    events = await collect(
        [
            delta(with_id("msg", {"type": "text.delta", "text": "", "fidelity": {"phase": "commentary"}})),
            delta(with_id("msg", {"type": "text.delta", "text": "Checking"})),
            FINISH,
        ]
    )

    assert_stream_grammar(events)
    assert items(events) == [
        {"type": "text.delta", "text": "", "fidelity": {"phase": "commentary"}},
        {"type": "text.delta", "text": "Checking"},
        {"type": "text.done", "text": "Checking", "fidelity": {"phase": "commentary"}},
    ]


@pytest.mark.asyncio
async def test_thinking_ending_on_its_signature_then_a_tool_call_built_from_its_fragments():
    events = await collect(
        [
            delta(with_id("0", {"type": "thinking.delta", "thinking": "Let me"})),
            delta(with_id("0", {"type": "thinking.delta", "thinking": " look"})),
            delta(with_id("0", {"type": "thinking.delta", "thinking": "", "fidelity": {"signature": "sig"}})),
            delta(
                with_id(
                    "1",
                    {"type": "tool_call.delta", "name": "get_weather", "arguments": "", "tool_call_id": "toolu_1"},
                )
            ),
            delta(with_id("1", {"type": "tool_call.delta", "name": "", "arguments": '{"city":', "tool_call_id": ""})),
            delta(with_id("1", {"type": "tool_call.delta", "name": "", "arguments": '"Paris"}', "tool_call_id": ""})),
            stop(USAGE, "tool_call"),
        ]
    )

    assert_stream_grammar(events)
    assert [item for item in items(events) if item["type"].endswith(".done")] == [
        {"type": "thinking.done", "thinking": "Let me look", "fidelity": {"signature": "sig"}},
        {"type": "tool_call.done", "name": "get_weather", "arguments": {"city": "Paris"}, "tool_call_id": "toolu_1"},
    ]


@pytest.mark.asyncio
async def test_an_item_is_done_when_a_delta_of_the_next_item_arrives_another_id_kind_or_call():
    def call(item_id: str, name: str, arguments: str) -> UniEvent:
        return delta(
            with_id(
                item_id,
                {
                    "type": "tool_call.delta",
                    "name": name,
                    "arguments": arguments,
                    "tool_call_id": f"call_{name}" if name else "",
                },
            )
        )

    events = await collect(
        [
            delta(with_id("msg_1", {"type": "text.delta", "text": "a"})),
            # another id
            delta(with_id("msg_2", {"type": "text.delta", "text": "b"})),
            # another kind under the same id
            delta(with_id("msg_2", {"type": "thinking.delta", "thinking": "c"})),
            # a call's name begins the next call, whatever id a provider gives its calls
            call("tool_calls", "f", '{"x":'),
            call("tool_calls", "", "1}"),
            call("tool_calls", "g", "{}"),
            # and its arguments continue it, whatever id a gateway puts on them
            call("other", "", ""),
            FINISH,
        ]
    )

    assert_stream_grammar(events)
    assert [item["type"] for item in items(events)] == [
        "text.delta",
        "text.done",
        "text.delta",
        "text.done",
        "thinking.delta",
        "thinking.done",
        "tool_call.delta",
        "tool_call.delta",
        "tool_call.done",
        "tool_call.delta",
        "tool_call.done",
    ]
    assert items(events)[8]["name"] == "f"
    assert items(events)[8]["arguments"] == {"x": 1}
    assert items(events)[10]["name"] == "g"
    assert items(events)[10]["arguments"] == {}


@pytest.mark.asyncio
async def test_a_delta_without_an_item_id_continues_the_item_streaming_now():
    # a gateway that leaves the item ids off its deltas
    events = await collect(
        [
            delta(with_id("rs_1", {"type": "thinking.delta", "thinking": ""})),
            delta({"type": "thinking.delta", "thinking": "Plan"}),
            delta({"type": "text.delta", "text": "Ans"}),
            delta({"type": "text.delta", "text": "wer"}),
            FINISH,
        ]
    )

    assert_stream_grammar(events)
    assert items(events) == [
        {"type": "thinking.delta", "thinking": "Plan"},
        {"type": "thinking.done", "thinking": "Plan"},
        {"type": "text.delta", "text": "Ans"},
        {"type": "text.delta", "text": "wer"},
        {"type": "text.done", "text": "Answer"},
    ]


@pytest.mark.asyncio
async def test_the_item_streaming_when_the_providers_stream_ends_is_done_before_the_stop():
    events = await collect(
        [
            delta(with_id("0", {"type": "text.delta", "text": "a"})),
            delta(with_id("1", {"type": "text.delta", "text": "b"})),
            FINISH,
        ]
    )

    assert_stream_grammar(events)
    assert items(events) == [
        {"type": "text.delta", "text": "a"},
        {"type": "text.done", "text": "a"},
        {"type": "text.delta", "text": "b"},
        {"type": "text.done", "text": "b"},
    ]


@pytest.mark.asyncio
async def test_a_repeated_identical_fidelity_goes_out_once_empty_fragments_not_at_all():
    fidelity = {"reasoning_field": "reasoning_content"}
    events = await collect(
        [
            delta(with_id("0", {"type": "thinking.delta", "thinking": ""})),
            delta(with_id("0", {"type": "thinking.delta", "thinking": "a", "fidelity": fidelity})),
            delta(with_id("0", {"type": "thinking.delta", "thinking": "b", "fidelity": fidelity})),
            delta(with_id("1", {"type": "text.delta", "text": "ok"})),
            FINISH,
        ]
    )

    assert_stream_grammar(events)
    assert items(events) == [
        {"type": "thinking.delta", "thinking": "a", "fidelity": fidelity},
        {"type": "thinking.delta", "thinking": "b"},
        {"type": "thinking.done", "thinking": "ab", "fidelity": fidelity},
        {"type": "text.delta", "text": "ok"},
        {"type": "text.done", "text": "ok"},
    ]


@pytest.mark.asyncio
async def test_audio_chunks_join_into_one_done_item_while_every_image_and_every_vector_is_an_item():
    audio = await collect(
        [
            delta(with_id("0", {"type": "inline_data.delta", "data": bytes([1, 2]), "mime_type": "audio/L16"})),
            delta(with_id("0", {"type": "inline_data.delta", "data": bytes([3]), "mime_type": "audio/L16"})),
            FINISH,
        ]
    )
    assert_stream_grammar(audio)
    assert items(audio)[2] == {"type": "inline_data.done", "data": bytes([1, 2, 3]), "mime_type": "audio/L16"}

    def image(data: bytes) -> UniEvent:
        return delta(with_id("0", {"type": "inline_data.delta", "data": data, "mime_type": "image/png"}))

    images = await collect([image(bytes([1])), image(bytes([2])), FINISH])
    assert_stream_grammar(images)
    assert [item["type"] for item in items(images)] == [
        "inline_data.delta",
        "inline_data.done",
        "inline_data.delta",
        "inline_data.done",
    ]

    embeddings = await collect(
        [
            delta({"type": "embedding.delta", "embedding": [0.1]}),
            delta({"type": "embedding.delta", "embedding": [0.2]}),
            FINISH,
        ]
    )
    assert_stream_grammar(embeddings)
    assert items(embeddings) == [
        {"type": "embedding.delta", "embedding": [0.1]},
        {"type": "embedding.done", "embedding": [0.1]},
        {"type": "embedding.delta", "embedding": [0.2]},
        {"type": "embedding.done", "embedding": [0.2]},
    ]


@pytest.mark.asyncio
async def test_usage_pieces_merge_field_by_field():
    events = await collect(
        [
            delta(with_id("0", {"type": "text.delta", "text": "a"})),
            stop({"cached_tokens": 3, "prompt_tokens": 7, "thoughts_tokens": None, "response_tokens": None}, None),
            stop(
                {"cached_tokens": None, "prompt_tokens": None, "thoughts_tokens": None, "response_tokens": 9}, "length"
            ),
        ]
    )

    assert events[-1]["usage_metadata"] == {
        "cached_tokens": 3,
        "prompt_tokens": 7,
        "thoughts_tokens": None,
        "response_tokens": 9,
    }
    assert events[-1]["finish_reason"] == "length"


@pytest.mark.asyncio
async def test_item_id_never_reaches_the_public_stream_the_message_or_the_history():
    client = ScriptedClient(
        [
            delta(with_id("0", {"type": "thinking.delta", "thinking": "a", "fidelity": {"signature": "s"}})),
            delta(with_id("1", {"type": "text.delta", "text": "b"})),
            FINISH,
        ]
    )
    events = [event async for event in client.streaming_response_stateful(message=USER, config={})]

    assert_stream_grammar(events)
    assert items(events) == [
        {"type": "thinking.delta", "thinking": "a", "fidelity": {"signature": "s"}},
        {"type": "thinking.done", "thinking": "a", "fidelity": {"signature": "s"}},
        {"type": "text.delta", "text": "b"},
        {"type": "text.done", "text": "b"},
    ]
    assert '"item_id"' not in json.dumps(client.concat_uni_events_to_uni_message(events))
    assert '"item_id"' not in json.dumps(client.get_history())


@pytest.mark.asyncio
async def test_an_event_carries_several_items_in_wire_order():
    # Responses reasoning: the fidelity arrives with the item's end
    reasoning = await collect(
        [
            delta(with_id("rs_1", {"type": "thinking.delta", "thinking": "Plan"})),
            delta(
                with_id("rs_1", {"type": "thinking.delta", "thinking": "", "fidelity": {"encrypted_content": "enc"}})
            ),
            delta(with_id("msg_1", {"type": "text.delta", "text": "Done"})),
            FINISH,
        ]
    )
    assert_stream_grammar(reasoning)
    assert items(reasoning) == [
        {"type": "thinking.delta", "thinking": "Plan"},
        {"type": "thinking.delta", "thinking": "", "fidelity": {"encrypted_content": "enc"}},
        {"type": "thinking.done", "thinking": "Plan", "fidelity": {"encrypted_content": "enc"}},
        {"type": "text.delta", "text": "Done"},
        {"type": "text.done", "text": "Done"},
    ]

    # Chat Completions: a chunk may end the reasoning and begin the answer, and the last content
    # chunk carries the finish reason, while the usage follows in a chunk of its own
    chat = await collect(
        [
            delta(
                with_id("reasoning", {"type": "thinking.delta", "thinking": "Hmm"}),
                with_id("content", {"type": "text.delta", "text": "Hel"}),
            ),
            stop(None, "stop", [with_id("content", {"type": "text.delta", "text": "lo"})]),
            stop(USAGE, None),
        ]
    )
    assert_stream_grammar(chat)
    assert items(chat) == [
        {"type": "thinking.delta", "thinking": "Hmm"},
        {"type": "thinking.done", "thinking": "Hmm"},
        {"type": "text.delta", "text": "Hel"},
        {"type": "text.delta", "text": "lo"},
        {"type": "text.done", "text": "Hello"},
    ]
    assert chat[-1]["usage_metadata"] == USAGE
    assert chat[-1]["finish_reason"] == "stop"


@pytest.mark.asyncio
async def test_fidelity_sent_alone_under_the_items_id_is_that_items_whatever_kind_carries_it():
    # an Interactions thought step: an image, then the signature the step ends with
    events = await collect(
        [
            delta(with_id("0", {"type": "inline_thinking.delta", "data": b"draft", "mime_type": "image/png"})),
            delta(with_id("0", {"type": "thinking.delta", "thinking": "", "fidelity": {"signature": "sig"}})),
            delta(with_id("1", {"type": "text.delta", "text": "ok"})),
            FINISH,
        ]
    )

    assert_stream_grammar(events)
    assert items(events)[:3] == [
        {"type": "inline_thinking.delta", "data": b"draft", "mime_type": "image/png"},
        {"type": "inline_thinking.delta", "data": b"", "mime_type": "image/png", "fidelity": {"signature": "sig"}},
        {"type": "inline_thinking.done", "data": b"draft", "mime_type": "image/png", "fidelity": {"signature": "sig"}},
    ]


@pytest.mark.asyncio
async def test_embedding_vectors_need_no_item_id():
    events = await collect(
        [
            stop(
                USAGE,
                "stop",
                [
                    {"type": "embedding.delta", "embedding": [0.1, 0.2]},
                    {"type": "embedding.delta", "embedding": [0.3, 0.4]},
                ],
            )
        ]
    )

    assert_stream_grammar(events)
    assert items(events) == [
        {"type": "embedding.delta", "embedding": [0.1, 0.2]},
        {"type": "embedding.done", "embedding": [0.1, 0.2]},
        {"type": "embedding.delta", "embedding": [0.3, 0.4]},
        {"type": "embedding.done", "embedding": [0.3, 0.4]},
    ]


def _embedding_client(data: list[Any]) -> AutoLLMClient:
    """An embedding client whose endpoint answers every request with `data`."""
    client = AutoLLMClient(model="text-embedding-3-large", api_key="test-key", client_type="openai-embedding")

    async def create(**params: Any) -> SimpleNamespace:
        return SimpleNamespace(data=data, usage=SimpleNamespace(prompt_tokens=4))

    client._client._client = SimpleNamespace(embeddings=SimpleNamespace(create=create))  # noqa: SLF001
    return client


@pytest.mark.asyncio
async def test_embedding_vectors_pair_with_their_messages_by_index():
    # the endpoint answers out of order: each vector names the input it belongs to by its index
    client = _embedding_client(
        [SimpleNamespace(index=1, embedding=[0.3, 0.4]), SimpleNamespace(index=0, embedding=[0.1, 0.2])]
    )
    messages = [
        {"role": "user", "content_items": [{"type": "text.done", "text": "first"}]},
        {"role": "user", "content_items": [{"type": "text.done", "text": "second"}]},
    ]

    events = [event async for event in client.streaming_response(messages=messages, config={})]

    assert [item["embedding"] for item in items(events) if item["type"] == "embedding.done"] == [
        [0.1, 0.2],
        [0.3, 0.4],
    ]


def test_an_embedding_message_without_text_raises_invalid_message_error():
    client = _embedding_client([])

    with pytest.raises(InvalidMessageError) as exc_info:
        client.transform_uni_message_to_model_input(
            [
                {"role": "user", "content_items": [{"type": "text.done", "text": "first"}]},
                {"role": "user", "content_items": [{"type": "text.done", "text": ""}]},
            ]
        )

    assert exc_info.value.client == "OpenaiEmbeddingClient"
    assert exc_info.value.message_index == 1
    assert str(exc_info.value) == "message 1 has nothing OpenaiEmbeddingClient can send"


@pytest.mark.asyncio
async def test_an_empty_delta_event_and_a_stop_event_carrying_nothing_are_ignored():
    events = await collect(
        [
            delta(),
            delta(with_id("0", {"type": "text.delta", "text": "a"})),
            FINISH,
            stop(None, None),
            delta(),
        ]
    )

    assert_stream_grammar(events)
    assert items(events) == [{"type": "text.delta", "text": "a"}, {"type": "text.done", "text": "a"}]
    assert events[-1]["usage_metadata"] == USAGE
    assert events[-1]["finish_reason"] == "stop"


@pytest.mark.asyncio
async def test_an_item_no_delta_of_which_went_out_has_no_done_item():
    events = await collect(
        [
            delta(with_id("msg_1", {"type": "text.delta", "text": ""})),
            delta(with_id("msg_2", {"type": "text.delta", "text": "a"})),
            FINISH,
        ]
    )

    assert_stream_grammar(events)
    assert items(events) == [{"type": "text.delta", "text": "a"}, {"type": "text.done", "text": "a"}]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "script",
    [
        pytest.param(
            [
                delta(with_id("0", {"type": "text.delta", "text": "a"})),
                delta({"type": "text.done", "text": "a"}),
            ],
            id="a done item: a client yields deltas only",
        ),
        pytest.param(
            [
                delta(with_id("0", {"type": "thinking.delta", "thinking": "a", "fidelity": {"signature": "1"}})),
                delta(with_id("0", {"type": "thinking.delta", "thinking": "", "fidelity": {"signature": "2"}})),
            ],
            id="two different fidelity payloads in one item",
        ),
        pytest.param(
            [delta(with_id("0", {"type": "tool_call.delta", "name": "f", "arguments": "{}", "tool_call_id": ""}))],
            id="a tool call whose first fragment has no tool_call_id",
        ),
        pytest.param(
            [
                delta(with_id("0", {"type": "text.delta", "text": "a"})),
                delta(with_id("1", {"type": "tool_call.delta", "name": "", "arguments": "{}", "tool_call_id": ""})),
            ],
            id="arguments with no call streaming",
        ),
        pytest.param(
            [{**delta(with_id("0", {"type": "text.delta", "text": "a"})), "finish_reason": "stop"}],
            id="a delta event carrying a finish reason",
        ),
    ],
)
async def test_stream_protocol_violation_raises_stream_protocol_error(script: list[UniEvent]):
    with pytest.raises(StreamProtocolError):
        await collect([*script, FINISH])


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "usage, finish, missing, message",
    [
        pytest.param(
            None,
            "stop",
            ("usage_metadata",),
            "ScriptedClient's stream ended without usage_metadata.",
            id="usage_metadata",
        ),
        pytest.param(
            USAGE,
            None,
            ("finish_reason",),
            "ScriptedClient's stream ended without finish_reason.",
            id="finish_reason",
        ),
        pytest.param(
            None,
            None,
            ("usage_metadata", "finish_reason"),
            "ScriptedClient's stream ended without usage_metadata and finish_reason.",
            id="both",
        ),
    ],
)
async def test_a_stream_without_usage_or_finish_reason_raises_incomplete_stream_error_in_place_of_the_stop_event(
    usage: UsageMetadata | None, finish: FinishReason | None, missing: tuple[str, ...], message: str
):
    events: list[UniEvent] = []
    client = ScriptedClient([delta(with_id("0", {"type": "text.delta", "text": "a"})), stop(usage, finish)])

    with pytest.raises(IncompleteStreamError) as exc_info:
        async for event in client.streaming_response_stateful(message=USER, config={}):
            events.append(event)

    assert exc_info.value.client == "ScriptedClient"
    assert exc_info.value.missing == missing
    assert exc_info.value.usage_metadata == usage
    assert exc_info.value.finish_reason == finish
    assert str(exc_info.value) == message
    assert items(events) == [{"type": "text.delta", "text": "a"}, {"type": "text.done", "text": "a"}]
    assert not any(event["event_type"] == "stop" for event in events)
    assert client.get_history() == []


@pytest.mark.asyncio
async def test_a_thinking_only_response_raises_empty_response_error_carrying_its_usage():
    with pytest.raises(EmptyResponseError) as exc_info:
        await collect([delta(with_id("0", {"type": "thinking.delta", "thinking": "hmm"})), FINISH])

    assert exc_info.value.usage_metadata == USAGE
    assert exc_info.value.finish_reason == "stop"


@pytest.mark.asyncio
async def test_malformed_tool_call_arguments_raise_when_the_call_is_done():
    with pytest.raises(ToolCallArgumentParseError):
        await collect(
            [
                delta(
                    with_id("0", {"type": "tool_call.delta", "name": "f", "arguments": '{"a":', "tool_call_id": "c"})
                ),
                FINISH,
            ]
        )


@pytest.mark.asyncio
async def test_a_whole_tool_call_reaches_the_caller_before_its_malformed_arguments_fail():
    call = {"type": "tool_call.delta", "name": "f", "arguments": '{"a":', "tool_call_id": "c"}
    events: list[UniEvent] = []
    client = ScriptedClient([delta(with_id("0", call)), FINISH])

    with pytest.raises(ToolCallArgumentParseError):
        async for event in client.streaming_response(messages=[USER], config={}):
            events.append(event)

    assert items(events) == [call]


REPLY: list[UniEvent] = [delta(with_id("0", {"type": "text.delta", "text": "hello"})), FINISH]


@pytest.mark.asyncio
async def test_stateful_history_is_recorded_even_when_the_caller_stops_at_the_stop_event():
    client = ScriptedClient(REPLY)
    async for event in client.streaming_response_stateful(message=USER, config={}):
        if event["event_type"] == "stop":
            break

    history = client.get_history()
    assert len(history) == 2
    assert history[1]["role"] == "assistant"
    assert history[1]["content_items"] == [{"type": "text.done", "text": "hello"}]
    assert history[1]["usage_metadata"] == USAGE
    assert history[1]["finish_reason"] == "stop"


def _user(text: str, **fields: Any) -> UniMessage:
    return {"role": "user", "content_items": [{"type": "text.done", "text": text}], **fields}


@pytest.mark.asyncio
async def test_the_callers_messages_gain_their_created_at_and_nothing_else():
    messages = [_user("earlier", created_at=1), _user("unset", created_at=None), _user("hi")]
    before = copy.deepcopy(messages)

    async for _event in ScriptedClient(REPLY).streaming_response(messages=messages, config={}):
        pass

    assert messages[0] == before[0]
    for message, original in zip(messages[1:], before[1:]):
        assert isinstance(message["created_at"], int)
        assert {**message, "created_at": None} == {**original, "created_at": None}

    message = _user("hi")
    async for _event in ScriptedClient(REPLY).streaming_response_stateful(message=message, config={}):
        pass

    assert isinstance(message.pop("created_at"), int)
    assert message == _user("hi")


@pytest.mark.asyncio
async def test_the_history_shares_no_object_with_the_caller_or_the_stream():
    client = ScriptedClient(REPLY)
    message: UniMessage = {
        "role": "user",
        "content_items": [
            {"type": "text.done", "text": "hi"},
            {"type": "inline_data.done", "data": b"\x89PNG", "mime_type": "image/png"},
        ],
    }
    events = [event async for event in client.streaming_response_stateful(message=message, config={})]
    expected = client.get_history()

    # whatever the caller holds, it changes nothing the client recorded
    message["content_items"][0]["text"] = "changed"
    message["content_items"].append({"type": "text.done", "text": "added"})
    next(item for item in items(events) if item["type"] == "text.done")["text"] = "changed"
    returned = client.get_history()
    returned[0]["content_items"].clear()
    returned[1]["content_items"][0]["text"] = "changed"

    assert client.get_history() == expected
    assert expected[0]["content_items"] == [
        {"type": "text.done", "text": "hi"},
        {"type": "inline_data.done", "data": b"\x89PNG", "mime_type": "image/png"},
    ]
    assert expected[1]["content_items"] == [{"type": "text.done", "text": "hello"}]

    given = [_user("Hi"), {"role": "assistant", "content_items": [{"type": "text.done", "text": "Hello!"}]}]
    client.set_history(given)
    given[0]["content_items"][0]["text"] = "changed"
    given[1]["content_items"].clear()

    assert client.get_history() == [
        _user("Hi"),
        {"role": "assistant", "content_items": [{"type": "text.done", "text": "Hello!"}]},
    ]


@pytest.mark.asyncio
async def test_a_second_stateful_call_while_one_is_in_flight_raises_concurrent_call_error():
    client = ScriptedClient(REPLY)
    first = client.streaming_response_stateful(message=_user("one"), config={})
    await anext(first)

    with pytest.raises(ConcurrentCallError) as exc_info:
        await anext(client.streaming_response_stateful(message=_user("two"), config={}))

    assert exc_info.value.client == "ScriptedClient"
    assert str(exc_info.value) == "ScriptedClient has a stateful call in flight; wait for its stop event or its error."
    assert client.get_history() == []
    assert len(client.sent_messages) == 1
    # a stateless call keeps no history, so it runs beside a stateful one
    assert [event async for event in client.streaming_response(messages=[_user("aside")], config={})]

    async for _event in first:
        pass
    assert [message["content_items"][0]["text"] for message in client.get_history()] == ["one", "hello"]

    # the turn has ended at its stop event, before its generator is closed
    second = client.streaming_response_stateful(message=_user("two"), config={})
    async for event in second:
        if event["event_type"] == "stop":
            break
    third = client.streaming_response_stateful(message=_user("three"), config={})
    await anext(third)
    # closing the earlier generator late leaves the call in flight holding the client
    await second.aclose()
    with pytest.raises(ConcurrentCallError):
        await anext(client.streaming_response_stateful(message=_user("four"), config={}))
    async for _event in third:
        pass

    assert len(client.get_history()) == 6


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "reads",
    [1, 2],
    ids=["aborted mid-stream", "aborted once the provider's stream ended, before the stop event"],
)
async def test_an_aborted_stateful_call_releases_the_client_at_once_and_records_nothing(reads: int):
    client = ScriptedClient(REPLY)
    signal = AbortSignal()
    first = client.streaming_response_stateful(message=_user("one"), config={}, signal=signal)
    for _ in range(reads):
        await anext(first)

    # the playground's next turn: the abort, then at once the next stateful call
    signal.abort("replaced")
    async for _event in client.streaming_response_stateful(message=_user("two"), config={}):
        pass

    with pytest.raises(asyncio.CancelledError) as exc_info:
        async for _event in first:
            pass

    assert exc_info.value.args == ("replaced",)
    assert [message["content_items"][0]["text"] for message in client.get_history()] == ["two", "hello"]


@pytest.mark.asyncio
async def test_closing_a_stateful_stream_closes_the_clients_stream_before_it_returns():
    closed: list[bool] = []

    class TrackedClient(ScriptedClient):
        async def _streaming_response_internal(
            self,
            messages: list[UniMessage],
            config: UniConfig,
        ) -> AsyncIterator[UniEvent]:
            try:
                async for event in super()._streaming_response_internal(messages, config):
                    yield event
            finally:
                closed.append(True)

    stream = TrackedClient(REPLY).streaming_response_stateful(message=_user("one"), config={})
    await anext(stream)
    await stream.aclose()

    assert closed == [True]


@pytest.mark.asyncio
async def test_a_stateful_call_that_fails_releases_the_client():
    client = ScriptedClient([delta(with_id("0", {"type": "text.delta", "text": "a"})), stop(USAGE, None)])

    for _ in range(2):
        with pytest.raises(IncompleteStreamError):
            async for _event in client.streaming_response_stateful(message=USER, config={}):
                pass

    assert client.get_history() == []


@pytest.mark.asyncio
async def test_a_stateful_conversation_continues_the_history_it_was_given():
    first = _user("Hi", created_at=1)
    answer = {"role": "assistant", "content_items": [{"type": "text.done", "text": "Hello!"}], "created_at": 2}
    client = ScriptedClient(REPLY)
    client.set_history([first, answer])

    turns = []
    for message in (_user("one"), _user("two")):
        events = [event async for event in client.streaming_response_stateful(message=message, config={})]
        turns.append((message, client.concat_uni_events_to_uni_message(events)))

    (one, reply_one), (two, reply_two) = turns
    assert client.get_history() == [first, answer, one, reply_one, two, reply_two]
    # each request carried the whole history ahead of its message
    assert client.sent_messages == [[first, answer, one], [first, answer, one, reply_one, two]]


@pytest.mark.asyncio
@pytest.mark.filterwarnings("ignore::FutureWarning")
@pytest.mark.parametrize(
    "content_items",
    [[], [{"type": "partial_tool_call", "name": "", "arguments": "", "tool_call_id": ""}]],
    ids=["empty", "empty once normalized"],
)
async def test_a_message_without_content_items_raises_invalid_message_error_before_anything_is_sent(
    content_items: list[Any],
):
    client = ScriptedClient(REPLY)
    events: list[UniEvent] = []

    with pytest.raises(InvalidMessageError) as exc_info:
        async for event in client.streaming_response(
            messages=[USER, {"role": "assistant", "content_items": content_items}], config={}
        ):
            events.append(event)

    assert exc_info.value.client == "ScriptedClient"
    assert exc_info.value.message_index == 1
    assert str(exc_info.value) == "message 1 has nothing ScriptedClient can send"
    assert events == []
    assert client.sent_messages == []


@pytest.mark.asyncio
@pytest.mark.parametrize("trace_id", ["../outside", "agent/..", "{tmp_path}/outside"])
async def test_a_trace_id_outside_the_cache_directory_raises_unsupported_parameter_error_before_anything_is_sent(
    trace_id: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("MMSP_CACHE_DIR", str(tmp_path / "cache"))
    trace_id = trace_id.format(tmp_path=tmp_path)
    client = ScriptedClient(REPLY)
    events: list[UniEvent] = []

    with pytest.raises(UnsupportedParameterError) as exc_info:
        async for event in client.streaming_response(messages=[USER], config={"trace_id": trace_id}):
            events.append(event)

    assert exc_info.value.client == "ScriptedClient"
    assert exc_info.value.parameter == "trace_id"
    assert str(exc_info.value).startswith(f"ScriptedClient does not support trace_id '{trace_id}'")
    assert events == []
    assert client.sent_messages == []
    assert [path.name for path in tmp_path.rglob("*")] == ["cache"]


@pytest.mark.asyncio
async def test_concat_uni_events_to_uni_message_keeps_the_done_items_and_the_stop_events_metadata():
    events = await collect(REPLY)
    message = ScriptedClient([]).concat_uni_events_to_uni_message(events)

    assert message["role"] == "assistant"
    assert message["content_items"] == [{"type": "text.done", "text": "hello"}]
    assert message["usage_metadata"] == USAGE
    assert message["finish_reason"] == "stop"
    assert message["created_at"] == events[-1]["created_at"]


@pytest.mark.asyncio
async def test_legacy_content_item_types_are_converted_before_a_request_and_in_set_history(
    monkeypatch: pytest.MonkeyPatch,
):
    # the deprecation warning goes out once per process, so an earlier conversion must not swallow it here
    monkeypatch.setattr(legacy, "_warned", False)
    legacy_message = {
        "role": "user",
        "content_items": [
            {"type": "text", "text": "hi"},
            {"type": "tool_result", "text": "22 C", "tool_call_id": "call_1"},
            {"type": "partial_tool_call", "name": "", "arguments": "", "tool_call_id": ""},
        ],
    }

    client = ScriptedClient(REPLY)
    with pytest.warns(FutureWarning, match="0.6.0") as warnings_record:
        async for _event in client.streaming_response(messages=[legacy_message], config={}):
            pass
        client.set_history([legacy_message])

    assert len([warning for warning in warnings_record if warning.category is FutureWarning]) == 1
    assert client.sent_messages[0][0]["content_items"] == [
        {"type": "text.done", "text": "hi"},
        {"type": "tool_result.done", "text": "22 C", "tool_call_id": "call_1"},
    ]
    # the caller's message is left as it was
    assert legacy_message["content_items"][0]["type"] == "text"
    assert client.get_history()[0]["content_items"][0]["type"] == "text.done"

    current = [USER]
    assert normalize_legacy_messages(current)[0] is USER
