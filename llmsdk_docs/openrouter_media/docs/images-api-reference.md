> Source: https://openrouter.ai/docs/api/api-reference/images/generate-an-image.md (fetched 2026-11-04)

> ## Documentation Index
> Fetch the complete documentation index at: https://openrouter.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Generate an image

> Generates an image from a text prompt via the image generation router



## OpenAPI

The `info`, `servers` and `tags` preamble shared by every page of the OpenAPI document is left out.

````yaml
paths:
  /images:
    post:
      tags:
        - Images
      summary: Generate an image
      description: Generates an image from a text prompt via the image generation router
      operationId: createImages
      requestBody:
        content:
          application/json:
            example:
              model: bytedance-seed/seedream-4.5
              prompt: a red panda astronaut floating in space, studio lighting
            schema:
              $ref: '#/components/schemas/ImageGenerationRequest'
        required: true
      responses:
        '200':
          content:
            application/json:
              example:
                created: 1748372400
                data:
                  - b64_json: <base64-encoded-image>
                usage:
                  completion_tokens: 4175
                  cost: 0.04
                  prompt_tokens: 0
                  total_tokens: 4175
              schema:
                $ref: '#/components/schemas/ImageGenerationResponse'
            text/event-stream:
              example:
                data:
                  b64_json: <base64-encoded-partial-image>
                  partial_image_index: 0
                  type: image_generation.partial_image
              schema:
                $ref: '#/components/schemas/ImageStreamingResponse'
              x-speakeasy-sse-sentinel: '[DONE]'
          description: Image generation response
        '400':
          content:
            application/json:
              example:
                error:
                  code: 400
                  message: Invalid request parameters
              schema:
                $ref: '#/components/schemas/BadRequestResponse'
          description: Bad Request - Invalid request parameters or malformed input
        '401':
          content:
            application/json:
              example:
                error:
                  code: 401
                  message: Missing Authentication header
              schema:
                $ref: '#/components/schemas/UnauthorizedResponse'
          description: Unauthorized - Authentication required or invalid credentials
        '402':
          content:
            application/json:
              example:
                error:
                  code: 402
                  message: >-
                    Insufficient credits. Add more using
                    https://openrouter.ai/credits
              schema:
                $ref: '#/components/schemas/PaymentRequiredResponse'
          description: Payment Required - Insufficient credits or quota to complete request
        '403':
          content:
            application/json:
              example:
                error:
                  code: 403
                  message: Only management keys can perform this operation
              schema:
                $ref: '#/components/schemas/ForbiddenResponse'
          description: Forbidden - Authentication successful but insufficient permissions
        '404':
          content:
            application/json:
              example:
                error:
                  code: 404
                  message: Resource not found
              schema:
                $ref: '#/components/schemas/NotFoundResponse'
          description: Not Found - Resource does not exist
        '413':
          content:
            application/json:
              example:
                error:
                  code: 413
                  message: Request payload too large
              schema:
                $ref: '#/components/schemas/PayloadTooLargeResponse'
          description: Payload Too Large - Request payload exceeds size limits
        '429':
          content:
            application/json:
              example:
                error:
                  code: 429
                  message: Rate limit exceeded
              schema:
                $ref: '#/components/schemas/TooManyRequestsResponse'
          description: Too Many Requests - Rate limit exceeded
        '500':
          content:
            application/json:
              example:
                error:
                  code: 500
                  message: Internal Server Error
              schema:
                $ref: '#/components/schemas/InternalServerResponse'
          description: Internal Server Error - Unexpected server error
        '502':
          content:
            application/json:
              example:
                error:
                  code: 502
                  message: Provider returned error
              schema:
                $ref: '#/components/schemas/BadGatewayResponse'
          description: Bad Gateway - Provider/upstream API failure
        '524':
          content:
            application/json:
              example:
                error:
                  code: 524
                  message: Request timed out. Please try again later.
              schema:
                $ref: '#/components/schemas/EdgeNetworkTimeoutResponse'
          description: Infrastructure Timeout - Provider request timed out at edge network
        '529':
          content:
            application/json:
              example:
                error:
                  code: 529
                  message: Provider returned error
              schema:
                $ref: '#/components/schemas/ProviderOverloadedResponse'
          description: Provider Overloaded - Provider is temporarily overloaded
