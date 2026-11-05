> Source: https://openrouter.ai/docs/api/api-reference/stt/create-transcription.md (fetched 2026-11-04)

> ## Documentation Index
> Fetch the complete documentation index at: https://openrouter.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Create transcription

> Transcribes audio into text. Accepts base64-encoded audio input as JSON, an OpenAI-style multipart/form-data file upload, or a URL the provider downloads directly, and returns the transcribed text.



## OpenAPI

The `info`, `servers` and `tags` preamble shared by every page of the OpenAPI document is left out.

````yaml
paths:
  /audio/transcriptions:
    post:
      tags:
        - STT
      summary: Create transcription
      description: >-
        Transcribes audio into text. Accepts base64-encoded audio input as JSON,
        an OpenAI-style multipart/form-data file upload, or a URL the provider
        downloads directly, and returns the transcribed text.
      operationId: createAudioTranscriptions
      requestBody:
        content:
          application/json:
            example:
              input_audio:
                data: UklGRiQA...
                format: wav
              language: en
              model: openai/whisper-large-v3
            schema:
              $ref: '#/components/schemas/STTRequest'
          multipart/form-data:
            example:
              file: audio.wav
              language: en
              model: openai/whisper-large-v3
            schema:
              properties:
                diarize:
                  description: >-
                    Label each word with the speaker who said it
                    (words[].speaker, words[].speaker_label). Requires
                    response_format "verbose_json" (400 otherwise); word
                    timestamps are included even when timestamp_granularities[]
                    omits "word". Only supported by some providers; 400 when the
                    selected model cannot diarize.
                  type: boolean
                file:
                  description: >-
                    The audio file to transcribe. The format is derived from the
                    filename extension or the file part content type. Max 25 MB;
                    send larger files as base64 JSON via input_audio, or by URL
                    via source_url. Exactly one of file or source_url is
                    required.
                  format: binary
                  type: string
                keyterms[]:
                  description: >-
                    Domain terms, names, or phrases to bias recognition toward;
                    repeat the part once per term (keyterms=... is also
                    accepted). Only supported by some providers; 400 when the
                    selected model cannot use keyterms.
                  items:
                    maxLength: 100
                    type: string
                  maxItems: 1000
                  type: array
                language:
                  description: The language of the input audio (ISO-639-1).
                  type: string
                model:
                  description: The model to use for transcription.
                  type: string
                provider:
                  description: >-
                    JSON-encoded provider preferences object, the same shape as
                    the JSON body field: { "zdr": true, "data_collection":
                    "deny", "options": { "<provider-slug>": { ... } } }. Only
                    options for the matched provider are forwarded. Must decode
                    to a JSON object.
                  type: string
                response_format:
                  description: >-
                    The response format. "json" (default) returns { text, usage
                    }; "verbose_json" additionally returns task, language,
                    duration, and segment-level timestamps (OpenAI-compatible
                    providers only).
                  enum:
                    - json
                    - verbose_json
                  type: string
                session_id:
                  description: >-
                    A unique identifier for grouping related requests (e.g., a
                    conversation or agent workflow). Used for observability
                    grouping in Broadcast and private logging; never sent to the
                    provider. If provided in both the request body and the
                    x-session-id header, the body value takes precedence.
                  maxLength: 256
                  type: string
                source_url:
                  description: >-
                    Publicly reachable http(s) URL of the audio file, downloaded
                    by the provider directly (no size limit on our side). The
                    format is derived from the URL path extension. Only
                    supported by some providers; exactly one of file or
                    source_url is required.
                  format: uri
                  maxLength: 8000
                  type: string
                temperature:
                  description: The sampling temperature.
                  maximum: 1
                  minimum: 0
                  type: number
                timestamp_granularities[]:
                  description: >-
                    Timestamp detail levels to include when response_format is
                    "verbose_json". "word" additionally returns word-level
                    timestamps in the words array.
                  items:
                    enum:
                      - word
                      - segment
                    type: string
                  type: array
                trace:
                  description: >-
                    JSON-encoded trace metadata object (trace_id, trace_name,
                    span_name, generation_name, parent_span_id and custom keys)
                    attached to the Broadcast trace. Must decode to a JSON
                    object.
                  type: string
                user:
                  description: >-
                    A unique identifier representing your end-user. Forwarded to
                    Broadcast and private logging as the end-user id; never sent
                    to the provider.
                  maxLength: 256
                  type: string
              required:
                - model
              type: object
        required: true
      responses:
        '200':
          content:
            application/json:
              example:
                text: Hello, this is a test of OpenAI speech-to-text transcription.
                usage:
                  cost: 0.000508
                  input_tokens: 83
                  output_tokens: 30
                  seconds: 9.2
                  total_tokens: 113
              schema:
                $ref: '#/components/schemas/STTResponse'
          description: Transcription result
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
        '504':
          content:
            application/json:
              example:
                error:
                  code: 504
                  message: The operation was aborted due to timeout
              schema:
                $ref: '#/components/schemas/GatewayTimeoutResponse'
          description: >-
            Gateway Timeout - Provider did not respond before the upstream
            deadline
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
    STTRequest:
      description: >-
        Speech-to-text request input. Accepts a JSON body with input_audio
        containing base64-encoded audio or a URL the provider downloads.
      example:
        input_audio:
          data: UklGRiQA...
          format: wav
        language: en
        model: openai/whisper-large-v3
      properties:
        diarize:
          description: >-
            Label each word with the speaker who said it. Speaker labels are
            returned on the words array (speaker, speaker_label), so
            response_format must be "verbose_json" (a "json" request is rejected
            with a 400) and word timestamps are included even when
            timestamp_granularities omits "word". Only supported by some
            providers; the request is rejected with a 400 when the selected
            model cannot diarize. Providers may charge extra.
          example: true
          type: boolean
        input_audio:
          $ref: '#/components/schemas/STTInputAudio'
        keyterms:
          description: >-
            Domain terms, names, or phrases to bias recognition toward. Only
            supported by some providers; the request is rejected with a 400 when
            the selected model cannot use keyterms. Providers may cap the number
            of terms or characters per term and may charge extra.
          example:
            - OpenRouter
            - Scribe
          items:
            maxLength: 100
            minLength: 1
            type: string
          maxItems: 1000
          type: array
        language:
          description: >-
            ISO-639-1 language code (e.g., "en", "ja"). Auto-detected if
            omitted.
          example: en
          type: string
        model:
          description: STT model identifier
          example: openai/whisper-large-v3
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
              title: STTRequestDataCollection
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
          description: >-
            Output format. "json" (default) returns { text, usage }.
            "verbose_json" additionally returns task, language, duration, and
            segment-level timestamps; only supported by OpenAI-compatible
            providers.
          enum:
            - json
            - verbose_json
          example: json
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
        temperature:
          description: Sampling temperature for transcription
          example: 0
          format: double
          type: number
        timestamp_granularities:
          description: >-
            Timestamp detail levels to include when response_format is
            "verbose_json". "segment" returns segment-level timestamps; "word"
            additionally returns word-level timestamps in the words array.
            Ignored unless response_format is "verbose_json".
          example:
            - segment
          items:
            $ref: '#/components/schemas/STTTimestampGranularity'
          type: array
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
      required:
        - model
        - input_audio
      type: object
    STTResponse:
      description: STT response containing transcribed text and optional usage statistics
      example:
        text: Hello, this is a test of OpenAI speech-to-text transcription.
        usage:
          cost: 0.000508
          input_tokens: 83
          output_tokens: 30
          seconds: 9.2
          total_tokens: 113
      properties:
        confidence:
          description: >-
            Provider confidence for the whole transcript from 0 to 1, present
            when response_format is verbose_json and the provider scores the
            full transcript
          example: 0.94
          format: double
          type: number
        duration:
          description: >-
            Duration of the input audio in seconds, present when response_format
            is verbose_json
          example: 9.2
          format: double
          type: number
        entities:
          description: >-
            Detected entities with character offsets into text, present when the
            provider runs entity detection
          items:
            $ref: '#/components/schemas/STTEntity'
          type: array
        language:
          description: >-
            Detected or forced language, present when response_format is
            verbose_json
          example: english
          type: string
        language_confidence:
          description: >-
            Provider confidence in the detected language from 0 to 1, present
            when response_format is verbose_json and the provider scores
            language detection
          example: 0.98
          format: double
          type: number
        segments:
          description: >-
            Timestamped transcript segments, present when response_format is
            verbose_json
          items:
            $ref: '#/components/schemas/STTSegment'
          type: array
        task:
          description: The task performed, present when response_format is verbose_json
          example: transcribe
          type: string
        text:
          description: The transcribed text
          example: >-
            Hello, this is a test of OpenAI speech-to-text transcription. The
            weather is sunny today and the temperature is around 72 degrees.
          type: string
        usage:
          $ref: '#/components/schemas/STTUsage'
        words:
          description: >-
            Timestamped words, present when the provider returns word-level
            timestamps
          items:
            $ref: '#/components/schemas/STTWord'
          type: array
      required:
        - text
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
    GatewayTimeoutResponse:
      description: Gateway Timeout - Provider did not respond before the upstream deadline
      example:
        error:
          code: 504
          message: The operation was aborted due to timeout
      properties:
        error:
          $ref: '#/components/schemas/GatewayTimeoutResponseErrorData'
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
    STTInputAudio:
      anyOf:
        - $ref: '#/components/schemas/STTInlineInputAudio'
        - $ref: '#/components/schemas/STTUrlInputAudio'
      description: >-
        Audio to transcribe: inline base64 bytes, or a URL the provider
        downloads directly.
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
    STTTimestampGranularity:
      description: A timestamp detail level for verbose_json transcription responses.
      enum:
        - word
        - segment
      example: word
      type: string
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
    STTEntity:
      description: A detected entity, returned when the provider runs entity detection
      example:
        end_char: 25
        start_char: 15
        text: John Smith
        type: name
      properties:
        end_char:
          description: >-
            Zero-based exclusive character offset of the entity end within the
            response-level text (not seconds)
          example: 25
          type: integer
        start_char:
          description: >-
            Zero-based character offset of the entity start within the
            response-level text (not seconds)
          example: 15
          type: integer
        text:
          description: Entity text as it appears in the transcript
          type: string
        type:
          description: Provider entity type label
          example: name
          type: string
      required:
        - text
        - type
        - start_char
        - end_char
      type: object
    STTSegment:
      description: >-
        A timestamped transcript segment, returned when response_format is
        verbose_json
      example:
        avg_logprob: -0.28
        compression_ratio: 1.13
        end: 3.2
        id: 0
        no_speech_prob: 0.01
        seek: 0
        speaker: 0
        start: 0
        temperature: 0
        text: Hello there.
        tokens:
          - 50364
          - 2425
          - 456
      properties:
        avg_logprob:
          description: Average log probability of the segment
          format: double
          type: number
        channel:
          description: >-
            Zero-based audio channel index for the segment, present when the
            provider transcribes channels separately
          example: 0
          type: integer
        compression_ratio:
          description: Compression ratio of the segment
          format: double
          type: number
        end:
          description: Segment end time in seconds
          example: 3.2
          format: double
          type: number
        id:
          description: Segment index within the transcript
          example: 0
          type: integer
        no_speech_prob:
          description: Probability the segment contains no speech
          format: double
          type: number
        seek:
          description: Seek offset of the segment
          example: 0
          type: integer
        speaker:
          description: >-
            Speaker index for the segment, present when the provider returns
            diarization data
          example: 0
          type: integer
        speaker_label:
          description: >-
            Provider speaker label for the segment, present when the provider
            labels speakers with a string
          example: speaker_0
          type: string
        start:
          description: Segment start time in seconds
          example: 0
          format: double
          type: number
        temperature:
          description: Temperature used for the segment
          format: double
          type: number
        text:
          description: Transcribed text of the segment
          example: Hello there.
          type: string
        tokens:
          description: Token IDs of the segment
          items:
            type: integer
          type: array
      required:
        - id
        - start
        - end
        - text
      type: object
    STTUsage:
      description: Aggregated usage statistics for the request
      example:
        cost: 0.000508
        input_tokens: 83
        output_tokens: 30
        seconds: 9.2
        total_tokens: 113
      properties:
        cost:
          description: Total cost of the request in USD
          example: 0.000508
          format: double
          type: number
        input_tokens:
          description: Number of input tokens billed for this request
          example: 83
          type: integer
        output_tokens:
          description: Number of output tokens generated
          example: 30
          type: integer
        seconds:
          description: Duration of the input audio in seconds
          example: 9.2
          format: double
          type: number
        total_tokens:
          description: Total number of tokens used (input + output)
          example: 113
          type: integer
      type: object
    STTWord:
      description: >-
        A timestamped word, returned when the provider includes word-level
        timestamps
      example:
        confidence: 0.98
        end: 0.4
        speaker: 0
        start: 0
        word: Hello
      properties:
        channel:
          description: >-
            Zero-based audio channel index for the word, present when the
            provider transcribes channels separately
          example: 0
          type: integer
        confidence:
          description: >-
            Provider confidence for the word from 0 to 1, present when the
            provider returns per-word confidence
          example: 0.98
          format: double
          type: number
        end:
          description: Word end time in seconds
          example: 0.4
          format: double
          type: number
        speaker:
          description: >-
            Speaker index for the word, present when the provider returns
            diarization data
          example: 0
          type: integer
        speaker_label:
          description: >-
            Provider speaker label for the word, present when the provider
            labels speakers with a string
          example: speaker_0
          type: string
        start:
          description: Word start time in seconds
          example: 0
          format: double
          type: number
        type:
          description: >-
            Kind of entry; omitted or "word" for spoken words, "audio_event" for
            non-speech sounds the provider tags with timestamps
          enum:
            - word
            - audio_event
          example: word
          type: string
        word:
          description: >-
            The transcribed word, or the event tag such as "(laughter)" when
            type is audio_event
          example: Hello
          type: string
      required:
        - word
        - start
        - end
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
    GatewayTimeoutResponseErrorData:
      description: Error data for GatewayTimeoutResponse
      example:
        code: 504
        message: The operation was aborted due to timeout
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
    STTInlineInputAudio:
      additionalProperties: false
      description: Inline base64 audio input for speech-to-text
      example:
        data: UklGRiQA...
        format: wav
      properties:
        data:
          description: Base64-encoded audio data (raw bytes, not a data URI)
          type: string
        format:
          description: >-
            Audio format (e.g., wav, mp3, flac, m4a, ogg, webm, aac). Supported
            formats vary by provider. "pcm" means headerless signed 16-bit
            little-endian mono audio at 16 kHz.
          pattern: ^[a-zA-Z0-9][a-zA-Z0-9+._-]{0,15}$
          type: string
      required:
        - data
        - format
      type: object
    STTUrlInputAudio:
      additionalProperties: false
      description: Audio input fetched by the provider from a URL
      example:
        format: mp3
        url: https://example.com/meeting.mp3
      properties:
        format:
          description: >-
            Audio format of the file at the URL. Defaults to the extension of
            the URL path; required when the path has no extension.
          pattern: ^[a-zA-Z0-9][a-zA-Z0-9+._-]{0,15}$
          type: string
        url:
          description: >-
            Publicly reachable http(s) URL of the audio file. The provider
            downloads it directly, so the inline upload size limit does not
            apply. Only supported by some providers.
          format: uri
          maxLength: 8000
          type: string
      required:
        - url
      type: object
  securitySchemes:
    apiKey:
      description: API key as bearer token in Authorization header
      scheme: bearer
      type: http

````
