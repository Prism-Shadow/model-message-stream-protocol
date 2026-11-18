> Source: https://aistudio.google.com/docs/image-generation.md (snapshot 2026-11-19)
>
> Java/Go samples and the "Prompting guide and strategies" section removed.

> ## AI Agent Context
> - Full documentation index: https://aistudio.google.com/llms.txt
> - Gemini Docs MCP server (consistent live info): https://gemini-api-docs-mcp.dev
> - Coding agent skills & setup guide: https://aistudio.google.com/docs/coding-agents.md

# Nano Banana image generation  {% id="nano-banana-image-generation" %}

{% button href="https://aistudio.google.com" variant="ais" %}Try in Google AI Studio{% /button %}

**Nano Banana** is the name for Gemini's native image generation capabilities.
Gemini can generate and process images conversationally
with text, images, video, or a combination. This lets you create, edit, and
iterate on visuals with unprecedented control.

## Model selection  {% id="model-selection" %}

Nano Banana refers to the following models available in the Gemini API:

* **Nano Banana 2.1**: The [Gemini Nano Banana 2.1](/docs/models/gemini-nano-banana-2.1)
  model (`gemini-nano-banana-2.1`). An update to Nano Banana 2, serving as the
  primary high-efficiency workhorse model for image generation and
  conversational editing. It maintains Flash-level speed and cost efficiency
  while delivering improved visual quality, text rendering, multi-turn
  consistency, and Google Search grounding across 1K, 2K, and 4K resolutions.

* **Nano Banana 2 Lite**: The [Gemini 3.1 Flash Lite Image](/docs/models/gemini-3.1-flash-lite-image)
  model (`gemini-3.1-flash-lite-image`). The fastest and cheapest Gemini image
  model, engineered for velocity and scale where speed and cost are primary
  constraints. Not optimized for multiple reference inputs or multi-turn
  sequential editing.

* **Nano Banana 2**: The [Gemini 3.1 Flash Image](/docs/models/gemini-3.1-flash-image)
  model (`gemini-3.1-flash-image`). The previous-generation high-efficiency
  workhorse model, optimized for speed, 4K generation, and multiple reference
  image consistency. Recommended for all new projects to use Nano Banana 2.1.

* **Nano Banana Pro**: The [Gemini 3 Pro Image](/docs/models/gemini-3-pro-image) model
  (`gemini-3-pro-image`). The premium choice for complex visual tasks,
  utilizing advanced reasoning ("Thinking") to follow complex instructions,
  maintain brand consistency, and render high-fidelity text.

* **Nano Banana**: The [Gemini 2.5 Flash Image](/docs/models/gemini-2.5-flash-image) model
  (`gemini-2.5-flash-image`). The legacy model of the Nano Banana series. Recommended
  migration path is Nano Banana 2 Lite for higher quality, faster speeds,
  and lower pricing.


