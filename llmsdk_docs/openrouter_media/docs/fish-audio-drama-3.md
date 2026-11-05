> Source: https://docs.fish.audio/features/text-to-speech/drama-3.md (fetched 2026-11-04; Fish Audio's own page for the model OpenRouter serves as fish-audio/drama-3)

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# Drama 3

> Text-to-speech model you can direct

Drama 3 is our latest text-to-speech model built for voice direction and content creation. Alongside your script, you describe how each line should be performed, add sounds and pauses, and limit a delivery to specific words.

## What's new

* Direct a performance in plain language, including a language other than the script.
* Add a sound or a pause where it happens, or limit a delivery to specific words.
* Switch language for a phrase, or pin a pronunciation with phoneme tags.
* Keep your current `POST /v1/tts` request and set the model header to `drama-3`.

## Voice cast

Choosing a voice that fits the role is key to getting the best out of Drama 3. These public voices are used in the examples on this page:

| Name | Language | ID |
| - | - | - |
| [Adrian](https://fish.audio/app/text-to-speech/?modelId=bf322df2096a46f18c579d0baa36f41d) | EN-US, male | `bf322df2096a46f18c579d0baa36f41d` |
| [Delia](https://fish.audio/app/text-to-speech/?modelId=c70cfb98867a4bfb9ae20d2401257b92) | EN-US, female | `c70cfb98867a4bfb9ae20d2401257b92` |
| [Sheila](https://fish.audio/app/text-to-speech/?modelId=f3a2b90078d54a65af4b95f63bc7798e) | EN-US, female | `f3a2b90078d54a65af4b95f63bc7798e` |

## How to use

To use Drama 3, set the `model` header to `drama-3` on your existing `POST /v1/tts` request.

> [!WARNING]
>
> If the `model` header is missing or misspelled, the request doesn't fail: it
> falls back to `s2.1-pro`.

## Pricing

Drama 3 is billed by the size of your input text, at \$50.00 / M UTF-8 bytes. Until November 12, 2026, 09:00 PT (17:00 UTC), the launch promotion price is \$10.00 / M UTF-8 bytes, 80% off. See [Pricing & Rate Limits](https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits.md).

## Direct the performance

Directions are plain text in your script, and you can mix them freely in the same line. They work the same way in API requests and in the web app.

### Describe the delivery in your own words

Put a direction in square brackets before the words it applies to. Write it the way you'd brief a voice actor: emotion, intent, pacing, or who the character is talking to.

Sheila

\[barely holding it together, forcing a smile] I'm fine. Really. Go on without me.

<audio src="https://docs.fish.audio/snippets/drama-3/sheila-01.mp3" preload="metadata" />

### Add sounds and pauses

Put a sound or pause in brackets exactly where it should happen, such as a sigh, a laugh, a breath, or a short pause.

Sheila

I'm fine. \[shaky breath] Really. \[small laugh] Go on without me.

<audio src="https://docs.fish.audio/snippets/drama-3/sheila-02.mp3" preload="metadata" />

### Write directions in any language

Directions can be in English or your own language, and they don't have to match the language of the script.

Sheila

\[像是在强忍着眼泪，却努力笑着] I'm fine. Really. Go on without me.

<audio src="https://docs.fish.audio/snippets/drama-3/sheila-03.mp3" preload="metadata" />

### Change only specific words

Wrap words in a paired tag, such as `<whisper>…</whisper>`, to change the delivery of those words only. Supported tags: `<whisper>`, `<emphasis>`, `<soft>`, `<fast>`, `<slow>`, `<stress>`, `<forceful>`.

Sheila

I'm fine. Really. \<whisper>Go on without me.\</whisper>

<audio src="https://docs.fish.audio/snippets/drama-3/sheila-04.mp3" preload="metadata" />

### Switch language mid-line (Experimental)

Wrap a phrase in a language tag to switch language for those words only. This is useful for a tutor, a conversation, or any line that mixes two languages.

Examples:

Sheila

She looked at the menu and said \<french>Je voudrais une table pour deux, s'il vous plaît.\</french> The waiter smiled.

<audio src="https://docs.fish.audio/snippets/drama-3/sheila-french.mp3" preload="metadata" />

Delia

Welcome to Madrid. \<spanish>Bienvenidos a nuestra casa.\</spanish> Make yourself at home.

<audio src="https://docs.fish.audio/snippets/drama-3/delia-spanish.mp3" preload="metadata" />

Adrian

In Berlin they greet you with \<german>Guten Morgen, wie geht's?\</german> and they actually mean it.

<audio src="https://docs.fish.audio/snippets/drama-3/adrian-german.mp3" preload="metadata" />

Adrian

He bowed and said \<japanese>ありがとうございました\</japanese> before he left.

<audio src="https://docs.fish.audio/snippets/drama-3/adrian-japanese.mp3" preload="metadata" />

Delia

My grandmother always told me \<chinese>慢慢来\</chinese>, which means take your time.

<audio src="https://docs.fish.audio/snippets/drama-3/delia-chinese.mp3" preload="metadata" />

Sheila

The song starts with \<korean>안녕하세요\</korean> and then the beat drops.

<audio src="https://docs.fish.audio/snippets/drama-3/sheila-korean.mp3" preload="metadata" />

Sheila

\<italian>Che bella giornata!\</italian> That's what my neighbor yells every morning.

<audio src="https://docs.fish.audio/snippets/drama-3/sheila-italian.mp3" preload="metadata" />

* Use a voice cloned from a speaker fluent in both languages.
* Wrap only the words that change language.
* Try the pair you need. Accuracy varies by language and voice.

> [!WARNING]
>
> Language tags are experimental. They are not guaranteed for every language or voice, and the model may switch language on its own when the text is already multilingual.

## Pronunciation

Drama 3 works with the phoneme tags already supported on other models. To pin down how a name or term is pronounced, wrap its phonemes in `<|phoneme_start|>` and `<|phoneme_end|>`. In English (CMU Arpabet), the digit on a vowel is its stress: `1` is primary and `0` is unstressed. These two takes are the same word and the same voice, with the stress on a different syllable.

Sheila, stress on the first syllable

I am an \<|phoneme\_start|>EH1 N JH AH0 N IH0 R\<|phoneme\_end|>.

<audio src="https://docs.fish.audio/snippets/drama-3/sheila-phoneme-first.mp3" preload="metadata" />

Sheila, stress on the last syllable

I am an \<|phoneme\_start|>EH0 N JH AH0 N IH1 R\<|phoneme\_end|>.

<audio src="https://docs.fish.audio/snippets/drama-3/sheila-phoneme-last.mp3" preload="metadata" />

The symbol set depends on the language:

| Language | Phonemes |
| - | - |
| [English](https://docs.fish.audio/developer-guide/core-features/fine-grained-control/english.md) | CMU Arpabet |
| [Chinese](https://docs.fish.audio/developer-guide/core-features/fine-grained-control/chinese.md) | pinyin |
| [Japanese](https://docs.fish.audio/developer-guide/core-features/fine-grained-control/japanese.md) | romaji |

## Multi-speaker dialogue

Drama 3 works with multi-speaker dialogue the same way current models do. Generate a whole scene in one request: pass one voice ID per speaker as an array in `reference_id`, and start each turn with a speaker tag. `<|speaker:0|>` uses the first voice, `<|speaker:1|>` the second, and so on. Directions and paired tags from this page work inside each turn. See `reference_id` in the [Text to Speech API](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech.md).

This scene uses three public voices: [Delia](https://fish.audio/app/text-to-speech/?modelId=c70cfb98867a4bfb9ae20d2401257b92) narrates, [Adrian](https://fish.audio/app/text-to-speech/?modelId=bf322df2096a46f18c579d0baa36f41d) is the captain, and [Sheila](https://fish.audio/app/text-to-speech/?modelId=f3a2b90078d54a65af4b95f63bc7798e) is the engineer.

```text theme={null}
Narrator: [calm, measured storyteller voice] The ship had been silent for three days.
Captain: [low, gravelly, tired but in control] Status report.
Engineer: [fast, nervous, stumbling over words] Uh, sir, so, the thing is, the reactor is, it is not, it is not great.
Captain: [slow, dangerously quiet] Define "not great."
Engineer: [voice breaking, close to panic] It is going to <emphasis>blow</emphasis>.
```

The names in the script above are for reading. The request sends the same lines as one `text` string, with a speaker tag instead of a name: `<|speaker:0|>` is the narrator, `<|speaker:1|>` is the captain, and `<|speaker:2|>` is the engineer.

```bash theme={null}
curl --fail --show-error --request POST https://api.fish.audio/v1/tts \
  --header "Authorization: Bearer $FISH_API_KEY" \
  --header "Content-Type: application/json" \
  --header "model: drama-3" \
  --data '{
    "text": "<|speaker:0|>[calm, measured storyteller voice] The ship had been silent for three days.<|speaker:1|>[low, gravelly, tired but in control] Status report.<|speaker:2|>[fast, nervous, stumbling over words] Uh, sir, so, the thing is, the reactor is, it is not, it is not great.<|speaker:1|>[slow, dangerously quiet] Define \"not great.\"<|speaker:2|>[voice breaking, close to panic] It is going to <emphasis>blow</emphasis>.",
    "reference_id": ["c70cfb98867a4bfb9ae20d2401257b92", "bf322df2096a46f18c579d0baa36f41d", "f3a2b90078d54a65af4b95f63bc7798e"],
    "format": "mp3"
  }' \
  --output dialogue.mp3
```

Delia, Adrian, Sheila

<audio src="https://docs.fish.audio/snippets/drama-3/ship.mp3" preload="metadata" />

## Support

Need help? Check out these resources:

* [API Reference](https://docs.fish.audio/api-reference/introduction.md) - Complete API documentation
* [Create a Voice Clone](https://docs.fish.audio/api-reference/endpoint/model/create-model.md) - Create a voice clone model
* [Generate Speech](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech.md) - Generate realistic speech
* [Real-time Streaming](https://docs.fish.audio/features/realtime-streaming.md) - WebSocket for real-time streaming
* [Discord Community](https://discord.com/invite/dF9Db2Tt3Y) - Get help from the community
* [Support Email](mailto:support@fish.audio) - Contact our support team


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.
