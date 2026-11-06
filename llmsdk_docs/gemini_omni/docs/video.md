> Source: https://aistudio.google.com/docs/video.md (https://ai.google.dev/gemini-api/docs/video-generation.md.txt redirects there) (snapshot 2026-11-06)
>
> The site's "AI Agent Context" preamble removed; everything else verbatim.

# Video generation in the Gemini API

Use [Gemini Omni Flash](/docs/omni) (`gemini-omni-1.2-flash`) as your model for
video generation and conversational video editing in the Gemini API. It provides
up to 15-second video generation with native audio, multi-input reasoning
(supporting text, image, and video inputs), character consistency across up to 6
reference images, and multi-turn conversational editing and extension.

The Veo 3.1 Preview in the Gemini API has been shut down.

## Gemini Omni Flash  {% id="omni-flash" %}

Gemini Omni Flash (`gemini-omni-1.2-flash`) is a fast, multimodal model for
video generation and conversational video editing. It excels at turning text
prompts and reference images into 3 to 15 second videos with native audio, and
lets you refine or extend results across multiple turns using the Interactions
API.

[Get started with Gemini Omni Flash →](/docs/omni)

## Veo 3.1  {% id="veo" %}

{% callout type="warning" %}
   Veo 3.1 Preview (`veo-3.1-generate-preview`,
  `veo-3.1-fast-generate-preview`, and `veo-3.1-lite-generate-preview`) in the
  Gemini API was [shut down](/docs/deprecations) on **October 22, 2026**; migrate
  to [Gemini Omni Flash](/docs/omni) (`gemini-omni-1.2-flash`) or the GA models
  available through the
  [Gemini Enterprise Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/veo/3-1-generate)
  to avoid service interruptions. 

{% /callout %}

## Video understanding  {% id="understanding" %}

If you need to ingest and analyze existing video content rather than generate
new video, see the [Video understanding guide](/docs/video-understanding).

