> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# API Overview

> Overview of MiniMax API capabilities including language, speech, video, image, music, and file management.

## Get API Key

* **Pay-as-you-go**：Visit [API Keys > Create new secret key](https://platform.minimax.io/user-center/basic-information/interface-key) to get your **API Key**

* **M Plan**：Visit [Billing > M Plan](https://platform.minimax.io/user-center/payment/token-plan) to view your **Subscription Key**
  <Note>The Subscription Key is used for M Plan subscriptions and purchased Credits. It is separate from pay-as-you-go API Keys. See [M Plan Overview](https://platform.minimax.io/docs/m-plan/intro) for details.</Note>

***

## Large Language Model

The Large Language Model API uses **MiniMax M3.1-Flash** and **MiniMax M3** to generate conversational content and trigger tool calls based on the provided context.

It can be accessed via **HTTP requests**, the **Anthropic SDK** (Recommended), or the **OpenAI SDK**.

**Supported Models**

| Model Name | Context Window | Description |
| :- | :- | :- |
| <span style={{whiteSpace:"nowrap"}}>MiniMax-M3.1-Flash</span> | 1,000,000 | **Frontier multimodal coding model with 1M context window and tunable thinking depth** |
| MiniMax-M3 | 1,000,000 | **Frontier multimodal coding model with 1M context window** |

Please note: The maximum token count refers to the total number of input and output tokens.

<Columns cols={2}>
  <Card title="Anthropic API Compatible (Recommended)" icon="book-open" href="/docs/api-reference/text-anthropic-api" cta="View Docs">
    Use Anthropic SDK with MiniMax models
  </Card>

  <Card title="OpenAI API Compatible" icon="book-open" href="/docs/api-reference/text-openai-api" cta="View Docs">
    Use OpenAI SDK with MiniMax models
  </Card>
</Columns>

***

## Video Model

This API supports video generation from multimodal input (text, images, video, audio), covering text-to-video, image-to-video, first-and-last-frame, and reference-to-video scenarios.

**Supported Models**

| Model | Description |
| :- | :- |
| MiniMax-H3 | Multimodal video generation model supporting text / image / first-and-last-frame / reference input, 768P / 2K resolution, 4–15s duration. |
| MiniMax-H3-Max | Fast generation model supporting text-to-video, image-to-video (first / last frame), and reference input. 480P / 768P resolution (no 2K), 5–15s duration. |

**API Usage Guide**

Both models share the same `content[]` request protocol and query endpoints — switching models only requires changing the `model` field. MiniMax-H3 tasks are asynchronous. There are three creation endpoints—**Create Video Generation Task**, **Create H3-Context-IR Task**, and **Create Video Regeneration Task**—and shared endpoints for querying, listing, and cancelling or deleting tasks; MiniMax-H3-Max supports the **Create Video Generation Task** endpoint only. The workflow is as follows:

1. Create a video generation task, create an H3-Context-IR task with the same multimodal input, or create a video regeneration task for a source video that meets the MiniMax-H3 768P output specifications. A regeneration request must contain exactly one source-video item with `role=base_video`. All three endpoints return a `task_id` on success.
2. Use **Query Task** with the `task_id` to retrieve its status and result. When a video task succeeds, get its output URL from `content.url`; when an H3-Context-IR task succeeds, get the enhanced prompt from `content.prompt`. You can also use **List Tasks** and distinguish `generation`, `h3_context_ir`, and `regeneration` with `task_type`.
3. Use **Cancel or Delete Task** to cancel a queued task or delete a succeeded or failed task record.

<Columns cols={2}>
  <Card title="Create Video Generation Task" icon="circle-play" href="/docs/api-reference/video-generation-v2-create" cta="View Docs">
    Create a video generation task from multimodal content input
  </Card>

  <Card title="Create H3-Context-IR Task" icon="pen-to-square" href="/docs/api-reference/video-generation-v2-h3-context-ir" cta="View Docs">
    Deeply interpret multimodal video-generation context and produce a structured, enhanced prompt
  </Card>

  <Card title="Create Video Regeneration Task" icon="wand-magic-sparkles" href="/docs/api-reference/video-generation-v2-regeneration" cta="View Docs">
    Regenerate a video that meets the MiniMax-H3 768P output specifications as a 2K video
  </Card>

  <Card title="Query Task" icon="search" href="/docs/api-reference/video-generation-v2-query" cta="View Docs">
    Query task status by task\_id and get the video download URL
  </Card>

  <Card title="List Tasks" icon="list" href="/docs/api-reference/video-generation-v2-list" cta="View Docs">
    List tasks from the last 7 days and filter by task type
  </Card>

  <Card title="Cancel or Delete Task" icon="trash" href="/docs/api-reference/video-generation-v2-delete" cta="View Docs">
    Cancel a queued task or delete a succeeded or failed task record
  </Card>
</Columns>

***

## Speech Model

The speech models provide **speech synthesis**, **voice cloning**, and **voice design**, supporting 40 languages and 300+ system voices, with synchronous or asynchronous generation.

All interfaces are stateless: each call only processes the provided input, does not store user data, and involves no business-logic state.

**Supported Models**

| Model | Description |
| :- | :- |
| speech-2.8-hd | Latest HD model. Ultra-realistic quality featuring sound tags. |
| speech-2.8-turbo | Latest Turbo model. Seamless speed meets natural flow. |
| speech-2.6-hd | HD model with outstanding prosody and excellent cloning similarity. |
| speech-2.6-turbo | Turbo model with support for 40 languages. |
| speech-02-hd | Superior rhythm and stability, with outstanding performance in replication similarity and sound quality. |
| speech-02-turbo | Superior rhythm and stability, with enhanced multilingual capabilities and excellent performance. |

**API Overview**

Four capabilities share the models above:

1. **Synchronous speech synthesis (T2A)**: real-time text-to-speech, up to **10,000 characters** per request; 300+ system and cloned voices, adjustable volume / pitch / speed, proportional mixing, streaming output, and `mp3` / `pcm` / `flac` / `wav` formats. Available over **HTTP** and **WebSocket**.
2. **Asynchronous long-text synthesis**: up to **1 million characters** per request, ideal for entire books; supports sentence-level timestamps (subtitles). Create a task to get a `task_id`, then use the returned `file_id` with the File API to download (the download URL is valid for **9 hours**).
3. **Voice cloning**: upload the audio to clone to get a `file_id` (optionally upload sample audio to improve quality), then call the cloning API to produce a custom `voice_id`. Individual or enterprise verification is required.
4. **Voice design**: generate a personalized voice from a description prompt; the resulting `voice_id` can be used directly with the synthesis APIs above.

<Note>
  Voices produced by cloning and voice design are **temporary**: the fee is charged only on first use in speech synthesis (previews within those APIs do not count). If the voice is not used by any speech synthesis API within **168 hours (7 days)**, it is deleted.
</Note>

<Accordion title="40 supported languages">
  | Support Languages | | |
  | - | - | - |
  | 1. Chinese | 15. Turkish | 28. Malay |
  | 2. Cantonese | 16. Dutch | 29. Persian |
  | 3. English | 17. Ukrainian | 30. Slovak |
  | 4. Spanish | 18. Thai | 31. Swedish |
  | 5. French | 19. Polish | 32. Croatian |
  | 6. Russian | 20. Romanian | 33. Filipino |
  | 7. German | 21. Greek | 34. Hungarian |
  | 8. Portuguese | 22. Czech | 35. Norwegian |
  | 9. Arabic | 23. Finnish | 36. Slovenian |
  | 10. Italian | 24. Hindi | 37. Catalan |
  | 11. Japanese | 25. Bulgarian | 38. Nynorsk |
  | 12. Korean | 26. Danish | 39. Tamil |
  | 13. Indonesian | 27. Hebrew | 40. Afrikaans |
  | 14. Vietnamese | | |
</Accordion>

<Columns cols={2}>
  <Card title="HTTP T2A API" icon="globe" href="/docs/api-reference/speech-t2a-http" cta="View Docs">
    Synchronous speech synthesis via HTTP
  </Card>

  <Card title="WebSocket T2A API" icon="plug" href="/docs/api-reference/speech-t2a-websocket" cta="View Docs">
    Streaming speech synthesis via WebSocket
  </Card>

  <Card title="Create Async Task" icon="circle-play" href="/docs/api-reference/speech-t2a-async-create" cta="View Docs">
    Create a long-text speech generation task
  </Card>

  <Card title="Query Async Task Status" icon="search" href="/docs/api-reference/speech-t2a-async-query" cta="View Docs">
    Query speech generation task status
  </Card>

  <Card title="Upload Clone Audio" icon="upload" href="/docs/api-reference/voice-cloning-uploadcloneaudio" cta="View Docs">
    Upload audio file to clone
  </Card>

  <Card title="Clone Voice" icon="mic" href="/docs/api-reference/voice-cloning-clone" cta="View Docs">
    Execute voice cloning
  </Card>

  <Card title="Voice Design" icon="wand-magic-sparkles" href="/docs/api-reference/voice-design-design" cta="View Docs">
    Generate personalized voices from descriptions
  </Card>
</Columns>

***

## Image Generation

This API supports images generations from text or references, allowing custom aspect ratios and resolutions for diverse needs.

**API Description**

You can generate images by creating an image generation task using text prompts and/or reference images.

**Model List**

| Model | Description |
| :- | :- |
| image-01 | A high-quality image generation model that produces fine-grained details. Supports both text-to-image and image-to-image generation (with subject reference for people). |

<Columns cols={2}>
  <Card title="Text to Image" icon="file-text" href="/docs/api-reference/image-generation-t2i" cta="View Docs">
    Generate image from text description
  </Card>

  <Card title="Image to Image" icon="image-plus" href="/docs/api-reference/image-generation-i2i" cta="View Docs">
    Generate image from reference image
  </Card>
</Columns>

***

## Music Generation

<Note title="Music API Service Adjustment Notice">
  Starting August 20, 2026, the paid APIs (Music Generation and Lyrics Generation) will no longer be available to new users; existing paying users can continue to use the current API services. The free music generation APIs (Music-3.0-free, Music-2.6-free, music-cover-free) will be discontinued.

  To experience or use music generation capabilities, please visit [MiniMax Audio](https://www.minimax.io/audio), or use the open-source [MiniMax Music 3 model on Hugging Face](https://huggingface.co/MiniMaxAI/MiniMax-Music3).
</Note>

This API generates a vocal song based on a music description (prompt) and lyrics.

**Models**

| Model | Usage |
| :- | :- |
| music-3.0 | The latest music generation model. Supports user-provided musical inspiration and lyrics to create AI-generated music. |

<Card title="Music Generation API" icon="music" href="/docs/api-reference/music-generation" cta="View Docs">
  Generate music from description and lyrics
</Card>

***

## File Management

This API is for file management and is used with other MiniMax APIs.

**API Description**

This API includes 5 endpoints: **Upload**, **List**, **Retrieve**, **Retrieve Content**, **Delete**.

Supported file formats, capacity, and size limits are defined by the **Upload File** API documentation — see [Upload File](/docs/api-reference/file-management-upload).

<Columns cols={2}>
  <Card title="Upload File" icon="upload" href="/docs/api-reference/file-management-upload" cta="View Docs">
    Upload files to the platform
  </Card>

  <Card title="List Files" icon="list" href="/docs/api-reference/file-management-list" cta="View Docs">
    Get list of uploaded files
  </Card>
</Columns>

***

## Tools

**Web Search**

`web_search` is a server-side web search tool hosted and executed by MiniMax. The model can retrieve up-to-date information while generating a response and answer based on the search results. It is available through both the Anthropic Messages API and the OpenAI Responses API. See [Web Search](/docs/guides/server-tools#web_search) for interface details and examples.

**Official MCP**

MiniMax provides official Model Context Protocol (MCP) server implementations:

* [Python version](https://github.com/MiniMax-AI/MiniMax-MCP)
* [JavaScript version](https://github.com/MiniMax-AI/MiniMax-MCP-JS)

Both support speech synthesis, voice cloning, video generation, and music generation. For details, refer to the [MiniMax MCP User Guide](/docs/guides/mcp-guide).
