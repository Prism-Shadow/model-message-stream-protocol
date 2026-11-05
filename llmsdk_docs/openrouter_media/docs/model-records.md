> Sources: the public model APIs and model pages of openrouter.ai, read 2026-11-04 without a key.

# OpenRouter model records

| Model | Request path | Price (model page) | Streaming |
| - | - | - | - |
| `bytedance-seed/seedream-5-0-flash` | `/api/v1/images` | $0.018 per output image, input images free | `supports_streaming: false` |
| `fish-audio/drama-3` | `/api/v1/audio/speech` | $2.00 per M UTF-8 bytes of input (80% off $10.00, launch promotion) | raw audio bytes |
| `fish-audio/transcribe-1` | `/api/v1/audio/transcriptions` | $0.0001 per second of input audio | JSON only |

`fish-audio/drama-3` and `fish-audio/transcribe-1` list `supported_voices: null` and no `supported_parameters`; the voice is a Fish Audio voice model id (see `fish-audio-drama-3.md`).

## `GET /api/v1/images/models/bytedance-seed/seedream-5-0-flash/endpoints`

```json
{
  "id": "bytedance-seed/seedream-5-0-flash",
  "endpoints": [
    {
      "provider_name": "Seed",
      "provider_slug": "seed",
      "provider_tag": "seed",
      "supported_parameters": {
        "resolution": {
          "type": "enum",
          "values": [
            "1K",
            "2K"
          ]
        },
        "aspect_ratio": {
          "type": "enum",
          "values": [
            "1:1",
            "1:2",
            "2:1",
            "2:3",
            "3:2",
            "3:4",
            "4:3",
            "4:5",
            "5:4",
            "9:16",
            "16:9",
            "9:19.5",
            "19.5:9",
            "9:20",
            "20:9",
            "9:21",
            "21:9",
            "auto"
          ]
        },
        "n": {
          "type": "range",
          "min": 1,
          "max": 1
        },
        "input_references": {
          "type": "range",
          "min": 0,
          "max": 14
        },
        "seed": {
          "type": "boolean"
        }
      },
      "allowed_passthrough_parameters": [],
      "supports_streaming": false,
      "pricing": [
        {
          "billable": "output_image",
          "unit": "image",
          "cost_usd": 0.018
        },
        {
          "billable": "input_image",
          "unit": "image",
          "cost_usd": 0
        }
      ]
    }
  ]
}
```

## `GET /api/v1/models/bytedance-seed/seedream-5-0-flash/endpoints`

```json
{
  "data": {
    "id": "bytedance-seed/seedream-5-0-flash",
    "name": "ByteDance Seed: Seedream 5.0 Flash",
    "created": 1790889880,
    "description": "Seedream 5.0 Flash is an image generation and editing model from ByteDance Seed. It is the fast, cost-efficient tier of the Seedream 5.0 family, suited for high-volume production and interactive...",
    "architecture": {
      "tokenizer": "Media",
      "instruct_type": null,
      "modality": "text+image->image",
      "input_modalities": [
        "text",
        "image"
      ],
      "output_modalities": [
        "image"
      ]
    },
    "endpoints": [
      {
        "name": "Seed | bytedance-seed/seedream-5-0-flash-20261001",
        "model_id": "bytedance-seed/seedream-5-0-flash",
        "model_name": "ByteDance Seed: Seedream 5.0 Flash",
        "context_length": 0,
        "pricing": {
          "prompt": "0",
          "completion": "0",
          "image": "0",
          "image_token": "0.00000431137724550898",
          "image_output": "0.00000431137724550898",
          "discount": 0
        },
        "provider_name": "Seed",
        "tag": "seed",
        "service_tier": null,
        "quantization": "unknown",
        "max_completion_tokens": 0,
        "max_prompt_tokens": null,
        "supported_parameters": [
          "frequency_penalty",
          "max_tokens",
          "temperature",
          "top_p"
        ],
        "supports_tool_choice": {
          "none": true,
          "auto": true,
          "required": true,
          "function": true
        },
        "status": 0,
        "uptime_last_30m": 100,
        "uptime_last_5m": 100,
        "uptime_last_1d": 100,
        "supports_implicit_caching": false,
        "native_tools": {},
        "supports_voice_cloning": false,
        "supports_multiple_audio_references": false,
        "supports_image_reference": false,
        "supports_diarization": false,
        "latency_last_30m": null,
        "throughput_last_30m": null
      }
    ]
  }
}
```

## `GET /api/v1/models?output_modalities=speech` (the `fish-audio/drama-3` entry)

