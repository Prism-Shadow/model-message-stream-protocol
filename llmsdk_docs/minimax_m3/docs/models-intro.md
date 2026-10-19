> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Models

> Overview of MiniMax AI models and their capabilities

### Language

| **Models**           | **Description**           | **Features**                 |
| :- | :- | :- |
| <a href="/docs/api-reference/text-anthropic-api" style={{whiteSpace:"nowrap"}}>MiniMax-M3.1-Flash</a> | Frontier multimodal coding model with 1M context window and tunable thinking depth | • Multimodal<br />• 1M context window<br />• Frontier coding<br />• Tunable thinking depth |
| [MiniMax-M3](/docs/api-reference/text-anthropic-api) | Frontier multimodal coding model with 1M context window | • Multimodal<br />• 1M context window<br />• Frontier coding |

### Video

| **Models**             | **Description**                   | **Res.& Dur.**         | **FPS**         |
| :- | :- | :- | :- |
| [MiniMax H3](/docs/api-reference/video-generation-v2-create) | Next-gen open general-purpose multimodal video model<br />• Text-to-Video / Image-to-Video / First–Last Frame / Multimodal reference | • 768P / 2K<br />• 4–15s | 24 fps |
| [MiniMax H3 Max](/docs/api-reference/video-generation-v2-create) | High-speed video model post-trained by [fal.ai](https://fal.ai/) on MiniMax H3, optimized for high-speed generation<br />• Text-to-Video / Image-to-Video (first / last frame) | • 480P / 768P<br />• 5–15s | 24 fps |

<Accordion title="Legacy Models">
  | **Models**             | **Description**                   | **Res.& Dur.**         | **FPS**         |
  | :- | :- | :- | :- |
  | [MiniMax Hailuo 2.3](/docs/api-reference/video-generation-t2v) | • Text to Video & Image to Video<br />• SOTA instruction following<br />• Extreme physics mastery | • 1080p 6s<br />• 768p 6s, 10s<br /> | 24 fps |
  | [MiniMax Hailuo 2.3Fast](/docs/api-reference/video-generation-i2v) | •  Image to Video<br />• Extreme physics mastery<br />• Value and Efficiency | • 1080p 6s<br />• 768p 6s, 10s<br /> | 24 fps |
  | [MiniMax Hailuo 02](/docs/api-reference/video-generation-t2v) | • Text to Video & Image to Video<br />• SOTA instruction following<br />• Extreme physics mastery | • 1080p 6s<br />• 768p 6s, 10s<br />• 512p 6s, 10s | 24 fps |
</Accordion>

### Audio

| **Models**             | **Description**           | **Features**                           |
| :- | :- | :- |
| [speech-2.8-hd](/docs/api-reference/speech-t2a-http) | • Ultra-realistic quality featuring sound tags | • 40 languages supported<br />• 7 emotions supported<br />• specified languages and dialects supported |
| [speech-2.8-turbo](/docs/api-reference/speech-t2a-http) | • Seamless speed meets natural flow | • 40 languages supported<br />• 7 emotions supported<br />• specified languages and dialects supported |

<Accordion title="Legacy Models">
  | **Models**             | **Description**           | **Features**                           |
  | :- | :- | :- |
  | [speech-2.6-hd](/docs/api-reference/speech-t2a-http) | • Ultimate Similarity<br />• Ultra-High Quality | • 40 languages supported<br />• 7 emotions supported<br />• specified languages and dialects supported |
  | [speech-2.6-turbo](/docs/api-reference/speech-t2a-http) | • Ultimate Value<br />• Low latency | • 40 languages supported<br />• 7 emotions supported<br />• specified languages and dialects supported |
  | [speech-02-hd](/docs/api-reference/speech-t2a-http) | • Stronger replication similarity<br />• High quality voice generation | • 24 languages supported<br />• 7 emotions supported<br />• specified languages and dialects supported |
  | [speech-02-turbo](/docs/api-reference/speech-t2a-http) | • Superior rhythm and stability<br />• Low latency | • 24 languages supported<br />• 7 emotions supported<br />• specified languages and dialects supported |
</Accordion>

### Music

<Note title="Music API Service Adjustment Notice">
  Starting August 20, 2026, the paid APIs (Music Generation and Lyrics Generation) will no longer be available to new users; existing paying users can continue to use the current API services. The free music generation APIs (Music-3.0-free, Music-2.6-free, music-cover-free) will be discontinued.

  To experience or use music generation capabilities, please visit [MiniMax Audio](https://www.minimax.io/audio), or use the open-source [MiniMax Music 3 model on Hugging Face](https://huggingface.co/MiniMaxAI/MiniMax-Music3).
</Note>

| **Models**             | **Description**           | **Features**                           |
| :- | :- | :- |
| [music-3.0](/docs/api-reference/music-generation) | • New Music Generation Capabilities | • Intent Understood<br />• Sound Elevated<br />• Vocals Humanized |
| [music-2.6](/docs/api-reference/music-generation) | • Cover Reborn. Bass Redefined. | • Cover Reborn. Bass Redefined. |
| [music-cover](/docs/api-reference/music-generation) | • Generate cover versions from reference audio | • One-step cover generation<br />• Two-step cover with lyrics modification<br />• Style transfer<br />• Auto lyrics extraction |

<Accordion title="Legacy Models">
  | **Models**             | **Description**           | **Features**                           |
  | :- | :- | :- |
  | [music-2.0](/docs/api-reference/music-generation) | • Text to Music<br />• Enhanced musicality <br />• Natural vocals and smooth melodies | • Human-like performance<br />• Riche emotional expression<br />• Enhanced tone control<br /> |
</Accordion>
