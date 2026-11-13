> Source: https://ai.google.dev/gemini-api/docs/deprecations.md.txt (snapshot 2026-11-10)

# Gemini deprecations

This page lists the known deprecation schedules for [stable
(GA)](/docs/models#stable) and [preview](/docs/models#preview) models and for
managed agents in the Gemini API. A "**deprecation**" is the announcement that
we no longer provide support for a model, and that it will be "**shut down**" in
the near future. Once a model is "**shutdown**", it is completely turned off, and
the endpoint is no longer available.

Deprecation announcements are made on the [Release notes](/docs/changelog) page,
and the announced earliest shutdown dates are tracked on this page.
Already-shutdown models and agents are listed under the **Deprecated models**
and **Deprecated agents** sections.

{% callout type="note" %}
  Note: The **shutdown dates listed in the table indicate the *earliest possible
  dates* on which a model might be retired**. We will communicate the exact
  shutdown date to users with advance notice to ensure a smooth transition to a
  replacement model.

{% /callout %}

## Gemini 4 models  {% id="gemini-4-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-4-carbon`
  * November 10, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-4-argon`
  * October 13, 2026
  * No shutdown date announced
  * 
{% /table %}

## Gemini 3 models  {% id="gemini-3-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-3.8-flash-tts`
  * September 22, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.8-flash-lite-tts`
  * September 22, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.8-live`
  * September 15, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.8-live-extended-thinking`
  * September 15, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.8-flash`
  * September 2, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.7-flash`
  * August 13, 2026
  * N/A
  * `gemini-3.8-flash` (`gemini-3.7-flash` is no longer available in Google AI Studio; the endpoint is not shutting down and automatically routes API requests to `gemini-3.8-flash`)

  ---

  * `gemini-3.6-flash`
  * July 21, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.5-flash-lite`
  * July 21, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.5-flash`
  * May 19, 2026
  * N/A
  * `gemini-3.6-flash` (`gemini-3.5-flash` is no longer available in Google AI Studio; the endpoint is not shutting down and automatically routes API requests to `gemini-3.6-flash`)

  ---

  * `gemini-3.1-flash-lite`
  * May 7, 2026
  * May 7, 2027
  * `gemini-3.5-flash-lite`
{% /table %}

### Preview models  {% id="gemini-3-preview-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-3.1-flash-tts-preview`
  * February 26, 2026
  * November 17, 2026
  * `gemini-3.8-flash-tts` or `gemini-3.8-flash-lite-tts`

  ---

  * `gemini-3.1-pro-preview`
  * February 19, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3-flash-preview`
  * December 17, 2025
  * No shutdown date announced
  * `gemini-3.6-flash`
{% /table %}

### Deprecated models  {% id="gemini-3-deprecated-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-3-pro-preview`
  * November 18, 2025
  * March 9, 2026
  * `gemini-3.1-pro-preview`

  ---

  * `gemini-3.1-flash-lite-preview`
  * March 3, 2026
  * May 25, 2026
  * `gemini-3.1-flash-lite`
{% /table %}

## Gemini 2.5 Pro models  {% id="gemini-2.5-pro-models" %}

{% callout type="caution" %}
  `gemini-2.5-pro` is deprecated and is no longer available to select in Google AI
  Studio. Access through the API is limited to existing users who have actively
  used it in the past. Effective December 1, 2026, all API requests to
  `gemini-2.5-pro` will automatically route to
  [`gemini-3.8-flash`](/docs/models/gemini-3.8-flash) and be billed at
  [Gemini 3.8 Flash rates](/docs/pricing#gemini-3.8-flash). Review the breaking
  API changes in the
  [Gemini 3.8 Flash migration guide](/docs/whats-new-gemini-3.8#migrate-to-gemini-3-8-flash)
  before December 1, 2026.

{% /callout %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-2.5-pro`
  * June 17, 2025
  * December 1, 2026
  * `gemini-3.8-flash` (`gemini-2.5-pro` is no longer available in Google AI Studio; effective December 1, 2026, API requests to `gemini-2.5-pro` will automatically route to `gemini-3.8-flash`)
{% /table %}

### Deprecated models  {% id="gemini-2.5-pro-deprecated-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-2.5-computer-use-preview-10-2025`
  * October 7, 2025
  * July 28, 2026
  * `gemini-3.8-flash`

  ---

  * `gemini-2.5-pro-preview-03-25`
  * March 3, 2025
  * December 2, 2025
  * `gemini-3.8-flash`

  ---

  * `gemini-2.5-pro-preview-05-06`
  * May 6, 2025
  * December 2, 2025
  * `gemini-3.8-flash`

  ---

  * `gemini-2.5-pro-preview-06-05`
  * June 5, 2025
  * December 2, 2025
  * `gemini-3.8-flash`
{% /table %}

## Gemini 2.5 Flash models  {% id="gemini-2.5-flash-models" %}

{% callout type="caution" %}
  `gemini-2.5-flash` is deprecated and is no longer available to select in Google
  AI Studio. Effective December 1, 2026, all API requests to `gemini-2.5-flash`
  will automatically route to
  [`gemini-3.5-flash-lite`](/docs/models/gemini-3.5-flash-lite) and be billed at
  [Gemini 3.5 Flash-Lite rates](/docs/pricing#gemini-3.5-flash-lite). Review the
  breaking API changes in the
  [Gemini 3.5 Flash-Lite migration guide](/docs/whats-new-gemini-3.6#migrate-to-gemini-3-5-flash-lite)
  before December 1, 2026. Access to the 2.5 models is limited to users who have
  actively used them in the past. `gemini-2.5-flash-lite` is not deprecated and
  remains available through the API until further notice.

{% /callout %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-2.5-flash`
  * June 17, 2025
  * December 1, 2026
  * `gemini-3.5-flash-lite` (`gemini-2.5-flash` is no longer available in Google AI Studio; effective December 1, 2026, API requests to `gemini-2.5-flash` will automatically route to `gemini-3.5-flash-lite`)

  ---

  * `gemini-2.5-flash-lite`
  * July 22, 2025
  * No shutdown date announced
  * 
{% /table %}

### Deprecated models  {% id="gemini-2.5-flash-deprecated-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-2.5-flash-lite-preview-09-2025`
  * September 25, 2025
  * March 31, 2026
  * `gemini-3.1-flash-lite`

  ---

  * `gemini-2.5-flash-preview-05-20`
  * May 20, 2025
  * November 18, 2025
  * `gemini-3.6-flash`

  ---

  * `gemini-2.5-flash-preview-09-2025`
  * September 25, 2025
  * February 17, 2026
  * `gemini-3.6-flash`
{% /table %}

## Gemini 2.0 models  {% id="gemini-2.0-models" %}

### Deprecated models  {% id="gemini-2.0-deprecated-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-2.0-flash`
  * February 5, 2025
  * June 1, 2026
  * `gemini-3.6-flash`

  ---

  * `gemini-2.0-flash-001`
  * February 5, 2025
  * June 1, 2026
  * `gemini-3.6-flash`

  ---

  * `gemini-2.0-flash-lite`
  * February 25, 2025
  * June 1, 2026
  * `gemini-3.1-flash-lite`

  ---

  * `gemini-2.0-flash-lite-001`
  * February 25, 2025
  * June 1, 2026
  * `gemini-3.1-flash-lite`

  ---

  * `gemini-2.0-flash-lite-preview`
  * February 5, 2025
  * December 9, 2025
  * `gemini-3.1-flash-lite`

  ---

  * `gemini-2.0-flash-lite-preview-02-05`
  * February 5, 2025
  * December 9, 2025
  * `gemini-3.1-flash-lite`
{% /table %}

## Live API models  {% id="live-api-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-3.8-live`
  * September 15, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.8-live-extended-thinking`
  * September 15, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.5-transcribe-live`
  * August 2026
  * No shutdown date announced
  * 
{% /table %}

### Preview models  {% id="live-api-preview-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-3.5-live-translate-preview`
  * June 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.1-flash-live-preview`
  * March 11, 2026
  * November 17, 2026
  * `gemini-3.8-live`

  ---

  * `gemini-2.5-flash-native-audio-preview-12-2025`
  * December 12, 2025
  * November 17, 2026
  * `gemini-3.8-live`
{% /table %}

### Deprecated models  {% id="live-api-deprecated-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-live-2.5-flash-preview`
  * June 17, 2025
  * December 9, 2025
  * `gemini-3.8-live`

  ---

  * `gemini-2.0-flash-live-001`
  * April 9, 2025
  * December 9, 2025
  * `gemini-3.8-live`
{% /table %}

## Audio models  {% id="audio-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-3.5-transcribe`
  * August 2026
  * No shutdown date announced
  * 
{% /table %}

### Preview models  {% id="audio-preview-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-2.5-flash-preview-tts`
  * May 20, 2025
  * November 17, 2026
  * `gemini-3.8-flash-tts` or `gemini-3.8-flash-lite-tts`

  ---

  * `gemini-2.5-pro-preview-tts`
  * May 20, 2025
  * November 17, 2026
  * `gemini-3.8-flash-tts` or `gemini-3.8-flash-lite-tts`
{% /table %}

## Embedding models  {% id="embedding-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-embedding-2`
  * April 22, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-embedding-001`
  * July 14, 2025
  * May 14, 2028
  * `gemini-embedding-2`
{% /table %}

### Deprecated models  {% id="embedding-deprecated-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-embedding-2-preview`
  * March 10, 2026
  * November 6, 2026
  * `gemini-embedding-2` (effective November 6, 2026, API requests to `gemini-embedding-2-preview` route to `gemini-embedding-2`)

  ---

  * `text-embedding-004`
  * April 9, 2024
  * January 14, 2026
  * `gemini-embedding-2`

  ---

  * `embedding-001`
  * April 9, 2024
  * October 30, 2025
  * `gemini-embedding-2`

  ---

  * `embedding-gecko-001`
  * 
  * October 30, 2025
  * `gemini-embedding-2`

  ---

  * `gemini-embedding-exp`
  * 
  * October 30, 2025
  * `gemini-embedding-2`

  ---

  * `gemini-embedding-exp-03-07`
  * 
  * October 30, 2025
  * `gemini-embedding-2`
{% /table %}

## Nano Banana models  {% id="nano-banana-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-nano-banana-2.1`
  * October 6, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.1-flash-lite-image`
  * June 30, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-3.1-flash-image`
  * May 28, 2026
  * No shutdown date announced
  * `gemini-nano-banana-2.1`

  ---

  * `gemini-3-pro-image`
  * May 28, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-2.5-flash-image`
  * October 2, 2025
  * March 15, 2027
  * `gemini-3.1-flash-lite-image`
{% /table %}

### Deprecated models  {% id="nano-banana-deprecated-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-3.1-flash-image-preview`
  * February 26, 2026
  * June 25, 2026
  * `gemini-nano-banana-2.1`

  ---

  * `gemini-3-pro-image-preview`
  * November 20, 2025
  * June 25, 2026
  * `gemini-3-pro-image`

  ---

  * `gemini-2.5-flash-image-preview`
  * May 7, 2025
  * January 15, 2026
  * `gemini-nano-banana-2.1`

  ---

  * `gemini-2.0-flash-preview-image-generation`
  * May 7, 2025
  * November 14, 2025
  * `gemini-nano-banana-2.1`
{% /table %}

## Imagen models  {% id="imagen-models" %}

### Deprecated models  {% id="imagen-deprecated-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `imagen-4.0-generate-001`
  * June 24, 2025
  * August 17, 2026
  * `gemini-nano-banana-2.1`

  ---

  * `imagen-4.0-ultra-generate-001`
  * June 24, 2025
  * August 17, 2026
  * `gemini-nano-banana-2.1`

  ---

  * `imagen-4.0-fast-generate-001`
  * June 24, 2025
  * August 17, 2026
  * `gemini-nano-banana-2.1`

  ---

  * `imagen-4.0-generate-preview-06-06`
  * June 24, 2025
  * February 17, 2026
  * `gemini-nano-banana-2.1`

  ---

  * `imagen-4.0-ultra-generate-preview-06-06`
  * June 24, 2025
  * February 17, 2026
  * `gemini-nano-banana-2.1`

  ---

  * `imagen-3.0-generate-002`
  * February 6, 2025
  * November 10, 2025
  * `gemini-nano-banana-2.1`
{% /table %}

## Veo models  {% id="veo-models" %}

### Deprecated models  {% id="veo-deprecated-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `veo-3.1-lite-generate-preview`
  * March 31, 2026
  * October 22, 2026
  * `gemini-omni-1.2-flash`

  ---

  * `veo-3.1-generate-preview`
  * October 15, 2025
  * October 22, 2026
  * `gemini-omni-1.2-flash`

  ---

  * `veo-3.1-fast-generate-preview`
  * October 15, 2025
  * October 22, 2026
  * `gemini-omni-1.2-flash`

  ---

  * `veo-3.0-generate-001`
  * September 9, 2025
  * June 30, 2026
  * `gemini-omni-1.2-flash` or the GA models on the [Gemini Enterprise Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/veo/3-1-generate)

  ---

  * `veo-3.0-fast-generate-001`
  * September 9, 2025
  * June 30, 2026
  * `gemini-omni-1.2-flash` or the GA models on the [Gemini Enterprise Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/veo/3-1-generate)

  ---

  * `veo-2.0-generate-001`
  * April 9, 2025
  * June 30, 2026
  * `gemini-omni-1.2-flash` or the GA models on the [Gemini Enterprise Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/veo/3-1-generate)

  ---

  * `veo-3.0-generate-preview`
  * July 31, 2025
  * November 12, 2025
  * `gemini-omni-1.2-flash`

  ---

  * `veo-3.0-fast-generate-preview`
  * July 31, 2025
  * November 12, 2025
  * `gemini-omni-1.2-flash`
{% /table %}

## Gemini Omni Flash models  {% id="gemini-omni-flash-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-omni-1.2-flash`
  * November 5, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-omni-1.1-flash`
  * August 27, 2026
  * December 3, 2026
  * `gemini-omni-1.2-flash` (Effective December 3, 2026, the endpoint is
    automatically routing API requests to
    `gemini-omni-1.2-flash`)
{% /table %}

### Deprecated models  {% id="gemini-omni-flash-deprecated-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-omni-flash-preview`
  * June 30, 2026
  * October 22, 2026
  * `gemini-omni-1.2-flash`
{% /table %}

## Lyria models  {% id="lyria-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `lyria-3.5`
  * September 3, 2026
  * No shutdown date announced
  * 
{% /table %}

### Preview models  {% id="lyria-preview-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `lyria-3-clip-preview`
  * March 25, 2026
  * No shutdown date announced
  * 

  ---

  * `lyria-3-pro-preview`
  * March 25, 2026
  * No shutdown date announced
  * `lyria-3.5`

  ---

  * `lyria-realtime-exp`
  * May 20, 2025
  * No shutdown date announced
  * 
{% /table %}

## Robotics models  {% id="robotics-models" %}

### Preview models  {% id="robotics-preview-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-robotics-er-2-preview`
  * July 30, 2026
  * No shutdown date announced
  * 

  ---

  * `gemini-robotics-er-2-streaming-preview`
  * July 30, 2026
  * No shutdown date announced
  * 
{% /table %}

### Deprecated models  {% id="robotics-deprecated-models" %}

{% table %}
  * Model
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `gemini-robotics-er-1.6-preview`
  * April 14, 2026
  * August 31, 2026
  * `gemini-robotics-er-2-preview`

  ---

  * `gemini-robotics-er-1.5-preview`
  * September 25, 2025
  * April 30, 2026
  * `gemini-robotics-er-2-preview`
{% /table %}

## Managed agents  {% id="managed-agents" %}

### Preview agents  {% id="managed-agents-preview-agents" %}

{% table %}
  * Agent
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `antigravity-preview-09-2026`
  * September 17, 2026
  * No shutdown date announced
  * 

  ---

  * `deep-research-preview-04-2026`
  * April 21, 2026
  * No shutdown date announced
  * 

  ---

  * `deep-research-max-preview-04-2026`
  * April 21, 2026
  * No shutdown date announced
  * 
{% /table %}

### Deprecated agents  {% id="managed-agents-deprecated-agents" %}

{% table %}
  * Agent
  * Release date
  * Shutdown date
  * Recommended replacement

  ---

  * `deep-research-pro-preview-12-2025`
  * December 11, 2025
  * October 23, 2026
  * `deep-research-preview-04-2026`

  ---

  * `antigravity-preview-05-2026`
  * May 19, 2026
  * October 5, 2026
  * `antigravity-preview-09-2026`
{% /table %}

