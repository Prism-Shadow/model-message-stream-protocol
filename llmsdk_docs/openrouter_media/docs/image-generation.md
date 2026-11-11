> Source: https://openrouter.ai/docs/guides/overview/multimodal/image-generation.md (fetched 2026-11-04)

> ## Documentation Index
> Fetch the complete documentation index at: https://openrouter.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Image Generation

> How to generate images with OpenRouter's dedicated Image API

OpenRouter provides a dedicated Image API for generating images from text prompts (and optional reference images). The API covers model discovery, per-endpoint capabilities, and generation. You can browse available models and pricing on the [models page filtered by image output](https://openrouter.ai/models?output_modalities=image).

![A contemporary neighborhood storefront at blue hour, lit by a warm-white cursive neon sign reading OpenRouter, with plants and a bicycle by the entrance and light reflecting off wet pavement](https://model-assets.openrouter.ai/model-examples/openai/gpt-image-2/a5e8605c-e799-4bfa-811b-3afb065e0350/original-0.png)

Generated with openai/gpt-image-2 — 16:9, high quality

> [accordion] Prompt and parameters
>
> > Editorial architectural photograph of a contemporary neighborhood storefront at blue hour, glowing warmly against the dusk. Above the entrance, a warm-white neon sign in flowing hand-bent cursive reads exactly "OpenRouter", the only text in the scene. Large windows reveal a cozy, lived-in interior: wood shelves styled with books and ceramics, lush trailing plants, and soft pendant lighting. Potted plants and a bicycle rest by the entrance, and golden light spills across the wet pavement in gentle reflections. Straight-on composition, realistic materials, quiet street with no people.
>
> * **Model**: `openai/gpt-image-2`
> * **Parameters**: `quality: "high"`, `aspect_ratio: "16:9"`, `n: 1`
> * **Output**: `1536×864` PNG
> * **Generation time**: 94s
> * **Cost**: \$0.13
>
> [Try this prompt in the Image Playground →](https://openrouter.ai/openai/gpt-image-2?output_modalities=image)

## Model Discovery

### Via the Image Models API

The dedicated image models endpoint lists every available image model with its capabilities:

```bash lines theme={null}
curl "https://openrouter.ai/api/v1/images/models"
```

Each entry in the `data` array includes:

```json lines theme={null}
{
  "data": [
    {
      "id": "bytedance-seed/seedream-4.5",
      "name": "Seedream 4.5",
      "description": "A text-to-image model.",
      "created": 1692901234,
      "architecture": {
        "input_modalities": ["text", "image"],
        "output_modalities": ["image"]
      },
      "supported_parameters": {
        "resolution": { "type": "enum", "values": ["1K", "2K", "4K"] },
        "seed": { "type": "boolean" }
      },
      "supports_streaming": false,
      "endpoints": "/api/v1/images/models/bytedance-seed/seedream-4.5/endpoints"
    }
  ]
}
```

| Field | Description |
| - | - |
| `id` | Model slug to use in generation requests |
| `architecture` | Input and output modalities the model accepts |
| `supported_parameters` | Union of capabilities across all endpoints. Each key is a request field name; the value is a [capability descriptor](#capability-descriptors) |
| `supports_streaming` | Whether any endpoint supports native SSE streaming (`stream: true`) |
| `endpoints` | URL to the full per-endpoint records for this model |

### Per-Endpoint Records

Each model may be served by multiple providers. To see the definitive capabilities, pricing, and passthrough options per endpoint:

```bash lines theme={null}
curl "https://openrouter.ai/api/v1/images/models/bytedance-seed/seedream-4.5/endpoints"
```

```json lines theme={null}
{
  "id": "bytedance-seed/seedream-4.5",
  "endpoints": [
    {
      "provider_name": "Bytedance",
      "provider_slug": "bytedance",
      "provider_tag": "bytedance",
      "supported_parameters": {
        "resolution": { "type": "enum", "values": ["1K", "2K", "4K"] },
        "seed": { "type": "boolean" }
      },
      "allowed_passthrough_parameters": [],
      "supports_streaming": false,
      "pricing": [
        { "billable": "output_image", "unit": "image", "cost_usd": 0.05 }
      ]
    }
  ]
}
```

| Field | Description |
| - | - |
| `provider_slug` | Use in `provider.options[slug]` to pass provider-specific parameters |
| `provider_tag` | Use to pin requests to a specific provider. `null` when provider-level routing is unavailable |
| `supported_parameters` | The definitive set of parameters *this* endpoint accepts (a subset of the model-level union) |
| `allowed_passthrough_parameters` | Provider-specific keys accepted under `provider.options[provider_slug]` |
| `supports_streaming` | Whether *this* endpoint supports native SSE streaming |
| `pricing` | Billable pricing lines for this endpoint. Each entry has `billable` (e.g. `output_image`, `input_image`, `input_reference`), `unit` (`image`, `megapixel`, or `token`), `cost_usd`, and an optional `variant` tier (e.g. `2k`, `4k` for resolution-tiered pricing) |

### Capability Descriptors

The `supported_parameters` map uses typed descriptors to describe what each request field accepts:

| Type | Shape | Meaning |
| - | - | - |
| `enum` | `{ type: "enum", values: ["1K", "2K", "4K"] }` | Discrete allowlist of accepted string values |
| `range` | `{ type: "range", min: 0, max: 100 }` | Any integer in `[min, max]` is valid |
| `boolean` | `{ type: "boolean" }` | Supported (present) or unsupported (absent) |

An absent key means the parameter is unsupported by that endpoint.

### Via the Models API

You can also discover image models through the general [Models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties.md):

```bash lines theme={null}
curl "https://openrouter.ai/api/v1/models?output_modalities=image"
```

### On the Models Page

Visit the [Models page](https://openrouter.ai/models?output_modalities=image) and filter by output modalities to find models with image generation capabilities.

## API Usage

Send a `POST` request to `/api/v1/images` with the model and prompt:

```python title="Python (requests)" lines theme={null}
import requests
import json

url = "https://openrouter.ai/api/v1/images"
headers = {
    "Authorization": f"Bearer {API_KEY_REF}",
    "Content-Type": "application/json"
}

payload = {
    "model": "{{MODEL}}",
    "prompt": "a red panda astronaut floating in space, studio lighting"
}

response = requests.post(url, headers=headers, json=payload)
result = response.json()

for image in result["data"]:
    # image["b64_json"] contains the base64-encoded image
    print(f"Generated image ({len(image['b64_json'])} chars)")
```

```typescript title="TypeScript (fetch)" lines theme={null}
const response = await fetch('https://openrouter.ai/api/v1/images', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${API_KEY_REF}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: '{{MODEL}}',
    prompt: 'a red panda astronaut floating in space, studio lighting',
  }),
});

const result = await response.json();

for (const image of result.data) {
  // image.b64_json contains the base64-encoded image
  console.log(`Generated image (${image.b64_json.length} chars)`);
}
```

```bash title="cURL" lines theme={null}
curl -X POST "https://openrouter.ai/api/v1/images" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "{{MODEL}}",
    "prompt": "a red panda astronaut floating in space, studio lighting"
  }'
```

### Response Format

Images are returned as base64-encoded bytes. The `usage` field reports token counts and cost when available.

The `media_type` field is present whenever the format is identifiable (including `image/png`), and omitted only when it could not be determined:

```json lines theme={null}
{
  "created": 1748372400,
  "data": [
    {
      "b64_json": "<base64-encoded-image>",
      "media_type": "image/png"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 4175,
    "total_tokens": 4175,
    "cost": 0.04
  }
}
```

For non-PNG outputs (e.g., JPEG, WebP, or SVG from Recraft vector models), `media_type` reflects the actual format:

```json lines theme={null}
{
  "created": 1748372400,
  "data": [
    {
      "b64_json": "<base64-encoded-image>",
      "media_type": "image/svg+xml"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 4175,
    "total_tokens": 4175,
    "cost": 0.04
  }
}
```

## Image Configuration Options

### Resolution and Aspect Ratio

Control output dimensions with `resolution`, `aspect_ratio`, or the convenience `size` shorthand:

```json lines theme={null}
{
  "model": "bytedance-seed/seedream-4.5",
  "prompt": "a landscape photo",
  "resolution": "2K",
  "aspect_ratio": "16:9"
}
```

* `resolution`: normalized tier (`512`, `768`, `1K`, `1.5K`, `2K`, `4K`). Concrete pixel dimensions are derived per-provider.
* `aspect_ratio`: normalized ratio. Pass `auto` to let the provider choose. Common values include `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `4:5`, `5:4`, and extended ratios like `1:2`, `2:1`, `1:4`, `4:1`, `1:8`, `8:1`, `9:21`, `21:9`. Providers clamp to their supported subset. Check the model's `supported_parameters` for accepted values.
* `size`: convenience shorthand. Pass a tier (`"2K"`) or explicit pixels (`"2048x2048"`). A tier size is equivalent to setting `resolution` and combines with `aspect_ratio`. Explicit pixel sizes are provider-dependent: providers that accept them treat the value as authoritative and reject a mismatched `resolution` or `aspect_ratio` alongside it with a 400. xAI and Sourceful V2/V2.5 reject explicit pixel sizes (use `resolution` and `aspect_ratio` there); Sourceful V2.6 supports them within its dimension limits and does not allow combining them with `resolution` or `aspect_ratio`.

Check the model's `supported_parameters` to see which values each endpoint accepts.

### Quality and Output Format

```json lines theme={null}
{
  "model": "openai/gpt-image-1",
  "prompt": "a product photo",
  "quality": "high",
  "output_format": "png",
  "background": "transparent"
}
```

* `quality` — `auto`, `low`, `medium`, or `high`. Providers without a quality knob ignore this.
* `output_format` — `png`, `jpeg`, `webp`, or `svg` (vectorization models only). If omitted, the provider's default applies.
* `background` — `auto`, `transparent`, or `opaque`. `transparent` requires an alpha-capable format (png or webp).
* `output_compression` — 0-100 for webp/jpeg. Ignored for png.

### Multiple Images

Request up to 10 images per call with `n`:

```json lines theme={null}
{
  "model": "openai/gpt-image-1",
  "prompt": "a cute cat",
  "n": 4
}
```

Not all providers support `n > 1`. Check the model's `supported_parameters` for availability.

### Image-to-Image (Reference Images)

Pass reference images to guide generation via `input_references`:

```json lines theme={null}
{
  "model": "openai/gpt-image-1",
  "prompt": "make this scene look like a watercolor painting",
  "input_references": [
    {
      "type": "image_url",
      "image_url": {
        "url": "https://example.com/photo.jpg"
      }
    }
  ]
}
```

Reference images can be HTTP(S) URLs or base64 data URLs. The number of references accepted varies by provider.

### Provider Routing

When a model has multiple providers, use the `provider` object to choose which endpoints can serve the request:

```json lines theme={null}
{
  "model": "google/gemini-2.5-flash-image",
  "prompt": "a red panda astronaut floating in space",
  "provider": {
    "only": ["google-ai-studio"],
    "allow_fallbacks": false
  }
}
```

The Image API supports these routing fields:

* `only` — allow only the listed provider slugs.
* `order` — try providers in the listed order.
* `ignore` — exclude the listed provider slugs.
* `sort` — sort eligible endpoints by `price`, `throughput`, or `latency`.
* `allow_fallbacks` — when `false`, stop after the primary provider instead of trying another eligible provider.

Use `provider_tag` from the [per-endpoint records](#per-endpoint-records) as the base provider slug. See [Provider Routing](https://openrouter.ai/docs/guides/routing/provider-selection.md) for the routing behavior shared across OpenRouter APIs.

### Provider-Specific Options

Pass provider-specific parameters through `provider.options`, keyed by the provider slug from the endpoints API:

```json lines theme={null}
{
  "model": "black-forest-labs/flux.2-pro",
  "prompt": "a dramatic portrait",
  "provider": {
    "options": {
      "black-forest-labs": {
        "steps": 40,
        "guidance": 3
      }
    }
  }
}
```

The `allowed_passthrough_parameters` field in each endpoint record lists which keys are accepted.

## Streaming Image Generation

Models that support native SSE streaming (`supports_streaming: true` in the discovery API) can return partial images as they're generated:

```json lines theme={null}
{
  "model": "openai/gpt-image-1",
  "prompt": "a detailed landscape",
  "stream": true
}
```

The response is an SSE stream with three event types:

**Partial image** — emitted as each partial render becomes available:

```
data: {"type":"image_generation.partial_image","partial_image_index":0,"b64_json":"<base64>"}
```

**Completed** — emitted when the final image is ready. The `media_type` field is present whenever the format is identifiable:

```
data: {"type":"image_generation.completed","b64_json":"<base64>","media_type":"image/png","created":1748372400,"usage":{"prompt_tokens":16,"completion_tokens":272,"total_tokens":288,"cost":0.011}}
```

For non-PNG outputs (e.g., SVG from Recraft vector models), `media_type` reflects the actual format:

```
data: {"type":"image_generation.completed","b64_json":"<base64>","media_type":"image/svg+xml","created":1748372400,"usage":{"prompt_tokens":16,"completion_tokens":272,"total_tokens":288,"cost":0.011}}
```

The `usage` object in the completed event includes `cost` (USD), matching the buffered response shape.

**Error** — emitted if generation fails mid-stream:

```
data: {"type":"error","error":{"message":"Generation failed","code":"server_error"}}
```

The stream terminates with `data: [DONE]`.

```python title="Python (requests)" expandable lines theme={null}
import requests

url = "https://openrouter.ai/api/v1/images"
headers = {
    "Authorization": f"Bearer {API_KEY_REF}",
    "Content-Type": "application/json"
}

response = requests.post(url, headers=headers, json={
    "model": "openai/gpt-image-1",
    "prompt": "a detailed landscape painting",
    "stream": True
}, stream=True)

for line in response.iter_lines():
    if line:
        decoded = line.decode("utf-8")
        if decoded.startswith("data: ") and decoded != "data: [DONE]":
            import json
            event = json.loads(decoded[6:])
            print(f"Event: {event['type']}")
```

```typescript title="TypeScript (fetch)" expandable lines theme={null}
const response = await fetch('https://openrouter.ai/api/v1/images', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${API_KEY_REF}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-image-1',
    prompt: 'a detailed landscape painting',
    stream: true,
  }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      const event = JSON.parse(line.slice(6));
      console.log(`Event: ${event.type}`);
    }
  }
}
```

```bash title="cURL" lines theme={null}
curl -N -X POST "https://openrouter.ai/api/v1/images" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-image-1",
    "prompt": "a detailed landscape painting",
    "stream": true
  }'
```

## Billing and Cancellation

Image generation billing is **all-or-nothing**. A generation is either completed and billed in full, or it fails and is not billed — there is no partial or fractional image billing. This differs from chat completions, where a cancelled stream still bills for the tokens produced before cancellation.

* **Completed generations** are billed for the full image output based on the endpoint's pricing.
* **Failed or cancelled generations** are not billed. When a generation does not complete, the request returns a `502 Bad Gateway` rather than a partial result, and no charge is recorded.

If a client disconnects mid-generation, the upstream provider may still finish rendering the image and charge OpenRouter for it. Regardless, the client only ever observes one of two outcomes: a fully-billed result, or an error. OpenRouter does not attempt to bill the user for work they did not receive.

For streaming requests, any partial preview images delivered before the stream ends do **not** create partial charges. Billing keys off completion of the final image, so a stream that terminates early (client disconnect or mid-stream error) is billed exactly as a failed generation: not at all.

## Request Parameters

| Parameter | Type | Required | Description |
| - | - | - | - |
| `model` | string | Yes | Model slug (e.g. `bytedance-seed/seedream-4.5`) |
| `prompt` | string | Yes | Text description of the desired image |
| `n` | integer | No | Upper bound on images to generate (1-10); providers may return fewer, and single-image providers reject `n > 1` |
| `resolution` | string | No | Resolution tier (`512`, `768`, `1K`, `1.5K`, `2K`, `4K`) |
| `aspect_ratio` | string | No | Aspect ratio (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `1:4`, `4:1`, etc.) |
| `size` | string | No | Convenience shorthand — a tier, or explicit pixels (`"2048x2048"`) where the provider accepts them (xAI and Sourceful V2/V2.5 reject pixel sizes with a 400; Sourceful V2.6 accepts them within its dimension limits) |
| `quality` | string | No | `auto`, `low`, `medium`, or `high` |
| `output_format` | string | No | `png`, `jpeg`, `webp`, or `svg`. When omitted, the provider default applies. |
| `background` | string | No | `auto`, `transparent`, or `opaque` |
| `output_compression` | integer | No | Compression level (0-100) for webp/jpeg |
| `seed` | integer | No | Seed for deterministic generation (where supported) |
| `stream` | boolean | No | Stream partial images via SSE |
| `input_references` | array | No | Reference images for image-to-image generation |
| `user` | string | No | Stable identifier for your end-user; folded into a hashed upstream identity and never sent raw (see [User Tracking](https://openrouter.ai/docs/cookbook/administration/user-tracking.md)) |
| `provider.only` | string\[] | No | Allow only these provider slugs |
| `provider.order` | string\[] | No | Try provider slugs in this order |
| `provider.ignore` | string\[] | No | Exclude these provider slugs |
| `provider.sort` | string or object | No | Sort eligible endpoints by price, throughput, or latency |
| `provider.allow_fallbacks` | boolean | No | Allow another eligible provider when the primary fails |
| `provider.options` | object | No | Provider-specific parameters keyed by provider slug |

Use the [Image Models API](#via-the-image-models-api) to check which parameters each model and endpoint supports.
