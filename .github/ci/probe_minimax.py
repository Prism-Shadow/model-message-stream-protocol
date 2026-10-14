"""Temporary capture for PR #255; no credentials or HTTP headers are recorded."""

import asyncio
import json
from collections import Counter
from pathlib import Path

from mmsp import ThinkingLevel
from mmsp.minimax_official import MiniMaxOfficialClient


OUTPUT = Path("../api_captures/minimax_ci_255")
TOOL = {
    "name": "get_weather",
    "description": "Get the current weather in a given location",
    "parameters": {
        "type": "object",
        "properties": {
            "location": {"type": "string", "description": "The city name, e.g. San Francisco"},
        },
        "required": ["location"],
    },
}


class CaptureClient(MiniMaxOfficialClient):
    def transform_model_output_to_uni_event(self, model_output):
        with self.capture_path.with_suffix(".stream.jsonl").open("a") as handle:
            handle.write(json.dumps(model_output.model_dump(exclude_unset=True), ensure_ascii=False) + "\n")
        self.wire_events.append(model_output.model_dump(exclude_unset=True))
        return super().transform_model_output_to_uni_event(model_output)

    async def _streaming_response_internal(self, messages, config):
        self.capture_path.with_suffix(".request.json").write_text(
            json.dumps(
                {
                    **self.transform_uni_config_to_model_config(config),
                    "input": self.transform_uni_message_to_model_input(messages),
                    "stream": True,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        async for event in super()._streaming_response_internal(messages, config):
            yield event


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    summaries = []
    for index in range(10):
        profile = "baseline" if index < 6 else "thinking" if index < 8 else "explicit_prompt"
        config = {"tools": [TOOL]}
        prompt = "What is the weather in San Francisco?"
        if profile == "thinking":
            config["thinking_level"] = ThinkingLevel.HIGH
        elif profile == "explicit_prompt":
            prompt = "Call get_weather for San Francisco to retrieve the current weather. Do not answer without using the tool."
        client = CaptureClient(model="MiniMax-M3")
        try:
            client.capture_path = OUTPUT / f"{index:02d}-{profile}-round1"
            client.wire_events = []
            events = [
                event
                async for event in client.streaming_response_stateful(
                    message={"role": "user", "content_items": [{"type": "text.done", "text": prompt}]},
                    config=config,
                )
            ]
            client.capture_path.with_suffix(".universal.json").write_text(
                json.dumps(events, ensure_ascii=False, indent=2)
            )
            calls = [item for event in events for item in event["content_items"] if item["type"] == "tool_call.done"]
            summary = {
                "index": index,
                "profile": profile,
                "wire_types": dict(Counter(event["type"] for event in client.wire_events)),
                "wire_calls": [
                    event["item"]
                    for event in client.wire_events
                    if event["type"] == "response.output_item.done" and event["item"]["type"] == "function_call"
                ],
                "universal_calls": calls,
                "text": "".join(
                    item["text"] for event in events for item in event["content_items"] if item["type"] == "text.done"
                ),
            }
            summaries.append(summary)
            print(json.dumps(summary, ensure_ascii=False), flush=True)
            if calls:
                client.capture_path = OUTPUT / f"{index:02d}-{profile}-round2"
                replay = [
                    event
                    async for event in client.streaming_response_stateful(
                        message={
                            "role": "user",
                            "content_items": [
                                {
                                    "type": "tool_result.done",
                                    "text": "It's 20 degrees in San Francisco.",
                                    "tool_call_id": call["tool_call_id"],
                                }
                                for call in calls
                            ],
                        },
                        config=config,
                    )
                ]
                client.capture_path.with_suffix(".universal.json").write_text(
                    json.dumps(replay, ensure_ascii=False, indent=2)
                )
        finally:
            await client._client.close()
    (OUTPUT / "summary.json").write_text(json.dumps(summaries, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
