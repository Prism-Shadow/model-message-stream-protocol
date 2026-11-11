> Source: https://aistudio.google.com/docs/models/gemini-omni-flash.md (snapshot 2026-11-06)
>
> The site's "AI Agent Context" preamble removed; everything else verbatim.

# Gemini Omni Flash

Gemini Omni Flash is a high-performance model for fast, conversational video
generation and editing. It excels at turning text and images into video,
lets you refine and edit generated videos through natural language
conversations using the Interactions API, and supports video extension,
up to 4K output resolution, and advanced interpolation.

{% button href="https://aistudio.google.com?model=gemini-omni-1.2-flash" variant="ais" %}Try in Google AI Studio{% /button %}

## Documentation  {% id="documentation" %}

Visit the [Gemini Omni Flash](/docs/omni)
page for full coverage of features and capabilities.

## gemini-omni-1.2-flash  {% id="gemini-omni-1.2-flash" %}

{% table variant="model" %}
  * Property
  * Description

  ---

  *     {% section class="model-property" %}
  {% icon name="id_card" /%}Model code

    {% /section %}

  * **Gemini API**
    `gemini-omni-1.2-flash`

  ---

  *     {% section class="model-property" %}
  {% icon name="save" /%}Supported data types

    {% /section %}

  *     **Input** Text, Image, Video (up to 15s for editing and 10s lookback for extension)

    **Output** Video with native Audio, Text


  ---

  *     {% section class="model-property" %}
  {% icon name="token_auto" /%}Limits

    {% /section %}

  *     **Input token limit** 131,072 tokens

    **Output token limit** 65,536 tokens

    **Output video** 3s-15s (360p/720p/1080p/4K, 24 FPS; 3s-10s for first and last frame interpolation and per-turn video extension up to 30s total)


  ---

  *     {% section class="model-property" %}
  {% icon name="123" /%}Versions

    {% /section %}

  *     Read the [model version patterns](/docs/models#model-versions) for more details.

    *   Stable: `gemini-omni-1.2-flash`
    *   Stable: `gemini-omni-1.1-flash` (routes to `gemini-omni-1.2-flash` on December 3, 2026)
    *   Shut down: `gemini-omni-flash-preview`


  ---

  *     {% section class="model-property" %}
  {% icon name="calendar_month" /%}Latest update

    {% /section %}

  * November 2026

  ---

  *     {% section class="model-property" %}
  {% icon name="paid" /%}Pricing

    {% /section %}

  * [Pricing](/docs/pricing#gemini-omni-1.2-flash)
{% /table %}

## gemini-omni-1.1-flash  {% id="gemini-omni-1.1-flash" %}

{% table variant="model" %}
  * Property
  * Description

  ---

  *     {% section class="model-property" %}
  {% icon name="id_card" /%}Model code

    {% /section %}

  * **Gemini API**
    `gemini-omni-1.1-flash`

  ---

  *     {% section class="model-property" %}
  {% icon name="save" /%}Supported data types

    {% /section %}

  *     **Input** Text, Image, Video (up to 10s for editing and extension)

    **Output** Video


  ---

  *     {% section class="model-property" %}
  {% icon name="token_auto" /%}Limits

    {% /section %}

  *     **Input token limit** 131,072 tokens

    **Output token limit** 65,536 tokens

    **Output video** 3s-10s (360p/720p/1080p/4K, 24 FPS)


  ---

  *     {% section class="model-property" %}
  {% icon name="123" /%}Versions

    {% /section %}

  *     Read the [model version patterns](/docs/models#model-versions) for more details.

    *   Stable: `gemini-omni-1.2-flash`
    *   Stable: `gemini-omni-1.1-flash` (routes to `gemini-omni-1.2-flash` on December 3, 2026)
    *   Shut down: `gemini-omni-flash-preview`


  ---

  *     {% section class="model-property" %}
  {% icon name="calendar_month" /%}Latest update

    {% /section %}

  * August 2026

  ---

  *     {% section class="model-property" %}
  {% icon name="paid" /%}Pricing

    {% /section %}

  * [Pricing](/docs/pricing#gemini-omni-1.1-flash)
{% /table %}

