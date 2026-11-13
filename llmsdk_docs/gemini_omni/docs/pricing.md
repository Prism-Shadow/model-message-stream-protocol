> Source: https://aistudio.google.com/docs/pricing.md (snapshot 2026-11-06)
>
> Excerpt: the Gemini Omni 1.2 Flash and Gemini Omni 1.1 Flash sections, verbatim.

# Gemini Developer API pricing

## Gemini Omni 1.2 Flash  {% id="gemini-omni-1.2-flash" %}

{% two-column-layout %}
  {% left-column class="center-vertically" %}
  *[`gemini-omni-1.2-flash`](/docs/models/gemini-omni-flash)*

  {% /left-column %}

  {% right-column class="center-vertically right-align" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-omni-1.2-flash" variant="ais" %}
  Try it in Google AI Studio

  {% /button %}

  {% /right-column %}

{% /two-column-layout %}

{% hr /%}

Our next-generation video generation and editing model supporting up to 15
seconds of video generation and editing with native audio, now generally
available to developers on the paid tier of the Gemini API.

{% tabs %}
  {% tab title="Standard" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $1.50 (text / image / video)

  ---

  * Output price (including thinking tokens)
  * Not available
  * $9.00 (text)    
  $12.00 (video){% sup %}*{% /sup %}

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

{% /tabs %}

{% sup %}*{% /sup %} Billing is based on total output token consumption,
calculated at a rate of 5,792 tokens per second of 720p video. Under Standard
pricing ($12.00 per 1M tokens), this equates to an effective price of
approximately $0.07 per second (~$0.70 for a 10s clip, ~$1.04 for a 15s clip;
$0.023/s for 360p at 1,931 tokens/s; $0.104/s for 1080p with upsampling at 8,688
tokens/s; and $0.209/s for 4K with upsampling at 17,376 tokens/s).

## Gemini Omni 1.1 Flash  {% id="gemini-omni-1.1-flash" %}

{% two-column-layout %}
  {% left-column class="center-vertically" %}
  *[`gemini-omni-1.1-flash`](/docs/models/gemini-omni-flash#gemini-omni-1.1-flash)*

  {% /left-column %}

  {% right-column class="center-vertically right-align" %}
  {% button href="https://aistudio.google.com/prompts/new_chat?model=gemini-omni-1.2-flash" variant="ais" %}
  Try it in Google AI Studio

  {% /button %}

  {% /right-column %}

{% /two-column-layout %}

{% hr /%}

Previous generation video generation and editing model. Effective December 3,
2026, all API requests to `gemini-omni-1.1-flash` automatically route to
[`gemini-omni-1.2-flash`](/docs/models/gemini-omni-flash#gemini-omni-1.2-flash)
and are billed at `gemini-omni-1.2-flash` rates.

{% tabs %}
  {% tab title="Standard" %}
  {% table %}
  * Feature
  * Free Tier
  * Paid Tier, per 1M tokens in USD

  ---

  * Input price
  * Not available
  * $1.50 (text / image / video)

  ---

  * Output price (including thinking tokens)
  * Not available
  * $9.00 (text)    
  $17.50 (video){% sup %}*{% /sup %}

  ---

  * Used to improve our products
  * [Yes](/docs/terms)
  * [No](/docs/terms)
  {% /table %}

  {% /tab %}

{% /tabs %}

{% sup %}*{% /sup %} Billing is based on total output token consumption,
calculated at a rate of 5,792 tokens per second of 720p video. Under Standard
pricing, this equates to an effective price of approximately $0.10 per second.