components:
  schemas:
    ImageGenerationRequest:
      description: Image generation request input
      example:
        model: bytedance-seed/seedream-4.5
        prompt: a red panda astronaut floating in space, studio lighting
      properties:
        aspect_ratio:
          description: >-
            Normalized aspect ratio of the generated image. Providers clamp to
            their supported subset.
          enum:
            - '1:1'
            - '1:2'
            - '1:4'
            - '1:8'
            - '2:1'
            - '2:3'
            - 2.35:1
            - '3:2'
            - '3:4'
            - '4:1'
            - '4:3'
            - '4:5'
            - '5:2'
            - '5:4'
            - '5:7'
            - '7:5'
            - '8:1'
            - '9:16'
            - '16:9'
            - '9:19.5'
            - 19.5:9
            - '9:20'
            - '20:9'
            - '9:21'
            - '21:9'
            - auto
          example: '16:9'
          type: string
        background:
          description: >-
            Background treatment. `transparent` requires an output_format that
            supports alpha (png or webp).
          enum:
            - auto
            - transparent
            - opaque
          example: auto
          type: string
        input_references:
          description: >-
            Reference images to guide image-to-image generation, as base64 data
            URLs or HTTP(S) URLs.
          items:
            $ref: '#/components/schemas/ContentPartImage'
          maxItems: 16
          type: array
        model:
          description: The image generation model to use
          example: bytedance-seed/seedream-4.5
          type: string
        'n':
          description: >-
            Upper bound on the number of images to generate (1-10). Providers
            may return fewer images, and providers that only support
            single-image generation reject n > 1.
          example: 1
          type: integer
        output_compression:
          description: >-
            Compression level (0-100) for jpeg/webp output. Ignored by providers
            without a compression knob; providers that honor it may reject it
            with other output formats (e.g. OpenAI requires output_format "jpeg"
            or "webp").
          example: 100
          type: integer
        output_format:
          description: >-
            Encoding of the returned image bytes. Most models produce raster
            formats (png, jpeg, webp). SVG is supported by vectorization models
            (e.g. Quiver) — the SVG markup is UTF-8 base64-encoded in
            `b64_json`.
          enum:
            - png
            - jpeg
            - webp
            - svg
          example: png
          type: string
        prompt:
          description: Text description of the desired image
          example: a red panda astronaut floating in space, studio lighting
          minLength: 1
          type: string
        provider:
          $ref: '#/components/schemas/ImageGenerationProviderPreferences'
        quality:
          description: Rendering quality. Providers without a quality knob ignore this.
          enum:
            - auto
            - low
            - medium
            - high
            - xhigh
            - max
          example: high
          type: string
        resolution:
          description: >-
            Normalized resolution tier of the generated image. Concrete pixel
            dimensions are derived per-provider.
          enum:
            - '512'
            - '768'
            - 1K
            - 1.5K
            - 2K
            - 4K
          example: 2K
          type: string
        seed:
          description: >-
            If specified, the generation will sample deterministically, such
            that repeated requests with the same seed and parameters should
            return the same result. Determinism is not guaranteed for all
            providers.
          type: integer
        session_id:
          description: >-
            A unique identifier for grouping related requests (e.g., a
            conversation or agent workflow). Used for observability grouping in
            Broadcast and private logging; never sent to the provider. If
            provided in both the request body and the x-session-id header, the
            body value takes precedence. Maximum of 256 characters.
          example: session-1234
          maxLength: 256
          type: string
        size:
          description: >-
            Optional. A convenience shorthand for output dimensions — pass a
            tier ("2K", "4K") or explicit pixels ("2048x2048"). A tier size is
            equivalent to setting `resolution` and combines with `aspect_ratio`.
            Explicit pixel sizes are provider-dependent: providers that accept
            them treat the value as authoritative and reject a mismatched
            `resolution` or `aspect_ratio` alongside it with a 400. xAI and
            Sourceful V2/V2.5 reject explicit pixel sizes (use `resolution` and
            `aspect_ratio` there); Sourceful V2.6 supports them within its
            dimension limits and does not allow combining them with `resolution`
            or `aspect_ratio`.
          example: 2K
          type: string
        stream:
          description: >-
            If true, partial images are streamed as SSE events as they become
            available. Only supported by providers with native streaming
            (currently OpenAI). Non-streaming providers ignore this flag and
            return a buffered response.
          type: boolean
        trace:
          $ref: '#/components/schemas/TraceConfig'
        user:
          description: >-
            A stable identifier for your end-users. Used to help detect and
            prevent abuse. Never sent to providers verbatim: for providers whose
            data policy requires user IDs, it is folded into a hashed,
            per-account upstream user identifier.
          example: end-user-abc123
          maxLength: 256
          type: string
      required:
        - model
        - prompt
      type: object
    ImageGenerationResponse:
      description: Image generation response
      example:
        created: 1748372400
        data:
          - b64_json: <base64-encoded-image>
        usage:
          completion_tokens: 4175
          cost: 0.04
          prompt_tokens: 0
          total_tokens: 4175
      properties:
        created:
          description: Unix timestamp (seconds) when the image was generated
          example: 1748372400
          type: integer
        data:
          description: Generated images
          items:
            properties:
              b64_json:
                description: Base64-encoded image bytes
                type: string
              media_type:
                description: >-
                  Media type (MIME type) of the image, e.g. `image/png`,
                  `image/jpeg`, `image/webp`, `image/svg+xml`. May be omitted if
                  the format could not be determined.
                example: image/png
                type: string
            required:
              - b64_json
            type: object
          type: array
        usage:
          $ref: '#/components/schemas/ImageGenerationUsage'
      required:
        - created
        - data
      type: object
    ImageStreamingResponse:
      example:
        data:
          b64_json: <base64-encoded-partial-image>
          partial_image_index: 0
          type: image_generation.partial_image
      properties:
        data:
          anyOf:
            - $ref: '#/components/schemas/ImageGenPartialImageEvent'
            - $ref: '#/components/schemas/ImageGenTextChunkEvent'
            - $ref: '#/components/schemas/ImageGenCompletedEvent'
            - $ref: '#/components/schemas/ImageGenStreamErrorEvent'
      required:
        - data
      type: object
    BadRequestResponse:
      description: Bad Request - Invalid request parameters or malformed input
      example:
        error:
          code: 400
          message: Invalid request parameters
      properties:
        error:
          $ref: '#/components/schemas/BadRequestResponseErrorData'
        openrouter_metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
        user_id:
          type:
            - string
            - 'null'
      required:
        - error
      type: object
    UnauthorizedResponse:
      description: Unauthorized - Authentication required or invalid credentials
      example:
        error:
          code: 401
          message: Missing Authentication header
      properties:
        error:
          $ref: '#/components/schemas/UnauthorizedResponseErrorData'
        openrouter_metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
        user_id:
          type:
            - string
            - 'null'
      required:
        - error
      type: object
    PaymentRequiredResponse:
      description: Payment Required - Insufficient credits or quota to complete request
      example:
        error:
          code: 402
          message: Insufficient credits. Add more using https://openrouter.ai/credits
      properties:
        error:
          $ref: '#/components/schemas/PaymentRequiredResponseErrorData'
        openrouter_metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
        user_id:
          type:
            - string
            - 'null'
      required:
        - error
      type: object
    ForbiddenResponse:
      description: Forbidden - Authentication successful but insufficient permissions
      example:
        error:
          code: 403
          message: Only management keys can perform this operation
      properties:
        error:
          $ref: '#/components/schemas/ForbiddenResponseErrorData'
        openrouter_metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
        user_id:
          type:
            - string
            - 'null'
      required:
        - error
      type: object
    NotFoundResponse:
      description: Not Found - Resource does not exist
      example:
        error:
          code: 404
          message: Resource not found
      properties:
        error:
          $ref: '#/components/schemas/NotFoundResponseErrorData'
        openrouter_metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
        user_id:
          type:
            - string
            - 'null'
      required:
        - error
      type: object
    PayloadTooLargeResponse:
      description: Payload Too Large - Request payload exceeds size limits
      example:
        error:
          code: 413
          message: Request payload too large
      properties:
        error:
          $ref: '#/components/schemas/PayloadTooLargeResponseErrorData'
        openrouter_metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
        user_id:
          type:
            - string
            - 'null'
      required:
        - error
      type: object
    TooManyRequestsResponse:
      description: Too Many Requests - Rate limit exceeded
      example:
        error:
          code: 429
          message: Rate limit exceeded
      properties:
        error:
          $ref: '#/components/schemas/TooManyRequestsResponseErrorData'
        openrouter_metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
        user_id:
          type:
            - string
            - 'null'
      required:
        - error
      type: object
    InternalServerResponse:
      description: Internal Server Error - Unexpected server error
      example:
        error:
          code: 500
          message: Internal Server Error
      properties:
        error:
          $ref: '#/components/schemas/InternalServerResponseErrorData'
        openrouter_metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
        user_id:
          type:
            - string
            - 'null'
      required:
        - error
      type: object
    BadGatewayResponse:
      description: Bad Gateway - Provider/upstream API failure
      example:
        error:
          code: 502
          message: Provider returned error
      properties:
        error:
          $ref: '#/components/schemas/BadGatewayResponseErrorData'
        openrouter_metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
        user_id:
          type:
            - string
            - 'null'
      required:
        - error
      type: object
    EdgeNetworkTimeoutResponse:
      description: Infrastructure Timeout - Provider request timed out at edge network
      example:
        error:
          code: 524
          message: Request timed out. Please try again later.
      properties:
        error:
          $ref: '#/components/schemas/EdgeNetworkTimeoutResponseErrorData'
        openrouter_metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
        user_id:
          type:
            - string
            - 'null'
      required:
        - error
      type: object
    ProviderOverloadedResponse:
      description: Provider Overloaded - Provider is temporarily overloaded
      example:
        error:
          code: 529
          message: Provider returned error
      properties:
        error:
          $ref: '#/components/schemas/ProviderOverloadedResponseErrorData'
        openrouter_metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
        user_id:
          type:
            - string
            - 'null'
      required:
        - error
      type: object
    ContentPartImage:
      example:
        image_url:
          url: https://example.com/image.png
        type: image_url
      properties:
        image_url:
          properties:
            url:
              type: string
          required:
            - url
          type: object
        type:
          enum:
            - image_url
          type: string
      required:
        - type
        - image_url
      type: object
    ImageGenerationProviderPreferences:
      description: >-
        Provider routing preferences and provider-specific passthrough
        configuration.
      example:
        allow_fallbacks: false
        only:
          - google-ai-studio
      properties:
        allow_fallbacks:
          description: >
            Whether to allow backup providers to serve requests

            - true: (default) when the primary provider (or your custom
            providers in "order") is unavailable, use the next best provider.

            - false: use only the primary/custom provider, and return the
            upstream error if it's unavailable.
          type:
            - boolean
            - 'null'
        ignore:
          description: >-
            List of provider slugs to ignore. If provided, this list is merged
            with your account-wide ignored provider settings for this request.
          example:
            - openai
            - anthropic
          items:
            anyOf:
              - $ref: '#/components/schemas/ProviderName'
              - type: string
          type:
            - array
            - 'null'
        only:
          description: >-
            List of provider slugs to allow. If provided, this list is merged
            with your account-wide allowed provider settings for this request.
          example:
            - openai
            - anthropic
          items:
            anyOf:
              - $ref: '#/components/schemas/ProviderName'
              - type: string
          type:
            - array
            - 'null'
        options:
          allOf:
            - $ref: '#/components/schemas/ProviderOptions'
            - example:
                black-forest-labs:
                  guidance: 3
                  steps: 40
        order:
          description: >-
            An ordered list of provider slugs. The router will attempt to use
            the first provider in the subset of this list that supports your
            requested model, and fall back to the next if it is unavailable. If
            no providers are available, the request will fail with an error
            message.
          example:
            - openai
            - anthropic
          items:
            anyOf:
              - $ref: '#/components/schemas/ProviderName'
              - type: string
          type:
            - array
            - 'null'
        sort:
          anyOf:
            - $ref: '#/components/schemas/ProviderSort'
            - $ref: '#/components/schemas/ProviderSortConfig'
            - type: 'null'
          description: >-
            The sorting strategy to use for this request, if "order" is not
            specified. When set, no load balancing is performed.
          example: price
      type: object
    TraceConfig:
      additionalProperties: {}
      description: >-
        Metadata for observability and tracing. Known keys (trace_id,
        trace_name, span_name, generation_name, parent_span_id) have special
        handling. Additional keys are passed through as custom metadata to
        configured broadcast destinations.
      example:
        trace_id: trace-abc123
        trace_name: my-app-trace
      properties:
        generation_name:
          type: string
        parent_span_id:
          type: string
        span_name:
          type: string
        trace_id:
          type: string
        trace_name:
          type: string
      type: object
    ImageGenerationUsage:
      description: Token and cost usage for the image generation request, when available
      example:
        completion_tokens: 4175
        cost: 0.04
        prompt_tokens: 0
        total_tokens: 4175
      properties:
        cache_creation:
          $ref: '#/components/schemas/AnthropicCacheCreation'
        completion_tokens:
          description: The tokens generated
          type: integer
        completion_tokens_details:
          properties:
            audio_tokens:
              description: Tokens generated by the model for audio output.
              type:
                - integer
                - 'null'
            image_tokens:
              description: Tokens generated by the model for image output.
              type:
                - integer
                - 'null'
            reasoning_tokens:
              description: Tokens generated by the model for reasoning.
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
        iterations:
          items:
            $ref: '#/components/schemas/AnthropicUsageIteration'
          type:
            - array
            - 'null'
        prompt_tokens:
          description: Including images, input audio, and tools if any
          type: integer
        prompt_tokens_details:
          description: Breakdown of tokens used in the prompt.
          properties:
            audio_tokens:
              description: Tokens used for input audio.
              type:
                - integer
                - 'null'
            cache_write_tokens:
              description: >-
                Tokens written to cache. Only returned for models with explicit
                caching and cache write pricing.
              type:
                - integer
                - 'null'
            cached_tokens:
              description: Tokens cached by the endpoint.
              type:
                - integer
                - 'null'
            file_tokens:
              description: Tokens used for input files/documents.
              type:
                - integer
                - 'null'
            video_tokens:
              description: Tokens used for input video.
              type:
                - integer
                - 'null'
          type:
            - object
            - 'null'
        server_tool_use:
          description: Usage for server-side tool execution (e.g., web search)
          properties:
            tool_calls_executed:
              description: >-
                Number of OpenRouter server tool calls that executed and
                produced a result.
              type:
                - integer
                - 'null'
            tool_calls_requested:
              description: >-
                Total number of OpenRouter server-orchestrated tool calls the
                model requested, across all tool types. Provider-native tools
                (e.g. native web search) are not counted here.
              type:
                - integer
                - 'null'
            web_search_requests:
              description: >-
                Number of web searches performed by server-side tools. For
                server-orchestrated tool calls a web search is also counted in
                tool_calls_requested; provider-native web search may report
                web_search_requests only. Do not sum the two.
              type:
                - integer
                - 'null'
          type:
            - object
            - 'null'
        service_tier:
          description: The service tier used by the upstream provider for this request
          type:
            - string
            - 'null'
        speed:
          $ref: '#/components/schemas/AnthropicSpeed'
        total_tokens:
          description: Sum of the above two fields
          type: integer
      required:
        - prompt_tokens
        - completion_tokens
        - total_tokens
      type: object
    ImageGenPartialImageEvent:
      description: >-
        Emitted when a partial image becomes available during streaming
        generation
      example:
        b64_json: <base64-encoded-partial-image>
        partial_image_index: 0
        type: image_generation.partial_image
      properties:
        b64_json:
          description: Base64-encoded partial image data
          type: string
        partial_image_index:
          description: 0-based index indicating which partial image this is in the sequence
          type: integer
        type:
          description: The event type
          enum:
            - image_generation.partial_image
          type: string
      required:
        - type
        - partial_image_index
        - b64_json
      type: object
    ImageGenTextChunkEvent:
      description: >-
        Emitted when a text chunk becomes available during streaming generation
        of text-based formats (e.g. SVG)
      example:
        phase: content
        text: <svg xmlns="http://www.w3.org/2000/svg">
        type: image_generation.text_chunk
      properties:
        phase:
          description: >-
            The generation phase this chunk belongs to. `content` is the
            renderable output; `reasoning` and `draft` are intermediate provider
            phases.
          enum:
            - content
            - reasoning
            - draft
          type: string
        text:
          description: >-
            A text fragment of the image being generated (e.g. partial SVG
            markup)
          type: string
        type:
          description: The event type
          enum:
            - image_generation.text_chunk
          type: string
      required:
        - type
        - text
        - phase
      type: object
    ImageGenCompletedEvent:
      description: Emitted when generation completes and the final image is available
      example:
        b64_json: <base64-encoded-final-image>
        created: 1748372400
        type: image_generation.completed
        usage:
          completion_tokens: 4175
          cost: 0.04
          prompt_tokens: 0
          total_tokens: 4175
      properties:
        b64_json:
          description: Base64-encoded final image data
          type: string
        created:
          description: Unix timestamp (seconds) when the image was generated
          type: integer
        media_type:
          description: >-
            Media type (MIME type) of the image, e.g. `image/png`, `image/jpeg`,
            `image/webp`, `image/svg+xml`. May be omitted if the format could
            not be determined.
          example: image/png
          type: string
        type:
          description: The event type
          enum:
            - image_generation.completed
          type: string
        usage:
          $ref: '#/components/schemas/ImageGenerationUsage'
      required:
        - type
        - b64_json
        - created
      type: object
    ImageGenStreamErrorEvent:
      description: Emitted when streaming generation fails after the SSE response starts
      example:
        error:
          code: upstream_error
          message: The upstream provider returned an error
          param: null
          type: provider_error
        type: error
      properties:
        error:
          description: Provider error details
          properties:
            code:
              description: Provider error code, when supplied
              type:
                - string
                - 'null'
            message:
              description: Provider error message
              type: string
            param:
              description: Request parameter associated with the error, when supplied
              type:
                - string
                - 'null'
            type:
              description: Provider error type, when supplied
              type:
                - string
                - 'null'
          required:
            - message
          type: object
        type:
          description: The event type
          enum:
            - error
          type: string
      required:
        - type
        - error
      type: object
    BadRequestResponseErrorData:
      description: Error data for BadRequestResponse
      example:
        code: 400
        message: Invalid request parameters
      properties:
        code:
          type: integer
        message:
          type: string
        metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
      required:
        - code
        - message
      type: object
    UnauthorizedResponseErrorData:
      description: Error data for UnauthorizedResponse
      example:
        code: 401
        message: Missing Authentication header
      properties:
        code:
          type: integer
        message:
          type: string
        metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
      required:
        - code
        - message
      type: object
    PaymentRequiredResponseErrorData:
      description: Error data for PaymentRequiredResponse
      example:
        code: 402
        message: Insufficient credits. Add more using https://openrouter.ai/credits
      properties:
        code:
          type: integer
        message:
          type: string
        metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
      required:
        - code
        - message
      type: object
    ForbiddenResponseErrorData:
      description: Error data for ForbiddenResponse
      example:
        code: 403
        message: Only management keys can perform this operation
      properties:
        code:
          type: integer
        message:
          type: string
        metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
      required:
        - code
        - message
      type: object
    NotFoundResponseErrorData:
      description: Error data for NotFoundResponse
      example:
        code: 404
        message: Resource not found
      properties:
        code:
          type: integer
        message:
          type: string
        metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
      required:
        - code
        - message
      type: object
    PayloadTooLargeResponseErrorData:
      description: Error data for PayloadTooLargeResponse
      example:
        code: 413
        message: Request payload too large
      properties:
        code:
          type: integer
        message:
          type: string
        metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
      required:
        - code
        - message
      type: object
    TooManyRequestsResponseErrorData:
      description: Error data for TooManyRequestsResponse
      example:
        code: 429
        message: Rate limit exceeded
      properties:
        code:
          type: integer
        message:
          type: string
        metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
      required:
        - code
        - message
      type: object
    InternalServerResponseErrorData:
      description: Error data for InternalServerResponse
      example:
        code: 500
        message: Internal Server Error
      properties:
        code:
          type: integer
        message:
          type: string
        metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
      required:
        - code
        - message
      type: object
    BadGatewayResponseErrorData:
      description: Error data for BadGatewayResponse
      example:
        code: 502
        message: Provider returned error
      properties:
        code:
          type: integer
        message:
          type: string
        metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
      required:
        - code
        - message
      type: object
    EdgeNetworkTimeoutResponseErrorData:
      description: Error data for EdgeNetworkTimeoutResponse
      example:
        code: 524
        message: Request timed out. Please try again later.
      properties:
        code:
          type: integer
        message:
          type: string
        metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
      required:
        - code
        - message
      type: object
    ProviderOverloadedResponseErrorData:
      description: Error data for ProviderOverloadedResponse
      example:
        code: 529
        message: Provider returned error
      properties:
        code:
          type: integer
        message:
          type: string
        metadata:
          additionalProperties: {}
          type:
            - object
            - 'null'
      required:
        - code
        - message
      type: object
    ProviderName:
      enum:
        - Modal
        - AkashML
        - AI21
        - AionLabs
        - Alibaba
        - Ambient
        - Ant Digital
        - Baidu
        - Amazon Bedrock
        - Amazon Nova
        - Anthropic
        - Arcee AI
        - AssemblyAI
        - AtlasCloud
        - Avian
        - Azure
        - BaseTen
        - BytePlus
        - Black Forest Labs
        - Cerebras
        - Chutes
        - Cirrascale
        - Claude Platform on AWS
        - Clarifai
        - Cloudflare
        - Cohere
        - CoreWeave
        - Cosine
        - Crucible
        - Crusoe
        - Darkbloom
        - Databricks
        - Decart
        - Deepgram
        - DeepInfra
        - DeepSeek
        - DekaLLM
        - DigitalOcean
        - ElevenLabs
        - Featherless
        - Fireworks
        - Fish Audio
        - Friendli
        - GMICloud
        - Google
        - Google AI Studio
        - Groq
        - HeyGen
        - Inception
        - Inceptron
        - InferenceNet
        - Ionstream
        - Infermatic
        - Io Net
        - Inferact vLLM
        - Inflection
        - KT
        - Liquid
        - Makora
        - Mara
        - Mancer 2
        - Meta
        - Minimax
        - ModelRun
        - Mistral
        - Modular
        - Moonshot AI
        - Morph
        - VoyageAI by MongoDB
        - TypeSafe
        - Near AI
        - Nebius
        - Nex AGI
        - NextBit
        - Novita
        - Nvidia
        - Ollama
        - OpenAI
        - OpenInference
        - Parallel
        - Parasail
        - ParetoAlpha
        - Particle AI
        - Pearl Research
        - Poolside
        - PrimaLabs
        - PrimeIntellect
        - Perceptron
        - Perplexity
        - Phala
        - Recraft
        - Recursive
        - Reka
        - Relace
        - Respan
        - Sail Research
        - Sakana AI
        - SambaNova
        - ScaleDown
        - Seed
        - SiliconFlow
        - Sourceful
        - StepFun
        - Stealth
        - StreamLake
        - Switchpoint
        - Tencent
        - Tenstorrent
        - Thinking Machines
        - Together
        - Unbiased
        - Upstage
        - Venice
        - Wafer
        - WandB
        - Quiver
        - Krea
        - Runway
        - Xiaomi
        - xAI
        - Z.AI
        - FakeProvider
      example: OpenAI
      type: string
    ProviderOptions:
      description: >-
        Provider-specific options keyed by provider slug. The provider segment
        is case-insensitive; an endpoint tag after `/` must match the endpoint
        slug exactly. Only options for the matched provider are forwarded; the
        rest are ignored. Unrecognized keys are silently dropped.
      example:
        openai:
          max_tokens: 1000
      properties:
        01ai:
          additionalProperties: {}
          type: object
        ai21:
          additionalProperties: {}
          type: object
        aion-labs:
          additionalProperties: {}
          type: object
        akashml:
          additionalProperties: {}
          type: object
        alibaba:
          additionalProperties: {}
          type: object
        amazon-bedrock:
          additionalProperties: {}
          type: object
        amazon-bedrock/claude-on-aws:
          additionalProperties: {}
          type: object
        amazon-nova:
          additionalProperties: {}
          type: object
        ambient:
          additionalProperties: {}
          type: object
        antdigital:
          additionalProperties: {}
          type: object
        anthropic:
          additionalProperties: {}
          type: object
        anthropic/2:
          additionalProperties: {}
          type: object
        anyscale:
          additionalProperties: {}
          type: object
        arcee-ai:
          additionalProperties: {}
          type: object
        assemblyai:
          additionalProperties: {}
          type: object
        atlas-cloud:
          additionalProperties: {}
          type: object
        atoma:
          additionalProperties: {}
          type: object
        avian:
          additionalProperties: {}
          type: object
        azure:
          additionalProperties: {}
          type: object
        baidu:
          additionalProperties: {}
          type: object
        baseten:
          additionalProperties: {}
          type: object
        black-forest-labs:
          additionalProperties: {}
          type: object
        byteplus:
          additionalProperties: {}
          type: object
        centml:
          additionalProperties: {}
          type: object
        cerebras:
          additionalProperties: {}
          type: object
        chutes:
          additionalProperties: {}
          type: object
        cirrascale:
          additionalProperties: {}
          type: object
        clarifai:
          additionalProperties: {}
          type: object
        claude-on-aws:
          additionalProperties: {}
          type: object
        cloudflare:
          additionalProperties: {}
          type: object
        cohere:
          additionalProperties: {}
          type: object
        coreweave:
          additionalProperties: {}
          type: object
        cosine:
          additionalProperties: {}
          type: object
        crofai:
          additionalProperties: {}
          type: object
        crucible:
          additionalProperties: {}
          type: object
        crusoe:
          additionalProperties: {}
          type: object
        darkbloom:
          additionalProperties: {}
          type: object
        databricks:
          additionalProperties: {}
          type: object
        decart:
          additionalProperties: {}
          type: object
        deepgram:
          additionalProperties: {}
          type: object
        deepinfra:
          additionalProperties: {}
          type: object
        deepseek:
          additionalProperties: {}
          type: object
        dekallm:
          additionalProperties: {}
          type: object
        digitalocean:
          additionalProperties: {}
          type: object
        elevenlabs:
          additionalProperties: {}
          type: object
        enfer:
          additionalProperties: {}
          type: object
        fake-provider:
          additionalProperties: {}
          type: object
        featherless:
          additionalProperties: {}
          type: object
        fireworks:
          additionalProperties: {}
          type: object
        fish-audio:
          additionalProperties: {}
          type: object
        friendli:
          additionalProperties: {}
          type: object
        gmicloud:
          additionalProperties: {}
          type: object
        google-ai-studio:
          additionalProperties: {}
          type: object
        google-vertex:
          additionalProperties: {}
          type: object
        gopomelo:
          additionalProperties: {}
          type: object
        groq:
          additionalProperties: {}
          type: object
        heygen:
          additionalProperties: {}
          type: object
        huggingface:
          additionalProperties: {}
          type: object
        hyperbolic:
          additionalProperties: {}
          type: object
        hyperbolic-quantized:
          additionalProperties: {}
          type: object
        inception:
          additionalProperties: {}
          type: object
        inceptron:
          additionalProperties: {}
          type: object
        inferact-vllm:
          additionalProperties: {}
          type: object
        inference-net:
          additionalProperties: {}
          type: object
        infermatic:
          additionalProperties: {}
          type: object
        inflection:
          additionalProperties: {}
          type: object
        inocloud:
          additionalProperties: {}
          type: object
        io-net:
          additionalProperties: {}
          type: object
        ionstream:
          additionalProperties: {}
          type: object
        klusterai:
          additionalProperties: {}
          type: object
        krea:
          additionalProperties: {}
          type: object
        kt:
          additionalProperties: {}
          type: object
        lambda:
          additionalProperties: {}
          type: object
        lepton:
          additionalProperties: {}
          type: object
        liquid:
          additionalProperties: {}
          type: object
        lynn:
          additionalProperties: {}
          type: object
        lynn-private:
          additionalProperties: {}
          type: object
        makora:
          additionalProperties: {}
          type: object
        mancer:
          additionalProperties: {}
          type: object
        mancer-old:
          additionalProperties: {}
          type: object
        mara:
          additionalProperties: {}
          type: object
        meta:
          additionalProperties: {}
          type: object
        minimax:
          additionalProperties: {}
          type: object
        mistral:
          additionalProperties: {}
          type: object
        modal:
          additionalProperties: {}
          type: object
        modelrun:
          additionalProperties: {}
          type: object
        modular:
          additionalProperties: {}
          type: object
        moonshotai:
          additionalProperties: {}
          type: object
        morph:
          additionalProperties: {}
          type: object
        ncompass:
          additionalProperties: {}
          type: object
        near-ai:
          additionalProperties: {}
          type: object
        nebius:
          additionalProperties: {}
          type: object
        nex-agi:
          additionalProperties: {}
          type: object
        nextbit:
          additionalProperties: {}
          type: object
        nineteen:
          additionalProperties: {}
          type: object
        novita:
          additionalProperties: {}
          type: object
        nvidia:
          additionalProperties: {}
          type: object
        octoai:
          additionalProperties: {}
          type: object
        ollama:
          additionalProperties: {}
          type: object
        open-inference:
          additionalProperties: {}
          type: object
        openai:
          additionalProperties: {}
          type: object
        parallel:
          additionalProperties: {}
          type: object
        parasail:
          additionalProperties: {}
          type: object
        pareto-alpha:
          additionalProperties: {}
          type: object
        particle-ai:
          additionalProperties: {}
          type: object
        pearl-research:
          additionalProperties: {}
          type: object
        perceptron:
          additionalProperties: {}
          type: object
        perplexity:
          additionalProperties: {}
          type: object
        phala:
          additionalProperties: {}
          type: object
        poolside:
          additionalProperties: {}
          type: object
        primalabs:
          additionalProperties: {}
          type: object
        primeintellect:
          additionalProperties: {}
          type: object
        quiver:
          additionalProperties: {}
          type: object
        recraft:
          additionalProperties: {}
          type: object
        recursal:
          additionalProperties: {}
          type: object
        recursive:
          additionalProperties: {}
          type: object
        reflection:
          additionalProperties: {}
          type: object
        reka:
          additionalProperties: {}
          type: object
        relace:
          additionalProperties: {}
          type: object
        replicate:
          additionalProperties: {}
          type: object
        respan:
          additionalProperties: {}
          type: object
        runway:
          additionalProperties: {}
          type: object
        sail-research:
          additionalProperties: {}
          type: object
        sakana:
          additionalProperties: {}
          type: object
        sakana-ai:
          additionalProperties: {}
          type: object
        sambanova:
          additionalProperties: {}
          type: object
        sambanova-cloaked:
          additionalProperties: {}
          type: object
        scaledown:
          additionalProperties: {}
          type: object
        seed:
          additionalProperties: {}
          type: object
        sf-compute:
          additionalProperties: {}
          type: object
        siliconflow:
          additionalProperties: {}
          type: object
        sourceful:
          additionalProperties: {}
          type: object
        stealth:
          additionalProperties: {}
          type: object
        stepfun:
          additionalProperties: {}
          type: object
        streamlake:
          additionalProperties: {}
          type: object
        switchpoint:
          additionalProperties: {}
          type: object
        targon:
          additionalProperties: {}
          type: object
        tencent:
          additionalProperties: {}
          type: object
        tenstorrent:
          additionalProperties: {}
          type: object
        thinkingmachines:
          additionalProperties: {}
          type: object
        together:
          additionalProperties: {}
          type: object
        together-lite:
          additionalProperties: {}
          type: object
        typesafe:
          additionalProperties: {}
          type: object
        ubicloud:
          additionalProperties: {}
          type: object
        unbiased:
          additionalProperties: {}
          type: object
        upstage:
          additionalProperties: {}
          type: object
        venice:
          additionalProperties: {}
          type: object
        voyageai:
          additionalProperties: {}
          type: object
        wafer:
          additionalProperties: {}
          type: object
        wandb:
          additionalProperties: {}
          type: object
        wandb-legacy:
          additionalProperties: {}
          type: object
        xai:
          additionalProperties: {}
          type: object
        xiaomi:
          additionalProperties: {}
          type: object
        z-ai:
          additionalProperties: {}
          type: object
      type: object
    ProviderSort:
      description: The provider sorting strategy (price, throughput, latency)
      enum:
        - price
        - throughput
        - latency
        - exacto
      example: price
      type: string
    ProviderSortConfig:
      description: The provider sorting strategy (price, throughput, latency)
      example:
        by: price
        partition: model
      properties:
        by:
          description: The provider sorting strategy (price, throughput, latency)
          enum:
            - price
            - throughput
            - latency
            - exacto
            - null
          example: price
          type:
            - string
            - 'null'
        partition:
          description: >-
            Partitioning strategy for sorting: "model" (default) groups
            endpoints by model before sorting (fallback models remain
            fallbacks), "none" sorts all endpoints together regardless of model.
          enum:
            - model
            - none
            - null
          example: model
          type:
            - string
            - 'null'
      type: object
    AnthropicCacheCreation:
      example:
        ephemeral_1h_input_tokens: 0
        ephemeral_5m_input_tokens: 100
      properties:
        ephemeral_1h_input_tokens:
          type: integer
        ephemeral_5m_input_tokens:
          type: integer
      required:
        - ephemeral_5m_input_tokens
        - ephemeral_1h_input_tokens
      type:
        - object
        - 'null'
    CostDetails:
      description: Breakdown of upstream inference costs
      example:
        upstream_inference_completions_cost: 0.0004
        upstream_inference_cost: null
        upstream_inference_prompt_cost: 0.0008
      properties:
        server_tool_cost:
          description: >-
            Metered server-tool execution cost (for example, shell sandbox time)
            billed for this request, in USD. Matches the billed checkpoint and
            settlement amounts exactly. 0 when a metered server tool ran but
            settled at zero dollars; absent when no metered server tool ran.
          format: double
          type:
            - number
            - 'null'
        upstream_inference_completions_cost:
          format: double
          type: number
        upstream_inference_cost:
          format: double
          type:
            - number
            - 'null'
        upstream_inference_prompt_cost:
          format: double
          type: number
      required:
        - upstream_inference_prompt_cost
        - upstream_inference_completions_cost
      type:
        - object
        - 'null'
    AnthropicUsageIteration:
      anyOf:
        - $ref: '#/components/schemas/AnthropicCompactionUsageIteration'
        - $ref: '#/components/schemas/AnthropicMessageUsageIteration'
        - $ref: '#/components/schemas/AnthropicAdvisorMessageUsageIteration'
        - $ref: '#/components/schemas/AnthropicUnknownUsageIteration'
      example:
        cache_creation: null
        cache_creation_input_tokens: 0
        cache_read_input_tokens: 0
        input_tokens: 100
        output_tokens: 50
        type: message
    AnthropicSpeed:
      enum:
        - fast
        - standard
        - null
      example: standard
      type:
        - string
        - 'null'
    AnthropicCompactionUsageIteration:
      allOf:
        - $ref: '#/components/schemas/AnthropicBaseUsageIteration'
        - properties:
            type:
              enum:
                - compaction
              type: string
          required:
            - type
          type: object
      example:
        cache_creation: null
        cache_creation_input_tokens: 0
        cache_read_input_tokens: 0
        input_tokens: 50
        output_tokens: 25
        type: compaction
    AnthropicMessageUsageIteration:
      allOf:
        - $ref: '#/components/schemas/AnthropicBaseUsageIteration'
        - properties:
            model:
              type: string
            type:
              enum:
                - message
              type: string
          required:
            - type
          type: object
      example:
        cache_creation: null
        cache_creation_input_tokens: 0
        cache_read_input_tokens: 0
        input_tokens: 100
        output_tokens: 50
        type: message
    AnthropicAdvisorMessageUsageIteration:
      allOf:
        - $ref: '#/components/schemas/AnthropicBaseUsageIteration'
        - properties:
            model:
              type: string
            type:
              enum:
                - advisor_message
              type: string
          required:
            - type
            - model
          type: object
      example:
        cache_creation: null
        cache_creation_input_tokens: 0
        cache_read_input_tokens: 0
        input_tokens: 823
        model: claude-opus-4-6
        output_tokens: 1612
        type: advisor_message
    AnthropicUnknownUsageIteration:
      allOf:
        - $ref: '#/components/schemas/AnthropicBaseUsageIteration'
        - properties:
            type:
              type: string
          required:
            - type
          type: object
      example:
        cache_creation: null
        cache_creation_input_tokens: 0
        cache_read_input_tokens: 0
        input_tokens: 100
        output_tokens: 50
        type: unknown
    AnthropicBaseUsageIteration:
      example:
        cache_creation: null
        cache_creation_input_tokens: 0
        cache_read_input_tokens: 0
        input_tokens: 100
        output_tokens: 50
      properties:
        cache_creation:
          $ref: '#/components/schemas/AnthropicIterationCacheCreation'
        cache_creation_input_tokens:
          type: integer
        cache_read_input_tokens:
          type: integer
        input_tokens:
          type: integer
        output_tokens:
          type: integer
      type: object
    AnthropicIterationCacheCreation:
      default: null
      example:
        ephemeral_1h_input_tokens: 0
        ephemeral_5m_input_tokens: 0
      properties:
        ephemeral_1h_input_tokens:
          type: integer
        ephemeral_5m_input_tokens:
          type: integer
      type:
        - object
        - 'null'
  securitySchemes:
    apiKey:
      description: API key as bearer token in Authorization header
      scheme: bearer
      type: http

````
