> Source: https://developers.openai.com/api/docs/guides/image-generation.md (fetched 2026-11-04; excerpt: the Image API sections; the Responses API tool, edits, earlier models and the JavaScript/Go/Java/C#/Ruby samples are left out)

# Image generation

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

## Overview

The API lets you generate and edit images from text prompts using `gpt-image-2.5-sunburst` and `gpt-image-2.5-flare`. Choose Sunburst for workflows where editing precision matters most, and Flare for fast, high-quality everyday image generation. You can access image generation capabilities through two APIs:

### Image API

The [Image API](https://developers.openai.com/api/reference/resources/images) provides two endpoints, each with distinct capabilities:

- **Generations**: [Generate images](#generate-images) from scratch based on a text prompt
- **Edits**: [Modify existing images](#edit-images) using a new prompt, either partially or entirely

### Responses API

The [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create#responses-create-tools) allows you to generate images as part of conversations or multi-step flows. It supports image generation as a [built-in tool](https://developers.openai.com/api/docs/guides/tools?api-mode=responses), and accepts image inputs and outputs within context.

Compared to the Image API, it adds:

- **Multi-turn editing**: Iteratively make high fidelity edits to images with prompting
- **Flexible inputs**: Accept image [File](https://developers.openai.com/api/reference/resources/files) IDs as input images, not just bytes

For mainline models that can call the image generation tool, refer to [supported models](#supported-models).

### Choosing the right API

- If you only need to generate or edit a single image from one prompt, the Image API is your best choice.
- If you want to build conversational, editable image experiences with GPT Image, go with the Responses API.

With the Image API, set `model` to `gpt-image-2.5-sunburst` or `gpt-image-2.5-flare` directly. With the Responses API, select a supported mainline model at the top level and specify `gpt-image-2.5-sunburst` or `gpt-image-2.5-flare` in the image generation tool's `model` field.

Both APIs let you [customize output](#customize-image-output) by adjusting quality, size, format, and compression.

To ensure these models are used responsibly, you may need to complete the [API
  Organization
  Verification](https://help.openai.com/en/articles/10910291-api-organization-verification)
  from your [developer
  console](https://platform.openai.com/settings/organization/general) before
  using GPT Image models.

### Safety identifiers

If your application serves individual end users, include a stable,
privacy-preserving `safety_identifier` in each [image generation](https://developers.openai.com/api/reference/resources/images/methods/generate)
or [image edit](https://developers.openai.com/api/reference/resources/images/methods/edit) request. Hash a
username or email address instead of sending identifying information, and keep
the identifier to 128 characters or fewer. Safety identifiers are recommended
but not required.

The Images API `user` parameter is deprecated. Send the same identifier as
`safety_identifier` instead. Existing requests using `user` remain supported. A
nonempty `safety_identifier` takes precedence over `user`; when
`safety_identifier` is omitted, `null`, or an empty string, the API uses `user`
when available.

<div
  className="not-prose"
  style={{ float: "right", margin: "10px 0 10px 10px" }}
>
  <img src="https://developers.openai.com/images/image-25-article/mug.png"
    alt="A beige coffee mug on a wooden table"
    style={{ height: "180px", width: "auto", borderRadius: "8px" }}
  />


## Generate Images

You can use the [image generation endpoint](https://developers.openai.com/api/reference/resources/images) to create images based on text prompts, or the [image generation tool](https://developers.openai.com/api/docs/guides/tools?api-mode=responses) in the Responses API to generate images as part of a conversation.

To learn more about customizing the output (size, quality, format, compression), refer to the [customize image output](#customize-image-output) section below.

You can set the `n` parameter to generate multiple images at once in a single request (by default, the API returns a single image).


Image API

    Generate an image


```python
from openai import OpenAI
import base64

client = OpenAI()

prompt = """
A children's book drawing of a veterinarian using a stethoscope to
listen to the heartbeat of a baby otter.
"""

result = client.images.generate(model="gpt-image-2.5-sunburst", prompt=prompt)

image_base64 = result.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

# Save the image to a file
with open("otter.png", "wb") as f:
    f.write(image_bytes)
```


```bash
curl -X POST "https://api.openai.com/v1/images/generations" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-type: application/json" \
    -d '{
        "model": "gpt-image-2.5-sunburst",
        "prompt": "A children'\''s book drawing of a veterinarian using a stethoscope to listen to the heartbeat of a baby otter."
    }' | jq -r '.data[0].b64_json' | base64 --decode > otter.png
```

```bash
openai images generate \
  --model gpt-image-2.5-sunburst \
  --prompt "A children's book drawing of a veterinarian using a stethoscope to listen to the heartbeat of a baby otter." \
  --raw-output \
  --transform 'data.0.b64_json' | base64 --decode > otter.png
```

  

  

    

### Streaming

The Responses API and Image API support streaming image generation. You can stream partial images as the APIs generate them, providing a more interactive experience.

You can adjust the `partial_images` parameter to receive 0-3 partial images.

- If you set `partial_images` to 0, you will only receive the final image.
- For values larger than zero, you may not receive the full number of partial images you requested if the full image is generated more quickly.


Image API

    Stream an image


```python
from openai import OpenAI
import base64

client = OpenAI()

stream = client.images.generate(
    prompt="Draw a gorgeous image of a river made of white owl feathers, snaking its way through a serene winter landscape",
    model="gpt-image-2.5-sunburst",
    stream=True,
    partial_images=2,
)

for event in stream:
    if event.type == "image_generation.partial_image":
        idx = event.partial_image_index
        image_base64 = event.b64_json
        image_bytes = base64.b64decode(image_base64)
        with open(f"river{idx}.png", "wb") as f:
            f.write(image_bytes)
```


#### Result


| Partial 1                                                                                                     | Partial 2                                                                                                     | Final image                                                                                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| <img className="images-example-image" src="https://developers.openai.com/images/image-25-article/river-partial-0.png" alt="1st partial" /> | <img className="images-example-image" src="https://developers.openai.com/images/image-25-article/river-partial-1.png" alt="2nd partial" /> | <img className="images-example-image" src="https://developers.openai.com/images/image-25-article/river-final.png" alt="Final image" /> |


  Prompt: Draw a gorgeous image of a river made of white owl feathers, snaking
  its way through a serene winter landscape


## Customize Image Output

You can configure the following output options:

- **Size**: Image dimensions (for example, `1024x1024`, `1024x1536`)
- **Quality**: Rendering quality (for example, `low`, `medium`, `high`)
- **Format**: File output format
- **Compression**: Compression level (0-100%) for JPEG and WebP formats
- **Background**: Transparent, opaque, or automatic

`size`, `quality`, and `background` support the `auto` option, where the model will automatically select the best option based on the prompt.

### Size and quality options

`gpt-image-2.5-sunburst` and `gpt-image-2.5-flare` add `xhigh` and `max` quality settings. Both default to `auto`. Earlier GPT Image models support quality settings up to `high`.

| Setting           | Options                                                               |
| ----------------- | --------------------------------------------------------------------- |
| Recommended sizes | `1024x1024` (square), `1536x1024` (landscape), `1024x1536` (portrait) |
| Quality           | `low`, `medium`, `high`, `xhigh`, `max`, `auto`                       |

Both models also support custom dimensions as `WIDTHxHEIGHT` strings, such as `1536x864`. Width and height must be multiples of 16, the aspect ratio must be between 1:3 and 3:1, and neither edge may exceed 3840 pixels. The total pixel count must be between 655,360 and 8,294,400 (4K). Resolutions above `2560x1440` are experimental.

For transparent backgrounds with either model, set `background: "transparent"` and use `output_format: "png"` or `"webp"`.

Use `quality: "low"` for quick drafts. For final assets, compare higher quality settings to find the right balance of detail, latency, and cost.

### Output format

The Image API returns base64-encoded image data.
The default format is `png`, but you can also request `jpeg` or `webp`.

If using `jpeg` or `webp`, you can also specify the `output_compression` parameter to control the compression level (0-100%). For example, `output_compression=50` will compress the image by 50%.

Using `jpeg` is faster than `png`, so you should prioritize this format if
  latency is a concern.

## Limitations

GPT Image models are powerful and versatile image generation models, but they still have some limitations to be aware of:

- **Latency:** Complex prompts may take up to 2 minutes to process.
- **Text Rendering:** Although significantly improved, the model can still struggle with precise text placement and clarity.
- **Consistency:** While capable of producing consistent imagery, the model may occasionally struggle to maintain visual consistency for recurring characters or brand elements across multiple generations.
- **Composition Control:** Despite improved instruction following, the model may have difficulty placing elements precisely in structured or layout-sensitive compositions.

### Content Moderation

All prompts and generated images are filtered in accordance with our [content policy](https://openai.com/policies/usage-policies/).

For image generation using GPT Image models, you can control moderation strictness with the `moderation` parameter. This parameter supports two values:

- `auto` (default): Standard filtering that seeks to limit creating certain categories of potentially age-inappropriate content.
- `low`: Less restrictive filtering.

### Handling blocked requests and other errors

Handle image generation failures the same way you handle other API errors: check the HTTP status or SDK exception type, log the request ID, and refer to the [error codes guide](https://developers.openai.com/api/docs/guides/error-codes) for authentication, quota, rate-limit, and server failures. Retry transient rate-limit and server failures with backoff. Don't automatically retry quota errors or image generation user errors that require changing the request.

Some image generation failures are user-correctable and may return `error.type = "image_generation_user_error"`. Don't automatically retry these errors without modifying the prompt or input images. For programmatic handling, use `error.code` as the stable discriminator.

When `error.code = "moderation_blocked"`, the error may also include an optional `error.moderation_details` object:

```json
{
  "error": {
    "type": "image_generation_user_error",
    "code": "moderation_blocked",
    "moderation_details": {
      "moderation_stage": "input",
      "categories": ["harassment"]
    }
  }
}
```

The `moderation_details` object provides coarse debugging context without exposing internal classifier labels or scores.

`moderation_stage` can be:

- `input`: The block came from the prompt or request inputs.
- `output`: The block came from a generated image or downstream output moderation stage.
- `unknown`: A rare fallback when provenance is hard to determine.

`categories` contains coarse public labels. For example, you might see values like `harassment`, `self-harm`, `sexual`, or `violence`.

For most apps, keep the primary end-user message generic. Use `moderation_details` for developer logs, support workflows, analytics, and light remediation hints.

Handle moderation-blocked image generation errors


```python
import openai
from openai import OpenAI

client = OpenAI()

try:
    # The same error handling pattern applies to image generation requests,
    # image edits, and Responses API tool calls that generate images.
    client.images.generate(
        model="gpt-image-2.5-sunburst",
        prompt="Create a poster humiliating my coworker with insulting captions",
    )
except openai.BadRequestError as error:
    if error.code != "moderation_blocked":
        raise

    error_body = error.body if isinstance(error.body, dict) else {}
    moderation_details = error_body.get("moderation_details") or {}
    categories = moderation_details.get("categories") or []
    stage = moderation_details.get("moderation_stage")

    hint = "This request could not be completed because it did not meet safety requirements."

    if "harassment" in categories:
        hint = "Try removing abusive or targeting language and focus on neutral visual details instead."
    elif stage == "input":
        hint = "Try revising the prompt or input images and submit the request again."
    elif stage == "output":
        hint = "The generated result was blocked by a safety check. Try changing the prompt and generating again."

    print(
        "Image generation blocked",
        {
            "request_id": error.request_id,
            "code": error.code,
            "moderation_details": moderation_details,
        },
    )

    print(hint)
```


### Supported models

When using image generation in the Responses API, `gpt-5` and newer models should support the image generation tool. [Check the model detail page for your model](https://developers.openai.com/api/docs/models) to confirm if your desired model can use the image generation tool.

## Cost and latency

### GPT Image 2.5 costs

Responses API requests include the mainline model's token usage in addition to image generation costs.

Both GPT Image 2.5 models use the same token rates: $8 per million image input tokens, $2 per million cached image input tokens, $30 per million image output tokens, $5 per million text input tokens, and $1.25 per million cached text input tokens. See [pricing](https://developers.openai.com/api/docs/pricing#image-generation).

Use the response's `usage` to measure token consumption for your prompts, sizes, and quality settings. Equal token rates don't mean equal cost per image: token consumption can differ by model and quality setting. For older-model pricing examples, see [Earlier GPT Image models](#earlier-gpt-image-models).

### Cached input pricing

For GPT Image 2 and GPT Image 2.5, cached input pricing applies only to the image generation tool in the Responses API. It doesn't apply to direct Images API requests, including `/v1/images/edits`.

Cached image generation inputs are reflected in billing, but their cached token counts aren't included in the Responses API output. The response's `usage` can't verify these cache hits.


### GPT Image 2.5 and GPT Image 2 output tokens

Select a model, quality, and size to estimate output tokens and image output cost.
For `gpt-image-2.5-sunburst` and `gpt-image-2.5-flare`, the quality options are `low`, `medium`, `high`, `xhigh`, and `max`.
For `gpt-image-2`, the options are `low`, `medium`, and `high`.
The models can use different token counts for the same quality setting and share the same price per image output token.
Use explicit quality and size values for this estimate; `auto` depends on the generated image.

<GptImageTokenCalculator
  client:load
  outputPricePerMillion={Number(
    pricing.latest.subsections
      .find((section) => section.price_type === "Image tokens")
      ?.items.find((item) => item.name === "gpt-image-2")?.values.main.output
  )}
/>

### Partial images cost

If you want to [stream image generation](#streaming) using the `partial_images` parameter, each partial image will incur an additional 100 image output tokens.
