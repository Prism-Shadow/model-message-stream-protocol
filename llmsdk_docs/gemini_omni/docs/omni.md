> Source: https://aistudio.google.com/docs/omni (raw markdown: https://aistudio.google.com/docs/omni.md; https://ai.google.dev/gemini-api/docs/omni.md.txt redirects there) (snapshot 2026-11-06)
>
> The site's "AI Agent Context" preamble and the Java and Go samples removed; everything else verbatim.

# Generate and edit videos with Gemini Omni Flash

Gemini Omni 1.2 Flash (`gemini-omni-1.2-flash`) is a multimodal model built for
fast video generation, conversational editing, and cinematic control. Key
capabilities include:

*   **Native multimodality:** Omni processes text, image, and video inputs to
  generate synchronized video and native audio up to 15 seconds long.
*   **Conversational editing and extension:** Through the [Interactions
  API](/docs/interactions-overview), you can refine, edit, and extend videos
  across multiple turns using natural language. Describe what you want to
  change or how the scene should continue, and Omni updates the video while
  preserving the rest of the scene.
*   **Character consistency and world knowledge:** Omni combines an
  understanding of physics and world knowledge with reference-to-video
  consistency, using up to 6 reference images to keep characters and objects
  consistent across shots.

{% callout type="note" %}
  `gemini-omni-1.1-flash` remains available during a 4-week transition window.
  Effective **December 3, 2026**, all API requests to `gemini-omni-1.1-flash`
  automatically route to `gemini-omni-1.2-flash` with no code changes required
  and are billed at the lower [Gemini Omni 1.2 Flash
  rates](/docs/pricing#gemini-omni-1.2-flash).

{% /callout %}

## Text to video generation  {% id="text-to-video-generation" %}

Generate a video from a text prompt. The model generates a video with audio
based on your text description. Write prompts with details like scene description,
camera movement, lighting and mood for best results.

{% tabs %}
  {% tab label="Python" %}
  ```python
  import base64
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input="A marble rolling fast on a chain reaction style track, continuous smooth shot."
  )
  with open("marble.mp4", "wb") as f:
      f.write(base64.b64decode(interaction.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: 'A marble rolling fast on a chain reaction style track, continuous smooth shot.',
  });
  
  if (interaction.output_video?.data) {
    fs.writeFileSync('marble.mp4', Buffer.from(interaction.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
   "model": "gemini-omni-1.2-flash",
   "input": "A marble rolling fast on a chain reaction style track, continuous smooth shot."
  }'
  ```

  {% /tab %}

{% /tabs %}

{% video id="6DRkXO9nM7g" title=Watch video (Reference) /%}

### REST response schema  {% id="rest-response-schema" %}

The convenience field `interaction.output_video` is **SDK-only**.
Get the video output from the `steps` array when using the REST API directly.

**Raw REST JSON structure:**

```json
{
  "steps": [
    { "type": "user_input", "content": [{"type": "text", "text": "..."}] },
    { "type": "thought", "content": [{"text": "...", "type": "thought"}] },
    {
      "type": "model_output",
      "content": [
        {
          "type": "video",
          "mime_type": "video/mp4",
          "data": "AAAAIGZ0eXBpc29t..." // Base64 encoded video data
        }
      ]
    }
  ],
  "id": "v1_...",
  "status": "completed",
  "model": "gemini-omni-1.2-flash",
  "object": "interaction"
}
```

### Control aspect ratio  {% id="control-aspect-ratio" %}

Set the `aspect_ratio` to `"9:16"` to create portrait videos. Landscape (16:9)
is the default.

{% tabs %}
  {% tab label="Python" %}
  ```python
  import base64
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input="A futuristic city with neon lights and flying cars, cyberpunk style",
      response_format={
          "type": "video",  # optional
          "aspect_ratio": "9:16"  # Supported values: "9:16", "16:9"
      }
  )
  with open("example.mp4", "wb") as f:
      f.write(base64.b64decode(interaction.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: 'A futuristic city with neon lights and flying cars, cyberpunk style',
    response_format: {
      type: 'video', // optional
      aspect_ratio: '9:16' // Supported values: '9:16', '16:9'
    },
  });
  
  if (interaction.output_video?.data) {
    fs.writeFileSync('example.mp4', Buffer.from(interaction.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
   "model": "gemini-omni-1.2-flash",
   "input": "A futuristic city with neon lights and flying cars, cyberpunk style",
   "response_format": {
     "type": "video",
     "aspect_ratio": "9:16"
   }
  }'
  ```

  {% /tab %}

{% /tabs %}

### Output resolution  {% id="output-resolution" %}

Control the output resolution of your generated video using the `resolution`
parameter in `response_format`. The default resolution is 720p.

| Value | Description |
| :--- | :--- |
| `360p` | 360p output resolution |
| `720p` | 720p output resolution (default) |
| `1080p` | 1080p output (upscaled) |
| `4k` | 4K output (upscaled) |

{% tabs %}
  {% tab label="Python" %}
  ```python
  import base64
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input="A drone shot of a mountain landscape at sunrise.",
      response_format={
          "type": "video",
          "resolution": "1080p",
      },
  )
  with open("hires.mp4", "wb") as f:
      f.write(base64.b64decode(interaction.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: 'A drone shot of a mountain landscape at sunrise.',
    response_format: {
      type: 'video',
      resolution: '1080p',
    },
  });
  
  if (interaction.output_video?.data) {
    fs.writeFileSync('hires.mp4', Buffer.from(interaction.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
   "model": "gemini-omni-1.2-flash",
   "input": "A drone shot of a mountain landscape at sunrise.",
   "response_format": {
     "type": "video",
     "resolution": "1080p"
   }
  }'
  ```

  {% /tab %}

{% /tabs %}

{% video src="https://storage.googleapis.com/generativeai-downloads/videos/omni_misty_mountains_1080p.mp4" type="video/mp4" /%}

### Control video duration  {% id="control-video-duration" %}

You can set the video `duration` in `response_format` to any whole second from 3
to 15 seconds (for example, `"15s"`). When you don't set the duration, the model
defaults to 10 seconds. If you set a duration in `response_format`, the model
uses that value instead of any length mentioned in your text prompt. Setting a
duration over 15 seconds returns an invalid argument error.

{% callout type="note" %}
  *   [First and last frame interpolation](/docs/omni#first-and-last-frame-interpolation)
    and per-turn [video extension](/docs/omni#video-extension) support durations
    from 3 to 10 seconds (up to 30 seconds total for extended videos).
  *   Videos from 11 to 15 seconds support 1 reference video (up to 3 seconds
    long), while videos from 3 to 10 seconds support up to 3 reference videos.
    You can use up to 6 reference images across all durations. See
    [Limitations](/docs/omni#limitations) for details.

{% /callout %}

{% tabs %}
  {% tab label="Python" %}
  ```python
  import base64
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input="A single unbroken tracking shot following a paper airplane gliding through a bustling library.",
      response_format={
          "type": "video",
          "duration": "15s",  # Supported values: "3s" to "15s" (default: "10s")
      },
  )
  with open("library_flight.mp4", "wb") as f:
      f.write(base64.b64decode(interaction.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: 'A single unbroken tracking shot following a paper airplane gliding through a bustling library.',
    response_format: {
      type: 'video',
      duration: '15s', // Supported values: '3s' to '15s' (default: '10s')
    },
  });
  
  if (interaction.output_video?.data) {
    fs.writeFileSync('library_flight.mp4', Buffer.from(interaction.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
   "model": "gemini-omni-1.2-flash",
   "input": "A single unbroken tracking shot following a paper airplane gliding through a bustling library.",
   "response_format": {
     "type": "video",
     "duration": "15s"
   }
  }'
  ```

  {% /tab %}

{% /tabs %}

## Image to video generation  {% id="image-to-video-generation" %}

You can provide a reference image with your text prompt. Depending on your
prompt, the model will decide
how to use the image. This is useful for bringing product shots, illustrations,
or photographs to life.

The following example shows how to use the reference image of a drawing of a
fish jumping out of water:

![](https://www.gstatic.com/cloud-cms/04194087dddd37bc098812305b1d8fb1.png)

With the following prompt:

```none
turn this into realistic footage, using the drawing only as a guide for movement, do not show the drawing in the final video
```

To generate a realistic video of the drawing.

{% tabs %}
  {% tab label="Python" %}
  ```python
  import base64
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input=[
          {"type": "image", "data": base64_image, "mime_type": "image/jpeg"},
          {"type": "text", "text": "turn this into realistic footage, using the drawing only as a guide for movement, do not show the drawing in the final video"}
      ],
  )
  with open("clownfish.mp4", "wb") as f:
      f.write(base64.b64decode(interaction.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: [
      { type: 'image', data: base64Image, mime_type: 'image/jpeg' },
      { type: 'text', text: 'turn this into realistic footage, using the drawing only as a guide for movement, do not show the drawing in the final video' }
    ]
  });
  
  if (interaction.output_video?.data) {
    fs.writeFileSync('clownfish.mp4', Buffer.from(interaction.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
   "model": "gemini-omni-1.2-flash",
   "input": [
     {"type": "image", "data": "'"$BASE64_IMAGE"'", "mime_type": "image/jpeg"},
     {"type": "text", "text": "turn this into realistic footage, using the drawing only as a guide for movement, do not show the drawing in the final video"}
   ]
  }'
  ```

  {% /tab %}

{% /tabs %}

{% video id="zTNIIZ0X7mA" title=Watch video (Reference) /%}

{% callout type="note" %}
  For best results with image-to-video, use high-resolution images and
  provide specific motion descriptions. Vague prompts like "make it move" produce
  less compelling results than detailed descriptions of the camera movement,
  subject motion, and environmental effects.

{% /callout %}

### First and last frame interpolation  {% id="first-and-last-frame-interpolation" %}

Gemini Omni Flash supports video interpolation, allowing you to generate a
video that transitions smoothly between a starting image (first frame) and an
ending image (last frame).

Provide two images in the `input` list and describe the desired transition in
your prompt. The model will animate the scene from the first frame to the
ending frame.

{% callout type="important" %}
  First and last frame interpolation supports video durations from 3 to 10
  seconds. If you pass both a first and last frame and set a duration over 10
  seconds, the API returns an invalid argument error. Single-image generation
  supports up to 15 seconds.

{% /callout %}

{% tabs %}
  {% tab label="Python" %}
  ```python
  import base64
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input=[
          {"type": "image", "data": first_frame_b64, "mime_type": "image/jpeg"},
          {"type": "image", "data": last_frame_b64, "mime_type": "image/jpeg"},
          {"type": "text", "text": "A smooth cinematic transition from a lush green forest at sunrise to a snowy forest under a starry night sky."}
      ],
  )
  with open("interpolation.mp4", "wb") as f:
      f.write(base64.b64decode(interaction.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  const firstFrameB64 = '...';
  const lastFrameB64 = '...';
  
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: [
      { type: 'image', data: firstFrameB64, mime_type: 'image/jpeg' },
      { type: 'image', data: lastFrameB64, mime_type: 'image/jpeg' },
      { type: 'text', text: 'A smooth cinematic transition from a lush green forest at sunrise to a snowy forest under a starry night sky.' }
    ]
  });
  
  if (interaction.output_video?.data) {
    fs.writeFileSync('interpolation.mp4', Buffer.from(interaction.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
   "model": "gemini-omni-1.2-flash",
   "input": [
     {"type": "image", "data": "'"$FIRST_FRAME_B64"'", "mime_type": "image/jpeg"},
     {"type": "image", "data": "'"$LAST_FRAME_B64"'", "mime_type": "image/jpeg"},
     {"type": "text", "text": "A smooth cinematic transition from a lush green forest at sunrise to a snowy forest under a starry night sky."}
   ]
  }'
  ```

  {% /tab %}

{% /tabs %}

{% video src="https://storage.googleapis.com/generativeai-downloads/videos/omni_keyframe_interpolation.mp4" type="video/mp4" /%}

### Subject reference  {% id="subject-reference" %}

You can generate a video incorporating specific subjects provided as reference
images. Gemini Omni 1.2 Flash supports up to 6 reference images per request (up
to 3 images per character for up to 2 characters) to keep character likeness,
attire, and objects consistent across shots. For example, the following code
provides 2 images of a cat and yarn to generate a video of the cat playing with
the yarn.

{% tabs %}
  {% tab label="Python" %}
  ```python
  import base64
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input=[
          {"type": "image", "data": cat_b64, "mime_type": "image/png"},
          {"type": "image", "data": yarn_b64, "mime_type": "image/png"},
          {"type": "text", "text": "A cat playfully batting at a ball of yarn."}
      ],
  )
  with open("cat.mp4", "wb") as f:
      f.write(base64.b64decode(interaction.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: [
      { type: 'image', data: catData, mime_type: 'image/png' },
      { type: 'image', data: yarnData, mime_type: 'image/png' },
      { type: 'text', text: 'A cat playfully batting at a ball of yarn.' }
    ]
  });
  
  if (interaction.output_video?.data) {
    fs.writeFileSync('cat.mp4', Buffer.from(interaction.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
   "model": "gemini-omni-1.2-flash",
   "input": [
     {"type": "image", "data": "'"$CAT_B64"'", "mime_type": "image/png"},
     {"type": "image", "data": "'"$YARN_B64"'", "mime_type": "image/png"},
     {"type": "text", "text": "A cat playfully batting at a ball of yarn."}
   ]
  }'
  ```

  {% /tab %}

{% /tabs %}

### Tasks parameter  {% id="tasks-parameter" %}

By default, the model infers the generation mode and media roles directly from
your natural-language prompt. If prompting alone doesn't select the intended
mode, set the `task` parameter in `video_config` as a fallback (for example,
`image_to_video`).

{% callout type="note" %}
  Always try natural-language prompting without `task` first. Setting `task` adds strict constraints, such as limiting input images or locking how multiple media inputs combine. Use `task` only as a fallback when prompting alone doesn't select the intended mode.

{% /callout %}

{% callout type="warning" %}
  Do not include control strings (such as `<FIRST_FRAME>`, `<LAST_FRAME>`, `<IMAGE_REF_0>`, or `<VIDEO_REF_0>`) in your text prompts. These tags are deprecated and unsupported in future models. Describe how each image or video should be used in natural language instead.

{% /callout %}

The following are allowed values:

*   `text_to_video`
*   `image_to_video`
*   `reference_to_video`
*   `edit`
*   `extend`

The following example shows how to set this for the previously shown image
to video example.

{% tabs %}
  {% tab label="Python" %}
  ```python
  import base64
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input=[
          {"type": "image", "data": base64_image, "mime_type": "image/jpeg"},
          {"type": "text", "text": "turn this into realistic footage, using the drawing only as a guide for movement, do not show the drawing in the final video"}
      ],
      generation_config={
        "video_config": {
          "task": "image_to_video",
        }
      },
  )
  with open("example.mp4", "wb") as f:
      f.write(base64.b64decode(interaction.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: [
      { type: 'image', data: base64Image, mime_type: 'image/jpeg' },
      { type: 'text', text: 'turn this into realistic footage, using the drawing only as a guide for movement, do not show the drawing in the final video' }
    ],
    generation_config: {
      video_config: {
        task: 'image_to_video',
      }
    }
  });
  
  if (interaction.output_video?.data) {
    fs.writeFileSync('example.mp4', Buffer.from(interaction.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "gemini-omni-1.2-flash",
      "input": [
        {
          "type": "image",
          "data": "'"$BASE64_IMAGE"'",
          "mime_type": "image/jpeg"
        },
        {
          "type": "text",
          "text": "turn this into realistic footage, using the drawing only as a guide for movement, do not show the drawing in the final video"
        }
      ],
      "generation_config": {
        "video_config": {
          "task": "image_to_video"
        }
      }
    }'
  ```

  {% /tab %}

{% /tabs %}

## Stateful video editing  {% id="stateful-video-editing" %}

Generate a video and edit it iteratively using follow-up prompts. Each turn
builds on the previous result. The model remembers the video context, applying
your changes while preserving elements you did not mention. Use the
`previous_interaction_id` to track the conversation history and edit generated
videos up to 15 seconds long without re-uploading the previous video.

{% callout type="note" %}
  See [Limitations](/docs/omni#limitations) for a detailed list of restrictions
  for video editing.

{% /callout %}

The following example demonstrates how to generate a first video then edit it:

{% tabs %}
  {% tab label="Python" %}
  ```python
  import base64
  from google import genai
  
  client = genai.Client()
  
  # Turn 1: Generate initial video
  res1 = client.interactions.create(model="gemini-omni-1.2-flash", input="A woman playing violin outdoors.")
  
  # Turn 2: Edit the previous video
  res2 = client.interactions.create(
      model="gemini-omni-1.2-flash",
      previous_interaction_id=res1.id,
      input="Make the violin invisible."
  )
  with open("example.mp4", "wb") as f:
      f.write(base64.b64decode(res2.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  // Turn 1: Generate initial video
  const res1 = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: 'A woman playing violin outdoors.',
  });
  
  // Turn 2: Edit the previous video
  const res2 = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    previous_interaction_id: res1.id,
    input: 'Make the violin invisible.',
  });
  
  if (res2.output_video?.data) {
    fs.writeFileSync('example.mp4', Buffer.from(res2.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
   "model": "gemini-omni-1.2-flash",
   "previous_interaction_id": "'"$PREVIOUS_ID"'",
   "input": "Make the violin invisible."
  }'
  ```

  {% /tab %}

{% /tabs %}

Example of an initial video:

{% video id="9yk4HuZmF0g" title=Watch video (Reference) /%}

Example of an edited video:

{% video id="U5GXcvq6GZY" title=Watch video (Reference) /%}

Each turn in the conversation produces a new video. The model understands
context from prior turns, letting you make incremental changes like adjusting
lighting, and swapping backgrounds, without re-describing the entire scene.

### Edit your own videos  {% id="edit-your-own-videos" %}

Upload your videos (up to 15 seconds long) using the [Files API](/docs/files) to
edit them with Gemini Omni Flash.

{% callout type="note" %}
  Editing uploaded videos is not available in all regions. See [Limitations](/docs/omni#limitations)
  section for details.

{% /callout %}

The following example shows how to edit the following original video:

{% video id="lw9MJDx9Zas" title=Watch video (Reference) /%}

{% tabs %}
  {% tab label="Python" %}
  ```python
  import time
  import base64
  from google import genai
  
  client = genai.Client()
  
  # Upload video using the file API
  video_file = client.files.upload(file="Video.mp4")
  
  while video_file.state == "PROCESSING":
      print('Waiting for video to be processed.')
      time.sleep(10)
      video_file = client.files.get(name=video_file.name)
  
  if video_file.state == "FAILED":
    raise ValueError(video_file.state)
  print(f'Video processing complete: ' + video_file.uri)
  
  # Edit your video
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input=[
          {"type": "video", "uri": video_file.uri},
          {"type": "text", "text": "When the person touches the mirror, make the mirror ripple beautifully like liquid, and the person's arm turns into reflective mirror material"}
      ],
  )
  with open("example.mp4", "wb") as f:
      f.write(base64.b64decode(interaction.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  // Upload video using the file API
  let videoFile = await ai.files.upload({
    file: 'Video.mp4',
  });
  
  while (videoFile.state === 'PROCESSING') {
    console.log('Waiting for video to be processed.');
    await new Promise(r => setTimeout(r, 10000));
    videoFile = await ai.files.get({ name: videoFile.name || '' });
  }
  
  if (videoFile.state === 'FAILED') {
    throw new Error(videoFile.state);
  }
  console.log('Video processing complete: ' + videoFile.uri);
  
  // Edit your video
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: [
      { type: 'video', uri: videoFile.uri },
      { type: 'text', text: "When the person touches the mirror, make the mirror ripple beautifully like liquid, and the person's arm turns into reflective mirror material" }
    ],
  });
  
  if (interaction.output_video?.data) {
    fs.writeFileSync('example.mp4', Buffer.from(interaction.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  #!/bin/bash
  VIDEO_B64=$(encode_file "$VIDEO_FILE")
  
  curl -sS -w "\n[HTTP %{http_code}]\n" "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d @- <<EOF > video_editing_response.json
  {
    "model": "gemini-omni-1.2-flash",
    "input": [
      {
        "type": "user_input",
        "content": [
          {
            "type": "video",
            "mime_type": "video/mp4",
            "data": "$VIDEO_B64"
          },
          {
            "type": "text",
            "text": "When the person touches the mirror, make the mirror ripple beautifully like liquid, and the person's arm turns into reflective mirror material"
          }
        ]
      }
    ],
    "response_format": { "type": "video" }
  }
  EOF
  ```

  {% /tab %}

{% /tabs %}

Example of an edited video:

{% video id="Bn-6vCl1wgQ" title=Watch video (Reference) /%}

{% callout type="note" %}
  You can also pass the data directly in base64, but since videos can be
  quite big we recommend using the File API.

{% /callout %}

## Retrieving videos with an URI  {% id="retrieving-videos-with-an-uri" %}

Use the `delivery="uri"` parameter in
`response_format` to retrieve generated videos that are larger than 4MB.
This returns a Google-hosted URI that you can poll until the
video is `ACTIVE` before downloading.

{% tabs %}
  {% tab label="Python" %}
  ```python
  import time
  from google import genai
  
  client = genai.Client()
  
  # 1. Request video via URI delivery
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input="A beautiful sunset.",
      response_format={"type": "video", "delivery": "uri"}
  )
  
  # 2. Extract file name and poll for ACTIVE state
  video_output = interaction.output_video
  file_name = video_output.uri.split("/")[-1] # Extract ID
  
  print("Waiting for video processing...")
  while True:
      f_info = client.files.get(name=f"files/{file_name}")
      if f_info.state.name == "ACTIVE":
          break
      elif f_info.state.name == "FAILED":
          raise RuntimeError("Generation failed.")
      time.sleep(5)
  
  # 3. Download the final video
  client.files.download(file=video_output.uri, destination="output.mp4")
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  const ai = new GoogleGenAI({});
  
  // 1. Request video using URI delivery
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: 'A beautiful sunset.',
    response_format: { type: 'video', delivery: 'uri' },
  });
  
  // 2. Extract filename and poll for ACTIVE state
  const videoOutput = interaction.output_video;
  const fileId = videoOutput?.uri?.match(/files\/([a-zA-Z0-9]+)/)?.[1] || '';
  const name = `files/${fileId}`;
  
  console.log("Waiting for video processing...");
  while (true) {
    const fInfo = await ai.files.get({ name });
    if (fInfo.state === 'ACTIVE') break;
    if (fInfo.state === 'FAILED') throw new Error("Generation failed.");
    await new Promise(r => setTimeout(r, 5000));
  }
  
  // 3. Download the final video
  await ai.files.download({
    file: name,
    downloadPath: 'output.mp4',
  });
  console.log("💾 Saved video to output.mp4");
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  #!/bin/bash
  
  # 1. Initial request to generate the video
  RESPONSE=$(curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/interactions?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
   "model": "gemini-omni-1.2-flash",
   "input": "A beautiful sunset over a calm ocean.",
   "response_format": {"type": "video", "delivery": "uri"}
  }')
  
  # Extract FILE_ID from the URI (e.g., "files/abc-123" -> "abc-123")
  FILE_URI=$(echo $RESPONSE | jq -r '.output_video.uri')
  FILE_ID=$(echo $FILE_URI | cut -d'/' -f2)
  
  echo "Video requested (ID: $FILE_ID). Waiting for processing..."
  
  # 2. Polling loop
  while true; do
   # Get current file status
   STATUS_JSON=$(curl -s -X GET "https://generativelanguage.googleapis.com/v1beta/files/$FILE_ID?key=$API_KEY")
   STATE=$(echo $STATUS_JSON | jq -r '.state')
  
   if [ "$STATE" == "ACTIVE" ]; then
     echo "Processing complete! Downloading..."
     break
   elif [ "$STATE" == "FAILED" ]; then
     echo "Error: Generation failed."
     exit 1
   else
     echo "Current state: $STATE... (waiting 5s)"
     sleep 5
   fi
  done
  
  # 3. Final download
  curl -L -X GET "https://generativelanguage.googleapis.com/v1beta/files/$FILE_ID:download?alt=media&key=$API_KEY" \
  --output "output.mp4"
  
  echo "Done! Video saved to output.mp4"
  ```

  {% /tab %}

{% /tabs %}

**Raw REST JSON structure (URI):**

```json
{
  "steps": [
    { "type": "user_input", "content": [{"type": "text", "text": "..."}] },
    { "type": "thought", "content": [{"text": "...", "type": "thought"}] },
    {
      "type": "model_output",
      "content": [
        {
          "type": "video",
          "mime_type": "video/mp4",
          "uri": "https://generativelanguage.googleapis.com/v1beta/files/...:download?alt=media"
        }
      ]
    }
  ],
  "id": "v1_...",
  "status": "completed",
  "model": "gemini-omni-1.2-flash",
  "object": "interaction"
}
```

{% callout type="note" %}
  Currently, calling `GET /v1beta/interactions/{id}` returns the video as
  inline base64 data in the `data` field, even if the interaction was originally
  created with `delivery: "uri"`. The `uri` field is only guaranteed to be present
  in the initial creation response or Server-Sent Events (SSE) stream.

{% /callout %}

## Video extension  {% id="video-extension" %}

Extend an existing video by generating a seamless continuation at the tail end
of the clip. Describe how you want the video to continue in your prompt, for example
`"Extend this video"` or `"Continue the scene: the camera pans across the mountains"`.
The model uses the final 10 seconds of the input video to generate a 3 to 10
second continuation (10 seconds by default, or set using `duration` in
`response_format`), up to a total video length of 30 seconds.

You can extend:

*   **Videos generated by the model (multi-turn)**: Extend a previously generated
  video by referencing its `previous_interaction_id`.
*   **Uploaded videos**: Provide an uploaded video file (via the Files API) along
  with your extension prompt.

{% tabs %}
  {% tab label="Python" %}
  ```python
  import base64
  from google import genai
  
  client = genai.Client()
  
  # Upload your video using the Files API
  video_file = client.files.upload(file="my_video.mp4")
  
  # Extend the video using prompt-based extension
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input=[
          {"type": "video", "uri": video_file.uri},
          {"type": "text", "text": "Continue the scene."}
      ],
  )
  with open("extended.mp4", "wb") as f:
      f.write(base64.b64decode(interaction.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  // Upload your video using the Files API
  let videoFile = await ai.files.upload({
    file: 'my_video.mp4',
  });
  
  while (videoFile.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 10000));
    videoFile = await ai.files.get({ name: videoFile.name || '' });
  }
  
  // Extend the video using prompt-based extension
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: [
      { type: 'video', uri: videoFile.uri },
      { type: 'text', text: 'Continue the scene.' }
    ],
  });
  
  if (interaction.output_video?.data) {
    fs.writeFileSync('extended.mp4', Buffer.from(interaction.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions?key=$API_KEY" -H "Content-Type: application/json" -d '{
   "model": "gemini-omni-1.2-flash",
   "input": [
     {"type": "video", "uri": "'"$VIDEO_URI"'"},
     {"type": "text", "text": "Continue the scene."}
   ]
  }'
  ```

  {% /tab %}

{% /tabs %}

{% video src="https://storage.googleapis.com/generativeai-downloads/videos/omni_scene_extension_base.mp4" type="video/mp4" /%}

{% video src="https://storage.googleapis.com/generativeai-downloads/videos/omni_scene_extension_extended.mp4" type="video/mp4" /%}

### Extending with reference media  {% id="extending-with-reference-media" %}

You can provide reference images in the `input` array along with your prompt to
introduce new characters or elements into the extended video:

{% tabs %}
  {% tab label="Python" %}
  ```python
  import base64
  from google import genai
  
  client = genai.Client()
  
  # Upload base video and reference image using the Files API
  video_file = client.files.upload(file="my_video.mp4")
  character_img = client.files.upload(file="character.png")
  
  # Extend the video while introducing the reference character
  interaction = client.interactions.create(
      model="gemini-omni-1.2-flash",
      input=[
          {"type": "video", "uri": video_file.uri},
          {"type": "image", "uri": character_img.uri},
          {"type": "text", "text": "Extend this video: have the character shown in the reference image enter the scene and wave."}
      ],
  )
  with open("extended_with_character.mp4", "wb") as f:
      f.write(base64.b64decode(interaction.output_video.data))
  ```

  {% /tab %}

  {% tab label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from '@google/genai';
  import * as fs from 'fs';
  const ai = new GoogleGenAI({});
  
  // Upload base video and reference image using the Files API
  let videoFile = await ai.files.upload({ file: 'my_video.mp4' });
  let characterImg = await ai.files.upload({ file: 'character.png' });
  
  while (videoFile.state === 'PROCESSING' || characterImg.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 10000));
    videoFile = await ai.files.get({ name: videoFile.name || '' });
    characterImg = await ai.files.get({ name: characterImg.name || '' });
  }
  
  // Extend the video while introducing the reference character
  const interaction = await ai.interactions.create({
    model: 'gemini-omni-1.2-flash',
    input: [
      { type: 'video', uri: videoFile.uri },
      { type: 'image', uri: characterImg.uri },
      { type: 'text', text: 'Extend this video: have the character shown in the reference image enter the scene and wave.' }
    ],
  });
  
  if (interaction.output_video?.data) {
    fs.writeFileSync('extended_with_character.mp4', Buffer.from(interaction.output_video.data, 'base64'));
  }
  ```

  {% /tab %}


  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions?key=$API_KEY" -H "Content-Type: application/json" -d '{
   "model": "gemini-omni-1.2-flash",
   "input": [
     {"type": "video", "uri": "'$VIDEO_URI'"},
     {"type": "image", "uri": "'$CHARACTER_IMG_URI'"},
     {"type": "text", "text": "Extend this video: have the character shown in the reference image enter the scene and wave."}
   ]
  }'
  ```

  {% /tab %}

{% /tabs %}

{% video src="https://storage.googleapis.com/generativeai-downloads/videos/omni_traveler_extension.mp4" type="video/mp4" /%}

{% callout type="note" %}
  Always try natural-language prompting without `task` first, because setting `task` adds strict constraints to the model. Set `"task": "extend"` in `video_config` only as a fallback if prompting alone doesn't trigger extension mode.

{% /callout %}

### Extension constraints and guidelines  {% id="extension-constraints" %}

Keep the following rules and constraints in mind when extending videos:

*   **Extension and total duration limits**: You can extend uploaded or
  model-generated videos (including 15-second clips) by 3 to 10 seconds per
  turn (10 seconds by default), up to a total video length of 30 seconds.
*   **10-second lookback window**: When extending a video, the model uses the
  last 10 seconds of the input video as context while preserving earlier
  frames. If a character or visual element only appeared before the final 10
  seconds, mention it again in your prompt or pass it as a reference image.
*   **Spoken dialogue on uploaded videos**: Currently, you cannot extend an
  uploaded video where someone is talking to add additional dialogue (it is
  supported if the character remains silent or if the prompt does not add dialogue).
*   **Multi-turn voice extension**: Generating spoken dialogue or speech is supported
  when extending previously generated videos via multi-turn (`previous_interaction_id`).
*   **End-of-clip only**: Extension is limited to appending to the end of the video.
  You cannot prepend content or extend the middle of a clip.
*   **Regional availability**: Extending uploaded videos is not currently available
  for users in the European Economic Area (EEA), Switzerland, and the United
  Kingdom (extending videos generated by the model is supported in all available regions).

## Best practices  {% id="best-practices" %}

*   **Use URI delivery for large videos:** For videos larger than 4MB (>720p
  when available), use `delivery="uri"` in `response_format` to avoid payload
  size limits.
*   **Optimized performance:** Set `background=false`, `store=false`, and
  `stream=false` for faster, synchronous unary generation. Note that setting
  `store=false` means the generated video won't be editable in subsequent
  turns using the `previous_interaction_id`.
*   **Prompt precision:** See [prompt guidance](/docs/omni#prompt-guide) section for
  details.

## Limitations  {% id="limitations" %}

*   First and last frame interpolation (providing two images for the starting
  and ending frames) supports videos from 3 to 10 seconds. Setting a duration
  over 10 seconds with two frames returns an invalid argument error.
*   Uploading and editing images containing minors is not supported in European Economic Area, Switzerland, and the United Kingdom.
*   Uploading and editing images containing certain recognizable people is not supported.
*   Editing or extending uploaded videos is not currently available for users in the European Economic Area (EEA), Switzerland, and the United Kingdom (editing or extending videos generated by the model is supported).
*   Uploaded and model-generated input videos for editing must be 15 seconds or
  less. Video extension uses the final 10 seconds of the input video and can
  extend uploaded or model-generated videos by 3 to 10 seconds per turn, up to
  a 30-second total video length.
*   Video extension is limited to appending to the end of a video; prepending or extending the middle of a clip is not supported.
*   You cannot extend an uploaded video where someone is talking to add additional dialogue (characters can remain silent, or multi-turn extension with `previous_interaction_id` can be used).
*   Voice editing is not supported.
*   Uploading audio inputs or audio references is unsupported in the current version of the API.
*   Reference videos work best for visual likenesses (any audio in a reference
  video is ignored) and are only supported when generating a new video, not
  when editing or extending an existing video. Reference images are supported
  for new video generation, video editing, and prompt-based video extension.
*   Videos from 11 to 15 seconds support 1 reference video (up to 3 seconds
  long), while videos from 3 to 10 seconds support up to 3 reference videos
  (up to 3 seconds each). Reference images support up to 6 images across all
  video durations.
*   Referencing or reasoning across multiple videos is not supported. Attempting multi-video prompting may result in degraded model performance or unexpected outputs.
*   Provisioned throughput is not supported.
*   System instructions, temperature, `top_p`, stop sequences, and negative prompts are not supported (you can put your negatives in the regular prompt: e.g., "Do not do X").
*   Using YouTube videos as a media source is not supported.

## Technical details  {% id="tech-details" %}

*   All generated videos include SynthID watermarking, which is invisible to viewers but can be detected programmatically for provenance verification.
*   Video generation times vary based on duration, resolution, and current API load. Longer and higher-resolution videos take more time to generate.
*   Omni applies content safety filters to both input prompts and generated video (which vary by region). Prompts that violate usage policies are blocked.
*   English (EN) is fully supported, but other languages have not been evaluated, so they may work but results can vary.

## Gemini Omni Flash prompt guide  {% id="prompt-guide" %}

This section contains tips and examples on how to prompt Gemini Omni Flash effectively.

### Single scene  {% id="single-scene" %}

By default Omni Flash will try to create a video with a few different shots.
It'll attempt to craft an interesting narrative based on the prompt.

If you need the output video to contain a single scene, you must prompt for that:

*   In a single unbroken scene
*   In a single continuous shot
*   No scene cuts

For example:

```none
Continuous, unbroken handheld shot of a fluffy tabby cat sitting on a sunny windowsill, looking out into a leafy garden. The cat's tail twitches slowly, and its ears rotate slightly toward ambient noises. Sunbeams illuminate dust motes in the air. Sound design: Gentle breeze, distant bird chirps. No dialogue.
```

### Removing unwanted elements  {% id="remove-unwanted-elements" %}

If the generated video contains things you don't want, include simple negative prompts to avoid them:

*   No dialogue
*   No embellishments
*   No extra sound effects

### Prompts for editing  {% id="prompts-for-editing" %}

Simple prompts work best for video editing. Overly descriptive prompts can lead to unintended changes.

The following are more examples of simple editing prompts:

*   Make this video anime
*   Put a fashionable hat on this person
*   Change the lighting to be more dramatic
*   Change the text on the sign to say "Omni Flash"

When editing a specific aspect of the video, include `"Keep everything else the same"` to maintain visual consistency.

The following are some examples to show how to apply this technique:

*   **Avoid:** `In the video of the man sitting on the sofa, please add a small
black cat that runs from the right side of the screen, jumps onto his lap,
and then he starts to stroke its head while looking down.`  *   **Simplify:** `Add a cat that jumps onto his lap, he begins to pet it.
Keep everything else the same.`

*   **Avoid:** `Please remove the cell phone that the person is holding in
their hand and fill in the background so it looks like they are just holding
their hand empty.`  *   **Simplify:** `Make the phone invisible. Keep everything else the
same.`


### Prompting the audio  {% id="prompting-audio" %}

By default the model will try to generate an appropriate audio track for a
video. This might not always be what you want. You can use your prompt to
describe the type of audio you want. This is especially important if you want
music in your video:

*   Include calm background music
*   The video has a high energy techno beat
*   The audio is a low tinny radio broadcast in the background, playing a song

### Timing events  {% id="timing-events" %}

You can prompt for things to happen at specific times in the video, there is no
precise syntax needed and you can use natural language. This is especially
useful in creating your own scene cuts, rhythm or rapid fire sequences.
See the following for examples:

*   After 3 seconds, a woman enters the scene.
*   At 5s the chorus starts in the background audio.
*   Every 2s cut to a new frame.
*   In a rapid fire sequence, every half a second (12 frames at 24fps) change the scene to a new location.

You can also use a timecode syntax:

```none
[0-5s] A person is walking down a quiet street
[5-10s] They stop and turn around toward a glowing doorway
[10-15s] They start running into the portal
```

### Meta prompting  {% id="meta-prompting" %}

You can ask Gemini Omni Flash to pay attention to general qualities or
principles of video generation:

*   Consider micro-detail, expression and timing to create a very rich, detailed
  but entirely natural scene.
*   Be extremely detailed in your descriptions of characters and environments.
  Apply costume design principles to characters. Be very specific about the
  people, items and objects in the scene.
*   Include plenty of appropriate detail in the background elements to make the
  scene feel realistic and natural.
*   Make a rapid fire video that shows a different rare `[thing]` every 1s, upbeat
  music, include text to label the thing.

### Text in videos  {% id="text-in-videos" %}

You can prompt to include text in your video and Gemini Omni will render in a
way that is correct and readable. If there will be naturally occurring text in
your video, even in background elements, it can help to define what it should
say.

*   One word on the screen at a time: "did, you, know, that, Omni, can, do,
  awesome, text?" Each word appears for 1s with a different animated style. No
  dialogue.
*   There is a street sign that says: "This is an AI generation by Omni", there
  is a storefront that says: "All you need AI", there's a car with the number
  plate: "OMNI1.2"

### Prompts for extending a video  {% id="prompts-extending-video" %}

With Gemini Omni 1.2 Flash you can extend videos with prompts like, `"Extend this video"` or `"The scene continues"`. You can extend videos by 3 to 10 seconds (10 seconds by default) per turn, up to a total length of 30 seconds.

Omni creates an extension that keeps video, motion, characters and audio coherent by using the last 10s of your original video as context. Some of the final frames in your input video will be edited to make the transition seamless.

When extending, all of this guide's Omni prompting tips still apply:

*   Describe the audio in your extended scene, especially if you need it to change: `"The music continues into the chorus"`
*   Describe if the scene continues, or if there is a shot cut to a new scene (perhaps with the same characters): `"Show the same characters in the next scene"`
*   Include reference images to keep outputs consistent or introduce new characters: `"The person shown in the reference image enters the scene"`
*   If using timestamps or a timecode syntax, 0s refers to the beginning of the extended part of the video. If extending a 10s video, the scene cut in this prompt will happen after 12s: `"After 2s cut to a new scene with the same characters"`

## What's next  {% id="what-s-next" %}

*   Get started with the Gemini Omni Flash by experimenting in the [Omni Quickstart Colab](https://colab.sandbox.google.com/github/google-gemini/cookbook/blob/main/quickstarts/Get_started_Omni.ipynb).
*   Learn how to write even better prompts with our [Introduction to prompt design](/docs/prompting-strategies).

