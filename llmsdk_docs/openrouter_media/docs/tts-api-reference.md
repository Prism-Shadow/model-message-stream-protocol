> Source: https://openrouter.ai/docs/api/api-reference/tts/create-speech.md (fetched 2026-11-04)

> ## Documentation Index
> Fetch the complete documentation index at: https://openrouter.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Create speech

> Synthesizes audio from the input text. Returns a raw audio bytestream in the requested format (e.g. mp3, pcm, wav).



## OpenAPI

The `info`, `servers` and `tags` preamble shared by every page of the OpenAPI document is left out.

````yaml
paths:
  /audio/speech:
    post:
      tags:
        - TTS
      summary: Create speech
      description: >-
        Synthesizes audio from the input text. Returns a raw audio bytestream in
        the requested format (e.g. mp3, pcm, wav).
      operationId: createAudioSpeech
      requestBody:
        content:
          application/json:
            example:
              input: Hello world
              model: mistralai/voxtral-mini-tts-2603
              response_format: pcm
              speed: 1
              voice: en_paul_neutral
            schema:
              $ref: '#/components/schemas/SpeechRequest'
        required: true
      responses:
        '200':
          content:
            audio/*:
              schema:
                description: >-
                  Raw audio bytestream. Content-Type varies by requested format
                  (audio/mpeg for mp3, audio/pcm for pcm — 16-bit
                  little-endian).
                example: <binary audio data>
                format: binary
                type: string
          description: Audio bytes stream
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
        '503':
          content:
            application/json:
              example:
                error:
                  code: 503
                  message: Service temporarily unavailable
              schema:
                $ref: '#/components/schemas/ServiceUnavailableResponse'
          description: Service Unavailable - Service temporarily unavailable
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
    SpeechRequest:
      description: Text-to-speech request input
      example:
        input: Hello world
        model: mistralai/voxtral-mini-tts-2603
        response_format: pcm
        speed: 1
        voice: en_paul_neutral
      properties:
        input:
          $ref: '#/components/schemas/SpeechInput'
        input_references:
          description: >-
            Reference content for stateless voice cloning or voice design. Audio
            mode: one to three `input_audio` parts, each optionally paired with
            a `text` part carrying its transcript (a single clip accepts its
            transcript before or after it; with multiple clips each transcript
            immediately follows its clip), plus at most one `image_url` part as
            a scene image on providers that condition the cloned voice on its
            setting; only routed to endpoints that support voice cloning (and
            multiple references or image references when those parts are sent).
            Image mode: exactly one `image_url` part; only routed to endpoints
            that support image references. An empty array is treated as no
            reference.
          example:
            - input_audio:
                data: data:audio/wav;base64,UklGRuQXDABXQVZF...
              type: input_audio
            - text: I used to rule the world.
              type: text
          items:
            $ref: '#/components/schemas/SpeechInputReference'
          type: array
        instructions:
          description: >-
            Delivery instructions for the whole request, such as tone, pacing,
            or emotion. Supported by OpenAI gpt-4o-mini-tts, Gemini TTS, and
            Fish Audio models. Ignored by other providers.
          example: Speak in a warm and friendly tone.
          type: string
        model:
          description: TTS model identifier
          example: mistralai/voxtral-mini-tts-2603
          type: string
        provider:
          description: >-
            Provider configuration: data policy routing preferences (`zdr`,
            `data_collection`) and provider-specific passthrough options
          properties:
            data_collection:
              description: >-
                Data collection setting. If no available model provider meets
                the requirement, your request will return an error.

                - allow: (default) allow providers which store user data
                non-transiently and may train on it


                - deny: use only providers which do not collect user data.
              enum:
                - deny
                - allow
                - null
              example: allow
              title: SpeechRequestDataCollection
              type:
                - string
                - 'null'
            options:
              $ref: '#/components/schemas/ProviderOptions'
            zdr:
              description: >-
                Whether to restrict routing to only ZDR (Zero Data Retention)
                endpoints. When true, only endpoints that do not retain prompts
                will be used.
              example: true
              type:
                - boolean
                - 'null'
          type: object
        response_format:
          default: pcm
          description: Audio output format
          enum:
            - mp3
            - pcm
          example: pcm
          type: string
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
        speed:
          description: >-
            Playback speed multiplier. Honored by models that support it (e.g.
            OpenAI TTS). Other providers either ignore it or return a 400 for a
            non-default value when the model has no speed control.
          example: 1
          format: double
          type: number
        trace:
          $ref: '#/components/schemas/TraceConfig'
        user:
          description: >-
            A unique identifier representing your end-user. Forwarded to
            Broadcast and private logging as the end-user id; never sent to the
            provider.
          example: user-1234
          maxLength: 256
          type: string
        voice:
          description: Voice identifier (provider-specific).
          example: en_paul_neutral
          minLength: 1
          type: string
      required:
        - model
        - input
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
    ServiceUnavailableResponse:
      description: Service Unavailable - Service temporarily unavailable
      example:
        error:
          code: 503
          message: Service temporarily unavailable
      properties:
        error:
          $ref: '#/components/schemas/ServiceUnavailableResponseErrorData'
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
    SpeechInput:
      anyOf:
        - type: string
        - items:
            $ref: '#/components/schemas/SpeechTurn'
          minItems: 1
          type: array
      description: >-
        Text to synthesize, or a list of turns for multi-speaker input. Each
        turn has its own text, voice, and instructions. Multi-speaker input is
        supported by Gemini TTS models and by Fish Audio models other than S1.
      example: Hello world
    SpeechInputReference:
      description: Reference content part for stateless voice cloning or voice design
      discriminator:
        mapping:
          image_url: '#/components/schemas/SpeechInputReferenceImage'
          input_audio: '#/components/schemas/SpeechInputReferenceAudio'
          text: '#/components/schemas/SpeechInputReferenceText'
        propertyName: type
      oneOf:
        - $ref: '#/components/schemas/SpeechInputReferenceAudio'
        - $ref: '#/components/schemas/SpeechInputReferenceText'
        - $ref: '#/components/schemas/SpeechInputReferenceImage'
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
    ServiceUnavailableResponseErrorData:
      description: Error data for ServiceUnavailableResponse
      example:
        code: 503
        message: Service temporarily unavailable
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
    SpeechTurn:
      properties:
        instructions:
          description: >-
            Delivery instructions for this turn, such as tone, pacing, or
            emotion. Overrides the top-level `instructions`.
          example: whispering
          type: string
        text:
          description: Text to synthesize
          example: Hi Jane.
          type: string
        voice:
          description: Voice for this turn. Defaults to the top-level `voice`.
          example: Kore
          minLength: 1
          type: string
      required:
        - text
      type: object
    SpeechInputReferenceImage:
      description: >-
        Reference image. On its own it describes the desired voice (voice
        design); alongside an `input_audio` part it is a scene image describing
        the setting the cloned voice speaks in. At most one per request. Only
        routed to endpoints that support image references.
      example:
        image_url:
          url: data:image/png;base64,iVBORw0KGgo...
        type: image_url
      properties:
        image_url:
          $ref: '#/components/schemas/SpeechInputReferenceImageInput'
        type:
          enum:
            - image_url
          type: string
      required:
        - type
        - image_url
      type: object
    SpeechInputReferenceAudio:
      description: >-
        Reference audio input for stateless voice cloning. Up to three parts per
        request; the Nth audio part is addressable from `input` as `@AudioN` on
        providers that support multiple references.
      example:
        input_audio:
          data: data:audio/wav;base64,UklGRuQXDABXQVZF...
        type: input_audio
      properties:
        input_audio:
          $ref: '#/components/schemas/SpeechInputReferenceAudioInput'
        type:
          enum:
            - input_audio
          type: string
      required:
        - type
        - input_audio
      type: object
    SpeechInputReferenceText:
      description: Transcript of an `input_audio` part
      example:
        text: I used to rule the world.
        type: text
      properties:
        text:
          description: >-
            Transcript of an `input_audio` part. With a single clip it may
            appear before or after the clip; with multiple clips it must
            immediately follow the clip it transcribes.
          example: I used to rule the world.
          maxLength: 10000
          type: string
        type:
          enum:
            - text
          type: string
      required:
        - type
        - text
      type: object
    SpeechInputReferenceImageInput:
      description: Reference image input object
      properties:
        url:
          description: >-
            JPEG, PNG, or WebP reference image as a base64 data URI or a public
            http(s) URL. Remote images are downloaded (15 MiB max) and forwarded
            as bytes, never as the URL.
          example: data:image/png;base64,iVBORw0KGgo...
          maxLength: 20971520
          minLength: 1
          type: string
      required:
        - url
      type: object
    SpeechInputReferenceAudioInput:
      description: Reference audio input object
      properties:
        data:
          description: >-
            Base64-encoded reference audio (optionally a data URI). Supported
            audio formats are provider-specific. Limited to 20 MiB of base64 (15
            MiB of decoded audio). Exactly one of `data` or `url` is required.
          example: data:audio/wav;base64,UklGRuQXDABXQVZF...
          maxLength: 20971520
          minLength: 1
          type: string
        format:
          description: >-
            Audio format of the reference audio (e.g., wav, mp3). Optional; most
            providers detect the format from the audio bytes.
          example: wav
          type: string
        url:
          description: >-
            Public http(s) URL of the reference audio. OpenRouter downloads it
            (15 MiB max) and forwards the bytes, never the URL. Exactly one of
            `data` or `url` is required.
          example: https://example.com/reference.wav
          format: uri
          maxLength: 2048
          type: string
      type: object
  securitySchemes:
    apiKey:
      description: API key as bearer token in Authorization header
      scheme: bearer
      type: http

````