All generated images include a [SynthID watermark](https://deepmind.google/technologies/synthid/).

## Image generation (text-to-image)  {% id="image-generation-text-to-image" %}

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  from PIL import Image
  import base64
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input="Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme",
  )
  
  with open("generated_image.png", "wb") as f:
      f.write(base64.b64decode(interaction.output_image.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  import * as fs from "node:fs";
  
  async function main() {
  
    const ai = new GoogleGenAI({});
  
    const prompt =
      "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme";
  
    const interaction = await ai.interactions.create({
      model: "gemini-nano-banana-2.1",
      input: prompt,
    });
    const generatedImage = interaction.output_image;
    if (generatedImage) {
      if (generatedImage && generatedImage.data) {
      const buffer = Buffer.from(generatedImage.data, "base64");
      fs.writeFileSync("gemini-native-image.png", buffer);
    }
      console.log("Image saved as gemini-native-image.png");
    }
  }
  
  await main();
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Api-Revision: 2026-05-20" \
    -d '{
      "model": "gemini-nano-banana-2.1",
      "input": [
        {"type": "text", "text": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"}
      ]
    }'
  ```

  {% /tab %}

  {% tab label="CLI" %}
  ```bash
  gemini-api image "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme" \
    --out generated_image.png
  ```

  {% /tab %}

{% /tabs %}

You can retrieve generated image data by using the `interaction.output_image`
property, which returns the last generated image block.

{% callout type="note" %}
  Note: For complex, interleaved text-and-image outputs (such as stories
  containing illustrations), convenience properties will not capture all parts.
  You must manually iterate over the steps instead-see
  [Interleaved text and images](/docs/image-generation#interleaved-output) for an example.

{% /callout %}

## Image editing (text-and-image-to-image)  {% id="gemini-image-editing" %}

**Reminder**: Make sure you have the necessary rights to any images you upload.
Don't generate content that infringe on others' rights, including videos or
images that deceive, harass, or harm. Your use of this generative AI service is
subject to our [Prohibited Use Policy](https://policies.google.com/terms/generative-ai/use-policy).

Provide an image and use text prompts to add, remove, or modify elements,
change the style, or adjust the color grading.

The following example demonstrates uploading `base64` encoded images.
For multiple images, larger payloads, and supported MIME types, check the [Image
understanding](/docs/image-understanding) page.

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  from PIL import Image
  import base64
  
  client = genai.Client()
  
  with open("/path/to/cat_image.png", "rb") as f:
      image_bytes = f.read()
  
  interaction = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input=[
          {
            "type": "text",
            "text": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"
          },
          {
              "type": "image",
              "data": base64.b64encode(image_bytes).decode('utf-8'),
              "mime_type": "image/png"
          }
      ],
  )
  
  with open("generated_image.png", "wb") as f:
      f.write(base64.b64decode(interaction.output_image.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  import * as fs from "node:fs";
  
  async function main() {
  
    const ai = new GoogleGenAI({});
  
    const imagePath = "path/to/cat_image.png";
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString("base64");
  
    const interaction = await ai.interactions.create({
      model: "gemini-nano-banana-2.1",
      input: [
        { type: "text", text: "Create a picture of my cat eating a nano-banana in a" +
                "fancy restaurant under the Gemini constellation" },
        {
          type: "image",
          mime_type: "image/png",
          data: base64Image
        },
      ],
    });
    const generatedImage = interaction.output_image;
    if (generatedImage) {
      if (generatedImage && generatedImage.data) {
      const buffer = Buffer.from(generatedImage.data, "base64");
      fs.writeFileSync("gemini-native-image.png", buffer);
    }
      console.log("Image saved as gemini-native-image.png");
    }
  }
  
  await main();
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -H "Api-Revision: 2026-05-20" \
      -d "{
        \"model\": \"gemini-nano-banana-2.1\",
        \"input\": [
          {\"type\": \"text\", \"text\": \"Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation\"},
          {
            \"type\": \"image\",
            \"mime_type\": \"image/jpeg\",
            \"data\": \"[BASE64_IMAGE_DATA]\"
          }
        ]
      }"
  ```

  {% /tab %}

  {% tab label="CLI" %}
  ```bash
  gemini-api image "Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation" \
    -i /path/to/cat_image.png \
    --out generated_image.png
  ```

  {% /tab %}

{% /tabs %}

### Multi-turn image editing  {% id="multi-turn-image-editing" %}

Keep generating and editing images conversationally. Multi-turn
conversation is the recommended way to iterate on images. The following
example shows a prompt to generate an infographic about photosynthesis.

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  import base64
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input="Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plant's favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids' cookbook, suitable for a 4th grader.",
      tools=[{"type": "google_search"}],
  )
  
  with open("photosynthesis.png", "wb") as f:
      f.write(base64.b64decode(interaction.output_image.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  import * as fs from "node:fs";
  
  const ai = new GoogleGenAI({});
  
  async function main() {
    const interaction = await ai.interactions.create({
      model: "gemini-nano-banana-2.1",
      input: "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plant's favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids' cookbook, suitable for a 4th grader.",
      tools: [{"type": "google_search"}],
    });
  
    const generatedImage = interaction.output_image;
    if (generatedImage) {
      if (generatedImage && generatedImage.data) {
      const buffer = Buffer.from(generatedImage.data, "base64");
      fs.writeFileSync("photosynthesis.png", buffer);
    }
      console.log("Image saved as photosynthesis.png");
    }
  }
  
  await main();
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Api-Revision: 2026-05-20" \
    -d '{
      "model": "gemini-nano-banana-2.1",
      "input": [
        {"type": "text", "text": "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plants favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids cookbook, suitable for a 4th grader."}
      ],
      "tools": [{"type": "google_search"}]
    }'
  ```

  {% /tab %}

  {% tab label="CLI" %}
  ```bash
  ID=$(gemini-api image "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plant's favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids' cookbook, suitable for a 4th grader." \
    --body '{"tools":[{"type":"google_search"}]}' \
    --out photosynthesis.png \
    --jq '.response_id')
  ```

  {% /tab %}

{% /tabs %}

![AI-generated infographic about photosynthesis](https://www.gstatic.com/cloud-cms/bb7eae3c8034fd8aded280176d387543.png)You can then use the `previous_interaction_id` to change the language on the
graphic to Spanish.

{% tabs %}
  {% tab label="Python" %}
  ```python
  interaction_2 = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input="Update this infographic to be in Spanish. Do not change any other elements of the image.",
      previous_interaction_id=interaction.id,
      response_format={
          "type": "image",
          "mime_type": "image/jpeg",
          "aspect_ratio": "16:9",
          "image_size": "2K"
      },
  )
  
  generated_image = interaction_2.output_image
  if generated_image:
      with open("photosynthesis_spanish.png", "wb") as f:
          f.write(base64.b64decode(generated_image.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  const interaction2 = await ai.interactions.create({
    model: "gemini-nano-banana-2.1",
    input: "Update this infographic to be in Spanish. Do not change any other elements of the image.",
    previous_interaction_id: interaction.id,
    response_format: {
      type: "image",
      mime_type: "image/png",
      aspect_ratio: "16:9",
      image_size: "2K"
    },
  });
  
  const generatedImage = interaction2.output_image;
  if (generatedImage) {
    if (generatedImage && generatedImage.data) {
      const buffer = Buffer.from(generatedImage.data, "base64");
      fs.writeFileSync("photosynthesis_spanish.png", buffer);
    }
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -H "Api-Revision: 2026-05-20" \
    -d '{
      "model": "gemini-nano-banana-2.1",
      "input": "Update this infographic to be in Spanish. Do not change any other elements of the image.",
      "previous_interaction_id": "[PREVIOUS_INTERACTION_ID]",
      "response_format": {
        "type": "image",
        "mime_type": "image/jpeg",
        "aspect_ratio": "16:9",
        "image_size": "2K"
      }
    }'
  ```

  {% /tab %}

  {% tab label="CLI" %}
  ```bash
  gemini-api image "Update this infographic to be in Spanish. Do not change any other elements of the image." \
    --previous-interaction-id "$ID" \
    --output-mime-type image/jpeg \
    --aspect-ratio 16:9 \
    --image-size 2K \
    --out photosynthesis_spanish.jpg
  ```

  {% /tab %}

{% /tabs %}

![AI-generated infographic of photosynthesis in Spanish](https://www.gstatic.com/cloud-cms/b435b5da9f72aebf268a1d821a46bd3a.png)## Features of Nano Banana  {% id="gemini-3-capabilities" %}

Nano Banana models offer state-of-the-art image generation and editing. Gemini
Nano Banana 2.1 and Gemini 3.1 Flash Image are optimized for speed and
high-volume use-cases, and Gemini 3 Pro Image is optimized for professional
asset production.
Designed to tackle the most challenging workflows through advanced reasoning,
they excel at complex, multi-turn creation and modification tasks.

- **High-resolution output**: Built-in generation capabilities for 1K, 2K, and 4K visuals.

  - **Gemini 3.1 Flash Image** adds the smaller 512px (0.5K) resolution (not supported on Gemini Nano Banana 2.1).

- **Advanced text rendering**: Capable of generating legible, stylized text for
  infographics, menus, diagrams, and marketing assets.

- **Grounding with Google Search**: The model can use Google Search as a tool to
  verify facts and generate imagery based on real-time data (e.g., current
  weather maps, stock charts, recent events).

  - **Gemini Nano Banana 2.1 and Gemini 3.1 Flash Image** add the integration of Google Image Search
    Grounding alongside Web Search.

- **Thinking mode**: The model utilizes a "thinking" process to reason through
  complex prompts. It generates interim "thought images" (visible in the backend
  but not charged) to refine the composition before producing the final
  high-quality output.

- **Up to 14 reference images**: Mix up to 14 reference images to
  produce the final image.

- **New aspect ratios**: Gemini Nano Banana 2.1 and Gemini 3.1 Flash Image add 1:4, 4:1, 1:8, and
  8:1 [aspect ratios](/docs/image-generation#aspect-ratios-and-image-size).


### Use up to 14 reference images  {% id="use-14-images" %}

Nano Banana models allow you to mix up to 14 reference images. These 14 images
can include the following:

| Gemini Nano Banana 2.1 & Gemini 3.1 Flash Image | Gemini 3 Pro Image |
| :--- | :--- |
| Up to 10 images of objects with high-fidelity to include in the final image | Up to 6 images of objects with high-fidelity to include in the final image |
| Up to 4 images of characters to maintain character consistency | Up to 5 images of characters to maintain character consistency |
| N/A | Up to 3 images to be used as style references |

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  from google.genai import types
  from PIL import Image
  import base64
  
  prompt = "An office group photo of these people, they are making funny faces."
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input=[
          {
              "type": "text",
              "text": prompt,
          },
          {
              "type": "image",
              "data": base64.b64encode(image_bytes).decode('utf-8'),
              "mime_type": "image/png"
          },
          {
              "type": "image",
              "data": base64.b64encode(image_bytes).decode('utf-8'),
              "mime_type": "image/png"
          },
          {
              "type": "image",
              "data": base64.b64encode(image_bytes).decode('utf-8'),
              "mime_type": "image/png"
          },
          {
              "type": "image",
              "data": base64.b64encode(image_bytes).decode('utf-8'),
              "mime_type": "image/png"
          },
          {
              "type": "image",
              "data": base64.b64encode(image_bytes).decode('utf-8'),
              "mime_type": "image/png"
          },
      ],
      response_format={
          "type": "image",
          "aspect_ratio": "5:4",
          "image_size": "2K"
      },
  )
  
  with open("office.png", "wb") as f:
      f.write(base64.b64decode(interaction.output_image.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  import * as fs from "node:fs";
  
  async function main() {
  const ai = new GoogleGenAI({});
  
  const interaction = await ai.interactions.create({
    model: "gemini-nano-banana-2.1",
    input: [
      {
        type: "text",
        text: "An office group photo of these people, they are making funny faces.",
      },
      { type: "image", mime_type: "image/jpeg", data: base64ImageFile1 },
      { type: "image", mime_type: "image/jpeg", data: base64ImageFile2 },
      { type: "image", mime_type: "image/jpeg", data: base64ImageFile3 },
      { type: "image", mime_type: "image/jpeg", data: base64ImageFile4 },
      { type: "image", mime_type: "image/jpeg", data: base64ImageFile5 },
    ],
    response_format: {
      type: "image",
      aspect_ratio: "5:4",
      image_size: "2K",
    },
  });
  
  if (interaction.output_image && interaction.output_image.data) {
    const buffer = Buffer.from(interaction.output_image.data, 'base64');
    fs.writeFileSync('office.png', buffer);
  }
  }
  
  await main();
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -H "Api-Revision: 2026-05-20" \
    -d "{
      \"model\": \"gemini-nano-banana-2.1\",
      \"input\": [
        {\"type\": \"text\", \"text\": \"An office group photo of these people, they are making funny faces.\"},
        {\"type\": \"image\", \"mime_type\": \"image/png\", \"data\": \"[BASE64_DATA_IMG_1]\"},
        {\"type\": \"image\", \"mime_type\": \"image/png\", \"data\": \"[BASE64_DATA_IMG_2]\"},
        {\"type\": \"image\", \"mime_type\": \"image/png\", \"data\": \"[BASE64_DATA_IMG_3]\"},
        {\"type\": \"image\", \"mime_type\": \"image/png\", \"data\": \"[BASE64_DATA_IMG_4]\"},
        {\"type\": \"image\", \"mime_type\": \"image/png\", \"data\": \"[BASE64_DATA_IMG_5]\"}
      ],
      \"response_format\": {
        \"type\": \"image\",
        \"aspect_ratio\": \"5:4\",
        \"image_size\": \"2K\"
      }
    }"
  ```

  {% /tab %}

  {% tab label="CLI" %}
  ```bash
  gemini-api image "An office group photo of these people, they are making funny faces." \
    -i person1.png -i person2.png -i person3.png -i person4.png -i person5.png \
    --aspect-ratio 5:4 \
    --image-size 2K \
    --out office.png
  ```

  {% /tab %}

{% /tabs %}

![AI-generated office group photo](https://www.gstatic.com/cloud-cms/e4b16a85c6cedde829bc7532c456fe5a.jpeg)### Grounding with Google Search  {% id="use-with-grounding" %}

Use the [Google Search tool](/docs/google-search) to generate images
based on real-time information, such as weather forecasts, stock charts, or
recent events.

Note that when using Grounding with Google Search with image generation,
image-based search results are not passed to the generation model and are
excluded from the response (see [Grounding with Google Image Search](/docs/image-generation#image-search)).

{% callout type="note" %}
  Grounding with Google Search is not supported by the
  `gemini-3.1-flash-lite-image` model.

{% /callout %}

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  from google.genai import types
  import base64
  prompt = "Visualize the current weather forecast for the next 5 days in San Francisco as a clean, modern weather chart. Add a visual on what I should wear each day"
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input=prompt,
      tools=[{"type": "google_search"}],
      response_format={
          "type": "image",
          "mime_type": "image/jpeg",
          "aspect_ratio": "16:9"
      },
  )
  
  with open("weather.png", "wb") as f:
      f.write(base64.b64decode(interaction.output_image.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  import * as fs from "node:fs";
  
  async function main() {
    const ai = new GoogleGenAI({});
  
    const interaction = await ai.interactions.create({
      model: "gemini-nano-banana-2.1",
      input: "Visualize the current weather forecast for the next 5 days in San Francisco as a clean, modern weather chart. Add a visual on what I should wear each day",
      tools: [{"type": "google_search"}],
      response_format: {
        type: "image",
        mime_type: "image/png",
        aspect_ratio: "16:9",
        image_size: "2K"
      },
    });
  
    if (interaction.output_image && interaction.output_image.data) {
      const buffer = Buffer.from(interaction.output_image.data, 'base64');
      fs.writeFileSync('weather.png', buffer);
    }
  }
  
  await main();
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Api-Revision: 2026-05-20" \
    -d '{
      "model": "gemini-nano-banana-2.1",
      "input": [
        {"type": "text", "text": "Visualize the current weather forecast for the next 5 days in San Francisco as a clean, modern weather chart. Add a visual on what I should wear each day"}
      ],
      "tools": [{"type": "google_search"}],
      "response_format": {
        "type": "image",
        "mime_type": "image/jpeg",
        "aspect_ratio": "16:9"
      }
    }'
  ```

  {% /tab %}

  {% tab label="CLI" %}
  ```bash
  gemini-api image "Visualize the current weather forecast for the next 5 days in San Francisco as a clean, modern weather chart. Add a visual on what I should wear each day" \
    --body '{"tools":[{"type":"google_search"}]}' \
    --output-mime-type image/jpeg \
    --aspect-ratio 16:9 \
    --out weather.jpg
  ```

  {% /tab %}

{% /tabs %}

![AI-generated five day weather chart for San Francisco](https://www.gstatic.com/cloud-cms/3444f386f283ac68b9d97cfe37c2f588.png)The response includes `google_search_call` and `google_search_result` steps,
along with inline `url_citation` annotations on the text step:

- **`google_search_result`**: Contains `search_suggestions`, an HTML snippet
  for rendering search suggestions in your UI.

- **`url_citation` annotations**: Inline citations on the text step linking
  parts of the response to their web sources.


### Grounding with Google Search for Images (Nano Banana 2.1 and 3.1 Flash)  {% id="image-search" %}

{% callout type="note" %}
  Note: This feature is only available for the Gemini Nano Banana 2.1 and Gemini 3.1 Flash Image models.

{% /callout %}

Grounding with Google Image Search allows models to use web images retrieved via
Google Image Search as visual context for image generation. Image Search is a
new search type within the existing Grounding with Google Search tool,
functioning alongside standard [Web Search](/docs/image-generation#use-with-grounding).

To enable Image Search, configure the `google_search` tool in your API request
and specify `image_search` within the `search_types` array. Image Search can be
used independently or together with Web Search.

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input="A detailed painting of a Timareta butterfly resting on a flower",
      tools=[{
        "type": "google_search",
        "search_types": ["web_search", "image_search"]
      }]
  )
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  
  async function main() {
    const ai = new GoogleGenAI({});
  
    const interaction = await ai.interactions.create({
      model: "gemini-nano-banana-2.1",
      input: "A detailed painting of a Timareta butterfly resting on a flower",
      tools: [{
        "type": "google_search",
        "search_types": ["web_search", "image_search"]
      }]
    });
  }
  
  await main();
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```shell
  curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Api-Revision: 2026-05-20" \
    -d '{
      "model": "gemini-nano-banana-2.1",
      "input": "A detailed painting of a Timareta butterfly resting on a flower",
      "tools": [{"type": "google_search", "search_types": ["web_search", "image_search"]}]
    }'
  ```

  {% /tab %}

{% /tabs %}

**Display requirements**

When you use Image Search within Grounding with Google Search, you must display
the `search_suggestions` from the `google_search_result` step. Full usage
requirements are detailed in the
[Terms of Service](/docs/terms#grounding-with-google-search).

**Response**

For grounded responses using image search, the API returns inline citations
and attribution metadata as part of the response steps:

* **`url_citation` annotations**: Inline citations on the text content block
  within `model_output`, linking the generated content to its source.

* **`google_search_result`**: Contains `search_suggestions`, an HTML
  snippet for rendering search suggestions in your UI.


### Video-to-image generation (Nano Banana 2.1, 3.1 Flash, and 3.1 Flash Lite)  {% id="video-to-image" %}

{% callout type="note" %}
  Note: This feature is only available for the Gemini Nano Banana 2.1, Gemini 3.1 Flash Image, and Gemini 3.1 Flash Lite Image models.

{% /callout %}

Video-to-image generation allows you to generate new images using a video's
context as a multimodal reference. This is useful for creating high-quality
video thumbnails, cinematic
posters, summary infographics, or new artwork inspired by a video scene.

During generation, the model analyzes the video frames in context to extract
visual themes and key events, then uses them alongside your text prompt to
synthesize the output image.

You can pass public [YouTube URLs](/docs/video-understanding#youtube)
directly in your API request or upload local video files using the
[Files API](/docs/files).

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  from google.genai import types
  import base64
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input=[
          {
              "type": "video",
              "uri": "https://www.youtube.com/watch?v=UTdfxFyOQTI",
              "mime_type": "video/mp4"
          },
          {"type": "text", "text": "Generate a poster image that captures the key themes of this video."}
      ],
      response_format={"type": "image", "aspect_ratio": "16:9"}
  )
  
  for step in interaction.steps:
      if step.type == "model_output":
          for content_block in step.content:
              if content_block.type == "text":
                  print(content_block.text)
              elif content_block.type == "image":
                  with open("video_poster.png", "wb") as f:
                      f.write(base64.b64decode(content_block.data))
                  print("Image saved as video_poster.png")
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  import * as fs from "node:fs";
  
  async function main() {
    const ai = new GoogleGenAI({});
  
    const interaction = await ai.interactions.create({
      model: "gemini-nano-banana-2.1",
      input: [
        {
          type: "video",
          uri: "https://www.youtube.com/watch?v=UTdfxFyOQTI",
          mime_type: "video/mp4"
        },
        { type: "text", text: "Generate a poster image that captures the key themes of this video." }
      ],
      response_format: {
        type: "image",
        aspect_ratio: "16:9"
      }
    });
  
    for (const step of interaction.steps) {
      if (step.type === "model_output") {
        for (const contentBlock of step.content || []) {
          if (contentBlock.type === "text") {
            console.log(contentBlock.text);
          } else if (contentBlock.type === "image") {
            if (contentBlock.data) {
            const buffer = Buffer.from(contentBlock.data, "base64");
            fs.writeFileSync("video_poster.png", buffer);
          }
            console.log("Image saved as video_poster.png");
          }
        }
      }
    }
  }
  
  await main();
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -H "Api-Revision: 2026-05-20" \
    -d '{
      "model": "gemini-nano-banana-2.1",
      "input": [
        {
          "type": "video",
          "uri": "https://www.youtube.com/watch?v=UTdfxFyOQTI",
          "mime_type": "video/mp4"
        },
        {
          "type": "text",
          "text": "Generate a poster image that captures the key themes of this video."
        }
      ],
      "response_format": {
        "type": "image",
        "aspect_ratio": "16:9"
      }
    }'
  ```

  {% /tab %}

  {% tab label="CLI" %}
  ```bash
  gemini-api image "Generate a poster image that captures the key themes of this video." \
    -i "https://www.youtube.com/watch?v=UTdfxFyOQTI" \
    --aspect-ratio 16:9 \
    --out video_poster.png
  ```

  {% /tab %}

{% /tabs %}

![AI-generated infographic from a youtube video](https://www.gstatic.com/cloud-cms/f0d79a97f2742cf79b96cc961e8625bb.jpg)### Generate images up to 4K resolution  {% id="generate-4k-images" %}

Gemini 3 image models generate 1K images by default but can also output 2K,
4K, and 512px (05.K) (Gemini 3.1 Flash Image only) images. To generate higher
resolution assets, specify the `image_size` in the `response_format`.

You must use an uppercase 'K' (e.g. 512px (05.K), 1K, 2K, 4K). Lowercase
parameters (e.g., 1k) will be rejected.

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  from google.genai import types
  import base64
  
  prompt = "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English."
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input=prompt,
      response_format={
          "type": "image",
          "mime_type": "image/jpeg",
          "aspect_ratio": "1:1",
          "image_size": "1K"
      },
  )
  
  print(interaction.output_text)
  
  with open("butterfly.png", "wb") as f:
      f.write(base64.b64decode(interaction.output_image.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  import * as fs from "node:fs";
  
  async function main() {
    const ai = new GoogleGenAI({});
  
    const interaction = await ai.interactions.create({
      model: "gemini-nano-banana-2.1",
      input: "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English.",
      response_format: {
        type: "image",
        mime_type: "image/png",
        aspect_ratio: "1:1",
        image_size: "1K",
      },
    });
  
    console.log(interaction.output_text);
  
    if (interaction.output_image && interaction.output_image.data) {
      const buffer = Buffer.from(interaction.output_image.data, 'base64');
      fs.writeFileSync('butterfly.png', buffer);
    }
  }
  
  await main();
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Api-Revision: 2026-05-20" \
    -d '{
      "model": "gemini-nano-banana-2.1",
      "input": "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English.",
      "response_format": {
        "type": "image",
        "mime_type": "image/jpeg",
        "aspect_ratio": "1:1",
        "image_size": "1K"
      }
    }'
  ```

  {% /tab %}

  {% tab label="CLI" %}
  ```bash
  gemini-api image "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English." \
    --output-mime-type image/jpeg \
    --aspect-ratio 1:1 \
    --image-size 1K \
    --out butterfly.jpg
  ```

  {% /tab %}

{% /tabs %}

The following is an example image generated from this prompt:

![AI-generated Da Vinci style anatomical sketch of a dissected Monarch
butterfly.](https://www.gstatic.com/cloud-cms/c111455910e372aa2c46d7cb7b0c5d85.png)### Thinking Process  {% id="thinking-process" %}

Gemini 3 image models are thinking models that use a reasoning
process ("Thinking") for complex prompts. This feature is enabled by default and
cannot be disabled in the API. To learn more about the thinking process, see
the [Gemini Thinking](/docs/thinking) guide.

The model generates up to two interim images to test composition and logic. The
last image within Thinking is also the final rendered image.

You can check the thoughts that lead to the final image being produced.

{% tabs %}
  {% tab label="Python" %}
  ```python
  for step in interaction.steps:
      if step.type == "thought":
          for content_block in step.summary:
              if content_block.type == "text":
                  print(content_block.text)
              elif content_block.type == "image":
                  image = Image.open(io.BytesIO(base64.b64decode(content_block.data)))
                  image.show()
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  for (const step of interaction.steps) {
    if (step.type === "thought") {
      for (const contentBlock of step.summary) {
        if (contentBlock.type === "text") {
          console.log(contentBlock.text);
        } else if (contentBlock.type === "image") {
          if (contentBlock.data) {
            const buffer = Buffer.from(contentBlock.data, "base64");
            fs.writeFileSync("thought_image.png", buffer);
          }
        }
      }
    }
  }
  ```

  {% /tab %}


{% /tabs %}

#### Interleaved text and images  {% id="interleaved-output" %}

While standard image generation models only output images, some advanced Gemini
3 models (such as `gemini-3-pro-image`) can generate interleaved
content-like stories or instructional guides containing both text blocks and
illustrations inside the same response.

Because the output is complex and interleaved, convenience properties like
`.output_image` or `.output_text` will not capture the full sequence. To access
and save interleaved content, you must manually iterate over `steps`:

{% tabs %}
  {% tab label="Python" %}
  ```python
  interaction = client.interactions.create(
      model="gemini-3-pro-image",
      input="Write the story of the lifecycle of a monarch butterfly, interleave illustrations",
  )
  
  image_counter = 1
  for step in interaction.steps:
      if step.type == "model_output":
          for content_block in step.content:
              if content_block.type == "text":
                  print(content_block.text)
              elif content_block.type == "image":
                  filename = f"butterfly_lifecycle_{image_counter}.png"
                  with open(filename, "wb") as f:
                      f.write(base64.b64decode(content_block.data))
                  print(f"\n[Saved illustration: {filename}]\n")
                  image_counter += 1
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  const interaction = await ai.interactions.create({
      model: "gemini-3-pro-image",
      input: "Write the story of the lifecycle of a monarch butterfly, interleave illustrations",
  });
  
  let imageCounter = 1;
  for (const step of interaction.steps) {
    if (step.type === "model_output") {
      for (const contentBlock of step.content || []) {
        if (contentBlock.type === "text") {
          console.log(contentBlock.text);
        } else if (contentBlock.type === "image") {
          const buffer = Buffer.from(contentBlock.data, "base64");
          const filename = `butterfly_lifecycle_${imageCounter}.png`;
          fs.writeFileSync(filename, buffer);
          console.log(`\n[Saved illustration: ${filename}]\n`);
          imageCounter++;
        }
      }
    }
  }
  ```

  {% /tab %}


{% /tabs %}

#### Controlling thinking levels  {% id="thinking-levels" %}

With Gemini Nano Banana 2.1, Gemini 3.1 Flash Image, and Gemini 3.1 Flash Lite
Image, you can control the amount of thinking the model uses to balance quality
and latency:

| Model | Supported thinking levels | Default |
| :--- | :--- | :--- |
| **Gemini Nano Banana 2.1** | `minimal`, `medium`, `high` | `medium` |
| **Gemini 3.1 Flash Image** | `minimal`, `high` | `minimal` |
| **Gemini 3.1 Flash Lite Image** | `minimal`, `high` | `minimal` |

{% tabs %}
  {% tab label="Python" %}
  ```python
  from google import genai
  from PIL import Image
  import base64
  import io
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input="A futuristic city built inside a giant glass bottle floating in space",
      generation_config={"thinking_level": "high"},
  )
  
  print(interaction.output_text)
  
  image = Image.open(io.BytesIO(base64.b64decode(interaction.output_image.data)))
  
  image.show()
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  import * as fs from "node:fs";
  
  async function main() {
    const ai = new GoogleGenAI({});
  
    const interaction = await ai.interactions.create({
      model: "gemini-nano-banana-2.1",
      input: "A futuristic city built inside a giant glass bottle floating in space",
      generation_config: { thinking_level: "high" },
    });
  
    console.log(interaction.output_text);
  
    if (interaction.output_image && interaction.output_image.data) {
      const buffer = Buffer.from(interaction.output_image.data, 'base64');
      fs.writeFileSync('image.png', buffer);
    }
  }
  await main();
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```shell
  curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Api-Revision: 2026-05-20" \
    -d '{
      "model": "gemini-nano-banana-2.1",
      "input": "A futuristic city built inside a giant glass bottle floating in space",
      "generation_config": {
        "thinking_level": "high"
      }
    }'
  ```

  {% /tab %}

  {% tab label="CLI" %}
  ```bash
  gemini-api image "A futuristic city built inside a giant glass bottle floating in space" \
    --body '{"generation_config":{"thinking_level":"high"}}' \
    --out bottle_city.png
  ```

  {% /tab %}

{% /tabs %}

Note that thinking tokens are billed by default for thinking models, as the
[thinking process](/docs/image-generation#thinking-process) always happens by default whether you view
the process or not.

## Other image generation modes  {% id="other-modes" %}

Although Nano Banana image generation models are recommended for most use cases,
you can also explore dedicated image generation models:

* **Imagen**: Google's legacy text-to-image models (shut down).

* **[Veo](/docs/video)**: Google's video generation model.


## Generate images in batch  {% id="batch-api" %}

All of the image generation capabilities described on this page can also be
run as batch jobs using the [Batch API](/docs/batch-api).

## Limitations  {% id="limitations" %}

* For best performance, use the following languages: EN, ar-EG, de-DE, es-MX,
  fr-FR, hi-IN, id-ID, it-IT, ja-JP, ko-KR, pt-BR, ru-RU, ua-UA, vi-VN, zh-CN.

* Image generation does not support audio inputs. Video inputs are only supported for Gemini Nano Banana 2.1, Gemini 3.1 Flash Image, and Gemini 3.1 Flash Lite Image.

* The model won't always follow the exact number of image outputs that the
  user explicitly asks for.

* `gemini-2.5-flash-image` works best with up to 3 images as input, while
  `gemini-3-pro-image` supports 5 images with high fidelity, and up to
  14 images in total. `gemini-nano-banana-2.1` and `gemini-3.1-flash-image` support character
  resemblance of up to 4 characters and the fidelity of up to 10 objects in a
  single workflow.

* When generating text for an image, Gemini works best if you first generate
  the text and then ask for an image with the text.

* `gemini-nano-banana-2.1` and `gemini-3.1-flash-image` Grounding with Google Search do not support using real-world images of people from web search at this time.

* All generated images include a [SynthID watermark](https://deepmind.google/technologies/synthid/).


## Optional configurations  {% id="optional-configurations" %}

You can optionally configure the output format, aspect ratio, and image size
using the `response_format` parameter.

### Output format  {% id="output-format" %}

The model defaults to returning both text and image responses. You can configure
the response to return only the generated images (omitting the conversational
text) by specifying an image format in the `response_format` parameter.

To request multiple modalities (for example, both text and the generated image),
pass an array of format entries to `response_format` instead.

{% tabs %}
  {% tab label="Python" %}
  ```python
  interaction = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input="Write a short poem about a starry night and generate an image of it.",
      response_format=[
          {"type": "text"},
          {"type": "image"},
      ],
  )
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  const interaction = await ai.interactions.create({
    model: "gemini-nano-banana-2.1",
    input: "Write a short poem about a starry night and generate an image of it.",
    response_format: [
      { type: "text" },
      { type: "image" },
    ],
  });
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -H "Api-Revision: 2026-05-20" \
    -d '{
      "model": "gemini-nano-banana-2.1",
      "input": "Write a short poem about a starry night and generate an image of it.",
      "response_format": [
        { "type": "text" },
        { "type": "image" }
      ]
    }'
  ```

  {% /tab %}

  {% tab label="CLI" %}
  ```bash
  gemini-api image "Write a short poem about a starry night and generate an image of it." \
    --body '{"response_format":[{"type":"text"},{"type":"image"}]}' \
    --raw-response -o json
  ```

  {% /tab %}

{% /tabs %}

### Aspect ratios and image size  {% id="aspect-ratios-and-image-size" %}

By default, the model matches the output image size to that of your input image,
or otherwise generates 1:1 squares. You can control the aspect ratio and the
size of the output image using the `aspect_ratio` and `image_size` fields under
`response_format` when `type` is set to `"image"`.

{% tabs %}
  {% tab label="Python" %}
  ```python
  interaction = client.interactions.create(
      model="gemini-nano-banana-2.1",
      input=prompt,
      response_format={
          "type": "image",
          "aspect_ratio": "16:9",
          "image_size": "2K",
      },
  )
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  const interaction = await ai.interactions.create({
      model: "gemini-nano-banana-2.1",
      input: prompt,
      response_format: {
        type: "image",
        aspect_ratio: "16:9",
        image_size: "2K",
      },
    });
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -H "Api-Revision: 2026-05-20" \
    -d '{
      "model": "gemini-nano-banana-2.1",
      "input": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme",
      "response_format": {
        "type": "image",
        "aspect_ratio": "16:9",
        "image_size": "2K"
      }
    }'
  ```

  {% /tab %}

  {% tab label="CLI" %}
  ```bash
  gemini-api image "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme" \
    --aspect-ratio 16:9 \
    --image-size 2K \
    --out generated_image.png
  ```

  {% /tab %}

{% /tabs %}

The different ratios available and the size of the image generated are listed in
the following tables:

{% tabs %}
  {% tab label="Nano Banana 2.1" %}
  {% table %}
  * Aspect ratio {% align="left" %}
  * 1K resolution {% align="left" %}
  * 1K tokens {% align="left" %}
  * 2K resolution {% align="left" %}
  * 2K tokens {% align="left" %}
  * 4K resolution {% align="left" %}
  * 4K tokens {% align="left" %}

  ---

  * **1:1** {% align="left" %}
  * 1024x1024 {% align="left" %}
  * 1120 {% align="left" %}
  * 2048x2048 {% align="left" %}
  * 1680 {% align="left" %}
  * 4096x4096 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **1:4** {% align="left" %}
  * 512x2048 {% align="left" %}
  * 1120 {% align="left" %}
  * 1024x4096 {% align="left" %}
  * 1680 {% align="left" %}
  * 2048x8192 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **1:8** {% align="left" %}
  * 384x3072 {% align="left" %}
  * 1120 {% align="left" %}
  * 768x6144 {% align="left" %}
  * 1680 {% align="left" %}
  * 1536x12288 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **2:3** {% align="left" %}
  * 848x1264 {% align="left" %}
  * 1120 {% align="left" %}
  * 1696x2528 {% align="left" %}
  * 1680 {% align="left" %}
  * 3392x5056 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **3:2** {% align="left" %}
  * 1264x848 {% align="left" %}
  * 1120 {% align="left" %}
  * 2528x1696 {% align="left" %}
  * 1680 {% align="left" %}
  * 5056x3392 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **3:4** {% align="left" %}
  * 896x1200 {% align="left" %}
  * 1120 {% align="left" %}
  * 1792x2400 {% align="left" %}
  * 1680 {% align="left" %}
  * 3584x4800 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **4:1** {% align="left" %}
  * 2048x512 {% align="left" %}
  * 1120 {% align="left" %}
  * 4096x1024 {% align="left" %}
  * 1680 {% align="left" %}
  * 8192x2048 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **4:3** {% align="left" %}
  * 1200x896 {% align="left" %}
  * 1120 {% align="left" %}
  * 2400x1792 {% align="left" %}
  * 1680 {% align="left" %}
  * 4800x3584 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **4:5** {% align="left" %}
  * 928x1152 {% align="left" %}
  * 1120 {% align="left" %}
  * 1856x2304 {% align="left" %}
  * 1680 {% align="left" %}
  * 3712x4608 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **5:4** {% align="left" %}
  * 1152x928 {% align="left" %}
  * 1120 {% align="left" %}
  * 2304x1856 {% align="left" %}
  * 1680 {% align="left" %}
  * 4608x3712 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **8:1** {% align="left" %}
  * 3072x384 {% align="left" %}
  * 1120 {% align="left" %}
  * 6144x768 {% align="left" %}
  * 1680 {% align="left" %}
  * 12288x1536 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **9:16** {% align="left" %}
  * 768x1376 {% align="left" %}
  * 1120 {% align="left" %}
  * 1536x2752 {% align="left" %}
  * 1680 {% align="left" %}
  * 3072x5504 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **16:9** {% align="left" %}
  * 1376x768 {% align="left" %}
  * 1120 {% align="left" %}
  * 2752x1536 {% align="left" %}
  * 1680 {% align="left" %}
  * 5504x3072 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **21:9** {% align="left" %}
  * 1584x672 {% align="left" %}
  * 1120 {% align="left" %}
  * 3168x1344 {% align="left" %}
  * 1680 {% align="left" %}
  * 6336x2688 {% align="left" %}
  * 2520 {% align="left" %}
  {% /table %}

  {% /tab %}

  {% tab label="3.1 Flash Image" %}
  {% table %}
  * Aspect ratio {% align="left" %}
  * 512px resolution {% align="left" %}
  * 0.5K tokens {% align="left" %}
  * 1K resolution {% align="left" %}
  * 1K tokens {% align="left" %}
  * 2K resolution {% align="left" %}
  * 2K tokens {% align="left" %}
  * 4K resolution {% align="left" %}
  * 4K tokens {% align="left" %}

  ---

  * **1:1** {% align="left" %}
  * 512x512 {% align="left" %}
  * 747 {% align="left" %}
  * 1024x1024 {% align="left" %}
  * 1120 {% align="left" %}
  * 2048x2048 {% align="left" %}
  * 1680 {% align="left" %}
  * 4096x4096 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **1:4** {% align="left" %}
  * 256x1024 {% align="left" %}
  * 747 {% align="left" %}
  * 512x2048 {% align="left" %}
  * 1120 {% align="left" %}
  * 1024x4096 {% align="left" %}
  * 1680 {% align="left" %}
  * 2048x8192 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **1:8** {% align="left" %}
  * 192x1536 {% align="left" %}
  * 747 {% align="left" %}
  * 384x3072 {% align="left" %}
  * 1120 {% align="left" %}
  * 768x6144 {% align="left" %}
  * 1680 {% align="left" %}
  * 1536x12288 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **2:3** {% align="left" %}
  * 424x632 {% align="left" %}
  * 747 {% align="left" %}
  * 848x1264 {% align="left" %}
  * 1120 {% align="left" %}
  * 1696x2528 {% align="left" %}
  * 1680 {% align="left" %}
  * 3392x5056 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **3:2** {% align="left" %}
  * 632x424 {% align="left" %}
  * 747 {% align="left" %}
  * 1264x848 {% align="left" %}
  * 1120 {% align="left" %}
  * 2528x1696 {% align="left" %}
  * 1680 {% align="left" %}
  * 5056x3392 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **3:4** {% align="left" %}
  * 448x600 {% align="left" %}
  * 747 {% align="left" %}
  * 896x1200 {% align="left" %}
  * 1120 {% align="left" %}
  * 1792x2400 {% align="left" %}
  * 1680 {% align="left" %}
  * 3584x4800 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **4:1** {% align="left" %}
  * 1024x256 {% align="left" %}
  * 747 {% align="left" %}
  * 2048x512 {% align="left" %}
  * 1120 {% align="left" %}
  * 4096x1024 {% align="left" %}
  * 1680 {% align="left" %}
  * 8192x2048 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **4:3** {% align="left" %}
  * 600x448 {% align="left" %}
  * 747 {% align="left" %}
  * 1200x896 {% align="left" %}
  * 1120 {% align="left" %}
  * 2400x1792 {% align="left" %}
  * 1680 {% align="left" %}
  * 4800x3584 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **4:5** {% align="left" %}
  * 464x576 {% align="left" %}
  * 747 {% align="left" %}
  * 928x1152 {% align="left" %}
  * 1120 {% align="left" %}
  * 1856x2304 {% align="left" %}
  * 1680 {% align="left" %}
  * 3712x4608 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **5:4** {% align="left" %}
  * 576x464 {% align="left" %}
  * 747 {% align="left" %}
  * 1152x928 {% align="left" %}
  * 1120 {% align="left" %}
  * 2304x1856 {% align="left" %}
  * 1680 {% align="left" %}
  * 4608x3712 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **8:1** {% align="left" %}
  * 1536x192 {% align="left" %}
  * 747 {% align="left" %}
  * 3072x384 {% align="left" %}
  * 1120 {% align="left" %}
  * 6144x768 {% align="left" %}
  * 1680 {% align="left" %}
  * 12288x1536 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **9:16** {% align="left" %}
  * 384x688 {% align="left" %}
  * 747 {% align="left" %}
  * 768x1376 {% align="left" %}
  * 1120 {% align="left" %}
  * 1536x2752 {% align="left" %}
  * 1680 {% align="left" %}
  * 3072x5504 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **16:9** {% align="left" %}
  * 688x384 {% align="left" %}
  * 747 {% align="left" %}
  * 1376x768 {% align="left" %}
  * 1120 {% align="left" %}
  * 2752x1536 {% align="left" %}
  * 1680 {% align="left" %}
  * 5504x3072 {% align="left" %}
  * 2520 {% align="left" %}

  ---

  * **21:9** {% align="left" %}
  * 792x168 {% align="left" %}
  * 747 {% align="left" %}
  * 1584x672 {% align="left" %}
  * 1120 {% align="left" %}
  * 3168x1344 {% align="left" %}
  * 1680 {% align="left" %}
  * 6336x2688 {% align="left" %}
  * 2520 {% align="left" %}
  {% /table %}

  {% /tab %}

  {% tab label="3 Pro Image" %}
  {% table %}
  * Aspect ratio {% align="left" %}
  * 1K resolution {% align="left" %}
  * 1K tokens {% align="left" %}
  * 2K resolution {% align="left" %}
  * 2K tokens {% align="left" %}
  * 4K resolution {% align="left" %}
  * 4K tokens {% align="left" %}

  ---

  * **1:1** {% align="left" %}
  * 1024x1024 {% align="left" %}
  * 1120 {% align="left" %}
  * 2048x2048 {% align="left" %}
  * 1120 {% align="left" %}
  * 4096x4096 {% align="left" %}
  * 2000 {% align="left" %}

  ---

  * **2:3** {% align="left" %}
  * 848x1264 {% align="left" %}
  * 1120 {% align="left" %}
  * 1696x2528 {% align="left" %}
  * 1120 {% align="left" %}
  * 3392x5056 {% align="left" %}
  * 2000 {% align="left" %}

  ---

  * **3:2** {% align="left" %}
  * 1264x848 {% align="left" %}
  * 1120 {% align="left" %}
  * 2528x1696 {% align="left" %}
  * 1120 {% align="left" %}
  * 5056x3392 {% align="left" %}
  * 2000 {% align="left" %}

  ---

  * **3:4** {% align="left" %}
  * 896x1200 {% align="left" %}
  * 1120 {% align="left" %}
  * 1792x2400 {% align="left" %}
  * 1120 {% align="left" %}
  * 3584x4800 {% align="left" %}
  * 2000 {% align="left" %}

  ---

  * **4:3** {% align="left" %}
  * 1200x896 {% align="left" %}
  * 1120 {% align="left" %}
  * 2400x1792 {% align="left" %}
  * 1120 {% align="left" %}
  * 4800x3584 {% align="left" %}
  * 2000 {% align="left" %}

  ---

  * **4:5** {% align="left" %}
  * 928x1152 {% align="left" %}
  * 1120 {% align="left" %}
  * 1856x2304 {% align="left" %}
  * 1120 {% align="left" %}
  * 3712x4608 {% align="left" %}
  * 2000 {% align="left" %}

  ---

  * **5:4** {% align="left" %}
  * 1152x928 {% align="left" %}
  * 1120 {% align="left" %}
  * 2304x1856 {% align="left" %}
  * 1120 {% align="left" %}
  * 4608x3712 {% align="left" %}
  * 2000 {% align="left" %}

  ---

  * **9:16** {% align="left" %}
  * 768x1376 {% align="left" %}
  * 1120 {% align="left" %}
  * 1536x2752 {% align="left" %}
  * 1120 {% align="left" %}
  * 3072x5504 {% align="left" %}
  * 2000 {% align="left" %}

  ---

  * **16:9** {% align="left" %}
  * 1376x768 {% align="left" %}
  * 1120 {% align="left" %}
  * 2752x1536 {% align="left" %}
  * 1120 {% align="left" %}
  * 5504x3072 {% align="left" %}
  * 2000 {% align="left" %}

  ---

  * **21:9** {% align="left" %}
  * 1584x672 {% align="left" %}
  * 1120 {% align="left" %}
  * 3168x1344 {% align="left" %}
  * 1120 {% align="left" %}
  * 6336x2688 {% align="left" %}
  * 2000 {% align="left" %}
  {% /table %}

  {% /tab %}

  {% tab label="Gemini 2.5 Flash Image" %}
  {% table %}
  * Aspect ratio
  * Resolution
  * Tokens

  ---

  * 1:1
  * 1024x1024
  * 1290

  ---

  * 2:3
  * 832x1248
  * 1290

  ---

  * 3:2
  * 1248x832
  * 1290

  ---

  * 3:4
  * 864x1184
  * 1290

  ---

  * 4:3
  * 1184x864
  * 1290

  ---

  * 4:5
  * 896x1152
  * 1290

  ---

  * 5:4
  * 1152x896
  * 1290

  ---

  * 9:16
  * 768x1344
  * 1290

  ---

  * 16:9
  * 1344x768
  * 1290

  ---

  * 21:9
  * 1536x672
  * 1290
  {% /table %}

  {% /tab %}

{% /tabs %}

## When to use Imagen  {% id="choose-a-model" %}

{% callout type="warning" %}
  Imagen models are shut down. Use Nano Banana models for all image generation tasks.

{% /callout %}

Imagen is shut down and no longer available through the Gemini API. Use Nano Banana for image generation and editing.

## What's next  {% id="what-is-next" %}

* Check out the [Veo guide](/docs/video) to learn how to generate
  videos with the Gemini API.

* To learn more about Gemini models, see [Gemini models](/docs/models).