```json
{
  "id": "fish-audio/drama-3",
  "canonical_slug": "fish-audio/drama-3-20261013",
  "hugging_face_id": null,
  "name": "Fish Audio: Drama 3",
  "created": 1791910176,
  "description": "Drama 3 is a text-to-speech model from Fish Audio built for directed voice performances. You write the direction in plain language in square brackets before a line, such as `[nervous,...",
  "context_length": 0,
  "architecture": {
    "modality": "text->speech",
    "input_modalities": [
      "text"
    ],
    "output_modalities": [
      "speech"
    ],
    "tokenizer": "Other",
    "instruct_type": null
  },
  "pricing": {
    "prompt": "0.000002",
    "completion": "0"
  },
  "top_provider": {
    "context_length": 0,
    "max_completion_tokens": 0,
    "is_moderated": false
  },
  "per_request_limits": null,
  "supported_parameters": [],
  "default_parameters": {},
  "supported_voices": null,
  "knowledge_cutoff": null,
  "expiration_date": null,
  "links": {
    "details": "/api/v1/models/fish-audio/drama-3-20261013/endpoints"
  },
  "endpoints": [
    "/api/v1/audio/speech"
  ],
  "benchmarks": {
    "design_arena": [
      {
        "arena": "models",
        "category": "audiorealism",
        "elo": 958,
        "win_rate": 34.2,
        "rank": 4
      }
    ]
  }
}
```

## `GET /api/v1/models/fish-audio/drama-3/endpoints`

```json
{
  "data": {
    "id": "fish-audio/drama-3",
    "name": "Fish Audio: Drama 3",
    "created": 1791910176,
    "description": "Drama 3 is a text-to-speech model from Fish Audio built for directed voice performances. You write the direction in plain language in square brackets before a line, such as `[nervous,...",
    "architecture": {
      "tokenizer": "Other",
      "instruct_type": null,
      "modality": "text->speech",
      "input_modalities": [
        "text"
      ],
      "output_modalities": [
        "speech"
      ]
    },
    "endpoints": [
      {
        "name": "Fish Audio | fish-audio/drama-3-20261013",
        "model_id": "fish-audio/drama-3",
        "model_name": "Fish Audio: Drama 3",
        "context_length": 0,
        "pricing": {
          "prompt": "0.000002",
          "completion": "0",
          "discount": 0.8
        },
        "provider_name": "Fish Audio",
        "tag": "fish-audio",
        "service_tier": null,
        "quantization": "unknown",
        "max_completion_tokens": 0,
        "max_prompt_tokens": null,
        "supported_parameters": [],
        "supports_tool_choice": {
          "none": true,
          "auto": true,
          "required": true,
          "function": true
        },
        "status": 0,
        "uptime_last_30m": 100,
        "uptime_last_5m": 100,
        "uptime_last_1d": 99.79050279329608,
        "supports_implicit_caching": false,
        "native_tools": {},
        "supports_voice_cloning": true,
        "supports_multiple_audio_references": false,
        "supports_image_reference": false,
        "supports_diarization": false,
        "latency_last_30m": null,
        "throughput_last_30m": null
      }
    ]
  }
}
```

## `GET /api/v1/models?output_modalities=transcription` (the `fish-audio/transcribe-1` entry)

```json
{
  "id": "fish-audio/transcribe-1",
  "canonical_slug": "fish-audio/transcribe-1-20260729",
  "hugging_face_id": null,
  "name": "Fish Audio: Transcribe 1",
  "created": 1785353735,
  "description": "Transcribe 1 is a speech-to-text model from Fish Audio. It is suited for audio transcription with automatic language detection and can return timestamped word-level segments when alignment details are requested.",
  "context_length": 0,
  "architecture": {
    "modality": "audio->transcription",
    "input_modalities": [
      "audio"
    ],
    "output_modalities": [
      "transcription"
    ],
    "tokenizer": "Other",
    "instruct_type": null
  },
  "pricing": {
    "prompt": "0.0001",
    "completion": "0"
  },
  "top_provider": {
    "context_length": 0,
    "max_completion_tokens": 0,
    "is_moderated": false
  },
  "per_request_limits": null,
  "supported_parameters": [],
  "default_parameters": {},
  "supported_voices": null,
  "knowledge_cutoff": null,
  "expiration_date": null,
  "links": {
    "details": "/api/v1/models/fish-audio/transcribe-1-20260729/endpoints"
  },
  "endpoints": [
    "/api/v1/audio/transcriptions"
  ]
}
```

## `GET /api/v1/models/fish-audio/transcribe-1/endpoints`

```json
{
  "data": {
    "id": "fish-audio/transcribe-1",
    "name": "Fish Audio: Transcribe 1",
    "created": 1785353735,
    "description": "Transcribe 1 is a speech-to-text model from Fish Audio. It is suited for audio transcription with automatic language detection and can return timestamped word-level segments when alignment details are requested.",
    "architecture": {
      "tokenizer": "Other",
      "instruct_type": null,
      "modality": "audio->transcription",
      "input_modalities": [
        "audio"
      ],
      "output_modalities": [
        "transcription"
      ]
    },
    "endpoints": [
      {
        "name": "Fish Audio | fish-audio/transcribe-1-20260729",
        "model_id": "fish-audio/transcribe-1",
        "model_name": "Fish Audio: Transcribe 1",
        "context_length": 0,
        "pricing": {
          "prompt": "0.0001",
          "completion": "0",
          "discount": 0
        },
        "provider_name": "Fish Audio",
        "tag": "fish-audio",
        "service_tier": null,
        "quantization": "unknown",
        "max_completion_tokens": 0,
        "max_prompt_tokens": null,
        "supported_parameters": [],
        "supports_tool_choice": {
          "none": true,
          "auto": true,
          "required": true,
          "function": true
        },
        "status": 0,
        "uptime_last_30m": null,
        "uptime_last_5m": null,
        "uptime_last_1d": 100,
        "supports_implicit_caching": false,
        "native_tools": {},
        "supports_voice_cloning": false,
        "supports_multiple_audio_references": false,
        "supports_image_reference": false,
        "supports_diarization": false,
        "latency_last_30m": null,
        "throughput_last_30m": null
      }
    ]
  }
}
```
