> Source: https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion.md (fetched 2026-11-04; excerpt: the request fields and component schemas that carry image and audio output and audio input)


# Chat Completions: image and audio output (excerpt)

## `ChatRequest` fields

```yaml
        modalities:
          description: >-
            Output modalities for the response. Supported values are "text",
            "image", and "audio".
          example:
            - text
            - image
          items:
            enum:
              - text
              - image
              - audio
            type: string
          type: array
        image_config:
          $ref: '#/components/schemas/ImageConfig'
```

## `ImageConfig`

```yaml
    ImageConfig:
      additionalProperties:
        anyOf:
          - type: string
          - format: double
            type: number
          - items: {}
            type: array
      description: >-
        Provider-specific image configuration options. Keys and values vary by
        model/provider. See
        https://openrouter.ai/docs/guides/overview/multimodal/image-generation
        for more details.
      example:
        aspect_ratio: '16:9'
        quality: high
      type: object
```

## `ChatAssistantImages`

```yaml
    ChatAssistantImages:
      description: Generated images from image generation models
      example:
        - image_url:
            url: data:image/png;base64,iVBORw0KGgo...
      items:
        properties:
          image_url:
            properties:
              url:
                description: URL or base64-encoded data of the generated image
                type: string
            required:
              - url
            type: object
        required:
          - image_url
        type: object
      type: array
```

## `ChatStreamDelta`

```yaml
    ChatStreamDelta:
      description: Delta changes in streaming response
      example:
        content: Hello
        role: assistant
      properties:
        audio:
          allOf:
            - $ref: '#/components/schemas/ChatAudioOutput'
            - description: Audio output data
        content:
          description: Message content delta
          example: Hello
          type:
            - string
            - 'null'
        reasoning:
          description: Reasoning content delta
          example: I need to
          type:
            - string
            - 'null'
        reasoning_details:
          $ref: '#/components/schemas/ChatStreamReasoningDetails'
        refusal:
          description: Refusal message delta
          example: null
          type:
            - string
            - 'null'
        role:
          description: The role of the message author
          enum:
            - assistant
          example: assistant
          type: string
        tool_calls:
          description: Tool calls delta
          items:
            $ref: '#/components/schemas/ChatStreamToolCall'
          type: array
      type: object
```

## `ChatAudioOutput`

```yaml
    ChatAudioOutput:
      description: Audio output data or reference
      example:
        data: UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1f
        expires_at: 1677652400
        id: audio_abc123
        transcript: Hello! How can I help you today?
      properties:
        data:
          description: Base64 encoded audio data
          type: string
        expires_at:
          description: Audio expiration timestamp
          type: integer
        id:
          description: Audio output identifier
          type: string
        transcript:
          description: Audio transcript
          type: string
      type: object
```

## `ChatContentAudio`

```yaml
    ChatContentAudio:
      description: Audio input content part. Supported audio formats vary by provider.
      example:
        input_audio:
          data: SGVsbG8gV29ybGQ=
          format: wav
        type: input_audio
      properties:
        input_audio:
          properties:
            data:
              description: Base64 encoded audio data
              type: string
            format:
              description: >-
                Audio format (e.g., wav, mp3, flac, m4a, ogg, aiff, aac, pcm16,
                pcm24). Supported formats vary by provider.
              type: string
          required:
            - data
            - format
          type: object
        type:
          enum:
            - input_audio
          type: string
      required:
        - type
        - input_audio
      type: object
```

## `ChatUsage`

```yaml
    ChatUsage:
      description: Token usage statistics
      example:
        completion_tokens: 15
        completion_tokens_details:
          reasoning_tokens: 5
        cost: 0.0012
        cost_details:
          upstream_inference_completions_cost: 0.0004
          upstream_inference_cost: null
          upstream_inference_prompt_cost: 0.0008
        is_byok: false
        prompt_tokens: 10
        prompt_tokens_details:
          cached_tokens: 2
        server_tool_use_details:
          tool_calls_executed: 2
          tool_calls_requested: 2
        total_tokens: 25
      properties:
        completion_tokens:
          description: Number of tokens in the completion
          type: integer
        completion_tokens_details:
          description: Detailed completion token usage
          properties:
            accepted_prediction_tokens:
              description: Accepted prediction tokens
              type:
                - integer
                - 'null'
            audio_tokens:
              description: Tokens used for audio output
              type:
                - integer
                - 'null'
            reasoning_tokens:
              description: Tokens used for reasoning
              type:
                - integer
                - 'null'
            rejected_prediction_tokens:
              description: Rejected prediction tokens
              type:
                - integer
                - 'null'
          type:
            - object
            - 'null'
        cost:
          description: Cost of the completion
          format: double
          type:
            - number
            - 'null'
        cost_details:
          $ref: '#/components/schemas/CostDetails'
        is_byok:
          description: Whether a request was made using a Bring Your Own Key configuration
          type: boolean
        prompt_tokens:
          description: Number of tokens in the prompt
          type: integer
        prompt_tokens_details:
          description: Detailed prompt token usage
          properties:
            audio_tokens:
              description: Audio input tokens
              type: integer
            cache_write_tokens:
              description: >-
                Tokens written to cache. Only returned for models with explicit
                caching and cache write pricing.
              type: integer
            cached_tokens:
              description: Cached prompt tokens
              type: integer
            video_tokens:
              description: Video input tokens
              type: integer
          type:
            - object
            - 'null'
        server_tool_use_details:
          $ref: '#/components/schemas/ServerToolUseDetails'
        total_tokens:
          description: Total number of tokens
          type: integer
      required:
        - completion_tokens
        - prompt_tokens
        - total_tokens
      type: object
```
