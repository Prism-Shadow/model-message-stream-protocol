<br />

Gemini 3.8 Flash TTS (`gemini-3.8-flash-tts`) is Google's flagship creative
text-to-speech model, engineered for studio-grade voice fidelity, expressive
acting, authentic regional accents, and rock-solid long-form multi-turn
stability.
[Try in Google AI Studio](https://aistudio.google.com?model=gemini-3.8-flash-tts)

## Overview and capabilities

Gemini 3.8 Flash TTS sets a new benchmark for expressive audio generation:

- **High acoustic fidelity and acting nuance:** Delivers rich emotional range, natural cadence, and precise adherence to turn-level `style` directions and inline vocal events (`<laugh>`, `<sigh>`, `<short pause>`).
- **Long-form multi-turn stability:** Maintains consistent voice identity, timbre, volume, and acoustic room tone across extended dialogues and multi-minute narrations without voice drift.
- **Authentic regional accents and pronunciation:** Supports regional accents and minority dialects.
- **Full voice ecosystem support:** Works seamlessly with prebuilt voices, the Extended Voice Library (`GET /v1beta/voices`), custom [Voice design](https://ai.google.dev/gemini-api/docs/voice-design) personas, and [Voice replication](https://ai.google.dev/gemini-api/docs/voice-replication) (persistent stored voices by default, plus optional stateless keys). You can also design and replicate voices interactively in [Google AI Studio](https://aistudio.google.com/generate-speech).

Visit the [Text-to-speech](https://ai.google.dev/gemini-api/docs/speech-generation) guide for full
coverage of features, prompting best practices, and code examples.

## When to use which TTS model

Both Gemini 3.8 TTS models share the same API schema and prompting structure.
Choose the model that fits your workload:

| Feature / workload | Gemini 3.8 Flash TTS (`gemini-3.8-flash-tts`) | Gemini 3.8 Flash-Lite TTS (`gemini-3.8-flash-lite-tts`) |
|---|---|---|
| **Primary strength** | Maximum voice fidelity, acting nuance, and dialect coverage | High throughput, low latency, and cost efficiency |
| **Best use cases** | Audiobooks, studio narration, complex multi-speaker dialogue, heavy vocal-burst acting, difficult pronunciation, regional dialects | High-volume production, real-time voice agent cascades, read-aloud features, voice replication, everyday single-speaker generation |
| **Supported languages** | 130 languages | 101 languages |
| **Recommended replacement for** | New flagship creative tier | `gemini-3.1-flash-tts-preview` |

## Migration guide

If you are migrating from `gemini-3.1-flash-tts-preview` or earlier Gemini TTS
models, update your requests for the Gemini 3.8 TTS schema:

1. **Move turn-level directions into `speech_metadata`:** Gemini 3.8 TTS treats input text strictly as a verbatim transcript. Inline text directions like `"Say cheerfully: Hello!"` or `"Speaker 1: Hello!"` may be spoken aloud. Move sustained delivery instructions (`style`) and speaker labels (`speaker`) into structured metadata:
   - **Interactions API:** Attach an annotation with `"type":
     "speech_metadata"`, `"speaker"`, and `"style"` to each text content block.
   - **GenerateContent API:** Attach `"speech_metadata": {"speaker": "...",
     "style": "..."}` to each `part`.
2. **Use angle-bracket inline tags only for point-in-time vocal events:** Keep momentary non-speech vocalizations and pauses inline in the transcript using angle brackets (such as `<laugh>`, `<sigh>`, `<cough>`, `<breath>`, or `<short pause>`). Put delivery styles like whispering in `speech_metadata.style`.
3. **Specify `speaker` on every turn in multi-speaker requests:** Every turn in a multi-speaker request must explicitly include `speaker` inside `speech_metadata` matching one of the configured speakers.
4. **Design personas upfront with Voice design:** Replace long legacy Audio Profile / Director's Notes blocks with a custom voice created in [Voice design](https://ai.google.dev/gemini-api/docs/voice-design), then carry that `voice_...` ID through your TTS requests with minimal or empty `style` strings.
5. **Account for default WAV (`audio/wav`) output on unary requests:** Unlike `gemini-3.1-flash-tts-preview` and earlier TTS models (which returned headerless raw PCM `audio/l16` by default), Gemini 3.8 TTS returns WAV audio (`audio/wav` / `AUDIO_WAV`) with a standard RIFF header by default for unary requests.
   - If your code previously wrapped raw PCM bytes in a WAV header (for example, using Python's `wave` module or `ffmpeg`), remove the manual header wrapper and write the returned bytes directly to a `.wav` file.
   - If your pipeline requires headerless raw PCM, mu-law, or A-law audio, explicitly set `response_format` to `"audio/l16"` (`"AUDIO_L16"`), `"audio/mulaw"` (`"AUDIO_MULAW"`), or `"audio/alaw"` (`"AUDIO_ALAW"`). See [Audio output formats](https://ai.google.dev/gemini-api/docs/speech-generation#audio-output-formats).

## gemini-3.8-flash-tts

| Property | Description |
|---|---|
| Model code | `gemini-3.8-flash-tts` |
| Supported data types | **Inputs** Text **Output** Audio |
| Token limits^[\[\*\]](https://ai.google.dev/gemini-api/docs/tokens)^ | **Input token limit** 8,192 **Output token limit** 16,384 (Gemini API serving limit) |
| Capabilities | **[Audio generation](https://ai.google.dev/gemini-api/docs/speech-generation)** Supported **[Caching](https://ai.google.dev/gemini-api/docs/caching)** Supported **[Code execution](https://ai.google.dev/gemini-api/docs/code-execution)** Not supported **[File search](https://ai.google.dev/gemini-api/docs/file-search)** Not supported **[Function calling](https://ai.google.dev/gemini-api/docs/function-calling)** Not supported **[Grounding with Google Maps](https://ai.google.dev/gemini-api/docs/maps-grounding)** Not supported **[Image generation](https://ai.google.dev/gemini-api/docs/image-generation)** Not supported **[Live API](https://ai.google.dev/gemini-api/docs/live-api)** Not supported **[Search grounding](https://ai.google.dev/gemini-api/docs/google-search)** Not supported **[Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)** Not supported **[Thinking](https://ai.google.dev/gemini-api/docs/thinking)** Not supported **[URL context](https://ai.google.dev/gemini-api/docs/url-context)** Not supported |
| Consumption options | **[Batch API](https://ai.google.dev/gemini-api/docs/batch-api)** Supported **[Flex inference](https://ai.google.dev/gemini-api/docs/flex-inference)** Supported **[Priority inference](https://ai.google.dev/gemini-api/docs/priority-inference)** Supported |
| Versions | Read the [model version patterns](https://ai.google.dev/gemini-api/docs/models/gemini#model-versions) for more details. - `gemini-3.8-flash-tts` |
| Latest update | September 2026 |

## Supported languages

`gemini-3.8-flash-tts` detects the input language automatically and supports
**over 130 languages**:

| Language | Language | Language |
|---|---|---|
| Acehnese (Arab script) | Greek | Nepali (individual language) |
| Afrikaans | Guarani | Nigerian Fulfulde |
| Akan | Gujarati | North Azerbaijani |
| Amharic | Haitian Creole | Northern Sotho |
| Armenian | Halh Mongolian | Northern Uzbek |
| Assamese | Hausa | Norwegian Bokmål |
| Awadhi | Hebrew | Norwegian Nynorsk |
| Balinese | Hindi | Nyanja |
| Bangla | Hungarian | Occitan |
| Banjar (Arab script) | Icelandic | Odia (individual language) |
| Banjar (Latn script) | Igbo | Pangasinan |
| Bashkir | Iloko | Persian (Afghanistan) |
| Basque | Indonesian | Polish |
| Belarusian | Iranian Persian | Portuguese |
| Bemba | Italian | Punjabi |
| Bhojpuri | Japanese | Romanian |
| Bosnian | Javanese | Russian |
| Buginese | Kabyle | Santali |
| Bulgarian | Kamba | Serbian |
| Burmese | Kannada | Sindhi |
| Cantonese | Kashmiri (Arab script) | Sinhala |
| Catalan | Kashmiri (Deva script) | Slovak |
| Cebuano | Kazakh | Slovenian |
| Central Kurdish | Khmer | Somali |
| Chhattisgarhi | Kikuyu | South Azerbaijani |
| Chinese (Hans script) | Kinyarwanda | Southern Pashto |
| Chinese (Hant script) | Kongo | Southern Sotho |
| Crimean Tatar | Korean | Spanish |
| Croatian | Kyrgyz | Standard Arabic (Arab script) |
| Czech | Lao | Standard Arabic (Latn script) |
| Danish | Latgalian | Standard Latvian |
| Dutch | Lingala | Standard Malay |
| Dyula | Lithuanian | Swahili (individual language) |
| Dzongkha | Luxembourgish | Swati |
| Egyptian Arabic | Macedonian | Swedish |
| English | Magahi | Tajik |
| Estonian | Maithili | Tamil |
| Filipino | Malayalam | Telugu |
| Finnish | Maltese | Thai |
| French | Manipuri | Tigrinya |
| Galician | Marathi | Tosk Albanian |
| Ganda | Minangkabau (Arab script) | Turkish |
| Georgian | Minangkabau (Latn script) | Uyghur |
| German | Mizo | Vietnamese |