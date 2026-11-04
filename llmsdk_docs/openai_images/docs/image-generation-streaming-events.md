> Source: https://developers.openai.com/api/reference/resources/images/generation-streaming-events.md (fetched 2026-11-04)

# Image generation streaming events

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

Stream image generation and editing in real time with server-sent events.
[Learn more about image streaming](https://developers.openai.com/api/docs/guides/image-generation).

<a id="image_generation.partial_image"></a>

## image_generation.partial_image

Emitted when a partial image is available during image generation streaming.

### Schema

Schema name: `ImageGenPartialImageEvent`

- `b64_json: string`

  Base64-encoded partial image data, suitable for rendering as an image.

- `background: "transparent" or "opaque" or "auto"`

  The background setting for the requested image.

  - `"transparent"`

  - `"opaque"`

  - `"auto"`

- `created_at: integer`

  The Unix timestamp when the event was created.

  `format: unixtime`

- `output_format: "png" or "webp" or "jpeg"`

  The output format for the requested image.

  - `"png"`

  - `"webp"`

  - `"jpeg"`

- `partial_image_index: integer`

  0-based index for the partial image (streaming).

- `quality: "low" or "medium" or "high" or 3 more`

  The quality setting for the requested image.

  - `"low"`

  - `"medium"`

  - `"high"`

  - `"xhigh"`

  - `"max"`

  - `"auto"`

- `size: string or "1024x1024" or "1024x1536" or "1536x1024" or "auto"`

  The image dimensions as a `WIDTHxHEIGHT` string, for example `1536x864`.

  - `string`

  - `"1024x1024" or "1024x1536" or "1536x1024" or "auto"`

    The image dimensions as a `WIDTHxHEIGHT` string, for example `1536x864`.

    - `"1024x1024"`

    - `"1024x1536"`

    - `"1536x1024"`

    - `"auto"`

- `type: "image_generation.partial_image"`

  The type of the event. Always `image_generation.partial_image`.

  - `"image_generation.partial_image"`

### Example

```json
{
  "type": "image_generation.partial_image",
  "b64_json": "...",
  "created_at": 1620000000,
  "size": "1024x1024",
  "quality": "high",
  "background": "transparent",
  "output_format": "png",
  "partial_image_index": 0
}
```

<a id="image_generation.completed"></a>

## image_generation.completed

Emitted when image generation has completed and the final image is available.

### Schema

Schema name: `ImageGenCompletedEvent`

- `b64_json: string`

  Base64-encoded image data, suitable for rendering as an image.

- `background: "transparent" or "opaque" or "auto"`

  The background setting for the generated image.

  - `"transparent"`

  - `"opaque"`

  - `"auto"`

- `created_at: integer`

  The Unix timestamp when the event was created.

  `format: unixtime`

- `output_format: "png" or "webp" or "jpeg"`

  The output format for the generated image.

  - `"png"`

  - `"webp"`

  - `"jpeg"`

- `quality: "low" or "medium" or "high" or 3 more`

  The quality setting for the generated image.

  - `"low"`

  - `"medium"`

  - `"high"`

  - `"xhigh"`

  - `"max"`

  - `"auto"`

- `size: string or "1024x1024" or "1024x1536" or "1536x1024" or "auto"`

  The image dimensions as a `WIDTHxHEIGHT` string, for example `1536x864`.

  - `string`

  - `"1024x1024" or "1024x1536" or "1536x1024" or "auto"`

    The image dimensions as a `WIDTHxHEIGHT` string, for example `1536x864`.

    - `"1024x1024"`

    - `"1024x1536"`

    - `"1536x1024"`

    - `"auto"`

- `type: "image_generation.completed"`

  The type of the event. Always `image_generation.completed`.

  - `"image_generation.completed"`

- `usage: object { input_tokens, input_tokens_details, output_tokens, total_tokens }`

  For the GPT image models only, the token usage information for the image generation.

  - `input_tokens: integer`

    The number of tokens (images and text) in the input prompt.

  - `input_tokens_details: object { image_tokens, text_tokens }`

    The input tokens detailed information for the image generation.

    - `image_tokens: integer`

      The number of image tokens in the input prompt.

    - `text_tokens: integer`

      The number of text tokens in the input prompt.

  - `output_tokens: integer`

    The number of image tokens in the output image.

  - `total_tokens: integer`

    The total number of tokens (images and text) used for the image generation.

- `safety_identifier: optional string or null`

  The effective safety identifier used for safety monitoring and abuse detection. This is the non-empty `safety_identifier` from the request, or the deprecated `user` value when `safety_identifier` is omitted, null, or empty.

### Example

```json
{
  "type": "image_generation.completed",
  "b64_json": "...",
  "created_at": 1620000000,
  "size": "1024x1024",
  "quality": "high",
  "background": "transparent",
  "output_format": "png",
  "usage": {
    "total_tokens": 100,
    "input_tokens": 50,
    "output_tokens": 50,
    "input_tokens_details": {
      "text_tokens": 10,
      "image_tokens": 40
    }
  }
}
```
