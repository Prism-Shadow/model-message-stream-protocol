> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Create Response

> Call MiniMax models via the OpenAI Responses API compatible main endpoint. Generates model replies, supports streaming and non-streaming.

export const ResponsesReturnValues = ({label}) => {
  const marker = useRef(null);
  useEffect(() => {
    const root = marker.current?.closest("#content-container");
    if (!root) return;
    const fixedFields = new Set(["response-object", "response-parallel-tool-calls", "response-store", "response-truncation"]);
    const hiddenRows = new Map();
    const updateLabels = () => {
      root.querySelectorAll('[id^="response-"]').forEach(heading => {
        const field = heading.closest(".primitive-param-field");
        field?.querySelectorAll(".whitespace-pre-wrap.prose-sm").forEach(row => {
          if (fixedFields.has(heading.id) && row.querySelectorAll("code").length === 1) {
            if (!hiddenRows.has(row)) hiddenRows.set(row, row.hidden);
            row.hidden = true;
          }
          row.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && (/^(可用选项|Available options)$/).test(node.textContent.trim())) {
              node.textContent = label;
            }
          });
        });
      });
    };
    updateLabels();
    const observer = new MutationObserver(updateLabels);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });
    return () => {
      observer.disconnect();
      hiddenRows.forEach((hidden, row) => {
        row.hidden = hidden;
      });
    };
  }, [label]);
  return <span ref={marker} hidden />;
};

<ResponsesReturnValues label="Possible return values" />


## OpenAPI

````yaml api-reference/text/api/openapi-responses.json POST /v1/responses
openapi: 3.1.0
info:
  title: MiniMax Responses API
  description: >-
    MiniMax OpenAI Responses API compatible endpoints, supporting chat
    generation and token estimation
  license:
    name: MIT
  version: 1.0.0
servers:
  - url: https://api.minimax.io
security:
  - bearerAuth: []
paths:
  /v1/responses:
    post:
      tags:
        - Responses
      summary: Create Response
      operationId: createResponse
      parameters:
        - name: Content-Type
          in: header
          required: true
          description: Media type of the request body. Must be set to `application/json`
          schema:
            type: string
            enum:
              - application/json
            default: application/json
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateResponseReq'
            examples:
              Deep Thinking:
                value:
                  model: MiniMax-M3.1-Flash
                  reasoning:
                    effort: max
                  input: Which is bigger, 9.11 or 9.9?
              Image Understanding:
                value:
                  model: MiniMax-M3.1-Flash
                  reasoning:
                    effort: max
                  input:
                    - role: user
                      content:
                        - type: input_text
                          text: What does this image show?
                        - type: input_image
                          image_url: >-
                            https://filecdn.minimax.chat/public/fe9d04da-f60e-444d-a2e0-18ae743add33.jpeg
              Video Understanding:
                value:
                  model: MiniMax-M3.1-Flash
                  reasoning:
                    effort: max
                  input:
                    - role: user
                      content:
                        - type: input_text
                          text: What is happening in this video?
                        - type: input_video
                          video_url: >-
                            https://filecdn.minimax.chat/public/ee8c1648-21f1-41b7-8397-65022d22ffe5.mp4
              Stream:
                value:
                  model: MiniMax-M3.1-Flash
                  reasoning:
                    effort: max
                  input:
                    - role: user
                      content:
                        - type: input_text
                          text: What does this image show?
                        - type: input_image
                          image_url: >-
                            https://filecdn.minimax.chat/public/fe9d04da-f60e-444d-a2e0-18ae743add33.jpeg
                  stream: true
              Tool Use:
                value:
                  model: MiniMax-M3.1-Flash
                  reasoning:
                    effort: max
                  input: How's the weather in San Francisco?
                  tools:
                    - type: function
                      name: get_weather
                      description: Get the current weather for a given location.
                      parameters:
                        type: object
                        properties:
                          location:
                            type: string
                            description: The city and state/country, e.g. San Francisco, US
                        required:
                          - location
        required: true
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreateResponseResp'
              examples:
                Deep Thinking:
                  value:
                    id: 07229fa44f3853da55eef9fb8bd29297
                    object: response
                    created_at: 1792240804
                    model: MiniMax-M3.1-Flash
                    status: completed
                    output:
                      - id: 07229fa44f3853da55eef9fb8bd29297_rs
                        type: reasoning
                        status: completed
                        summary: []
                        content:
                          - type: reasoning_text
                            text: >-
                              We need answer simple. Need explain decimals. 9.9
                              = 9.90, compare 9.11, 9.90 bigger. Need concise.
                      - id: 07229fa44f3853da55eef9fb8bd29297_msg
                        type: message
                        status: completed
                        role: assistant
                        content:
                          - type: output_text
                            text: >-
                              9.9 is bigger than 9.11, because 9.9 = 9.90 and
                              9.90 > 9.11.
                            annotations: []
                    output_text: >-
                      9.9 is bigger than 9.11, because 9.9 = 9.90 and 9.90 >
                      9.11.
                    usage:
                      input_tokens: 218
                      output_tokens: 68
                      total_tokens: 286
                      input_tokens_details:
                        cached_tokens: 189
                      output_tokens_details:
                        reasoning_tokens: 36
                    error: null
                    incomplete_details: null
                    instructions: null
                    metadata: {}
                    tools: null
                    tool_choice: auto
                    temperature: 1
                    top_p: 0.95
                    text:
                      format:
                        type: text
                    reasoning:
                      effort: max
                      summary: null
                    max_output_tokens: null
                    parallel_tool_calls: true
                    previous_response_id: null
                    conversation: null
                    store: false
                    service_tier: null
                    safety_identifier: null
                    truncation: disabled
                Image Understanding:
                  value:
                    id: 07229fa48d63ee86b664bb1c3a2257b7
                    object: response
                    created_at: 1792240804
                    model: MiniMax-M3.1-Flash
                    status: completed
                    output:
                      - id: 07229fa48d63ee86b664bb1c3a2257b7_rs
                        type: reasoning
                        status: completed
                        summary: []
                        content:
                          - type: reasoning_text
                            text: >-
                              We need answer describe image. Need be careful
                              minor? Fine. Need say close-up portrait young girl
                              smiling, brown curly hair bangs, green/hazel eyes,
                              cream lace-trimmed dress, warm soft lighting
                              neutral blurred background. Maybe image appears
                              AI-generated? User only asks what shows. We can
                              just describe. Need not identify. concise.
                      - id: 07229fa48d63ee86b664bb1c3a2257b7_msg
                        type: message
                        status: completed
                        role: assistant
                        content:
                          - type: output_text
                            text: >-
                              A close-up portrait of a young girl with curly
                              brown hair, bangs, and green eyes. She is smiling
                              gently and wearing a cream-colored, lace-trimmed
                              dress, illuminated by warm, soft lighting against
                              a blurred neutral background.
                            annotations: []
                    output_text: >-
                      A close-up portrait of a young girl with curly brown hair,
                      bangs, and green eyes. She is smiling gently and wearing a
                      cream-colored, lace-trimmed dress, illuminated by warm,
                      soft lighting against a blurred neutral background.
                    usage:
                      input_tokens: 1408
                      output_tokens: 118
                      total_tokens: 1526
                      input_tokens_details:
                        cached_tokens: 197
                      output_tokens_details:
                        reasoning_tokens: 71
                    error: null
                    incomplete_details: null
                    instructions: null
                    metadata: {}
                    tools: null
                    tool_choice: auto
                    temperature: 1
                    top_p: 0.95
                    text:
                      format:
                        type: text
                    reasoning:
                      effort: max
                      summary: null
                    max_output_tokens: null
                    parallel_tool_calls: true
                    previous_response_id: null
                    conversation: null
                    store: false
                    service_tier: null
                    safety_identifier: null
                    truncation: disabled
                Video Understanding:
                  value:
                    id: 07229fa43cd3f5d6e41670135a648cab
                    object: response
                    created_at: 1792240804
                    model: MiniMax-M3.1-Flash
                    status: completed
                    output:
                      - id: 07229fa43cd3f5d6e41670135a648cab_rs
                        type: reasoning
                        status: completed
                        summary: []
                        content:
                          - type: reasoning_text
                            text: >-
                              We need answer describe video. Need inspect
                              frames. Need articulate sequence: AI-generated? A
                              wild cat, perhaps jungle cat? Walking along diving
                              board/platform in Olympic swimming venue, Olympic
                              rings, then leaps/falls into pool, splash. Need be
                              accurate. User asks what happening. Need mention
                              likely edited/generated visual maybe not
                              necessary. Let's analyze all frames.


                              At 0 cat walking on narrow high diving platform,
                              audience, Olympic branding, "Louvre 2024", perhaps
                              cat has green eye? It proceeds right. At 2 sec
                              running/jumping off end; 3 airborne; 3.5 descends;
                              4 hits pool, splash; 4.5 aftermath. Need concise
                              but desired oververbosity 5, likely one paragraph.
                              Could mention large cat, likely jungle
                              cat/possibly ocelot? Let's identify animal: tan
                              spotted/striped feline, long tail, perhaps jungle
                              cat? It appears maybe a "sand cat" or "serval"?
                              Body: medium-large wild cat, ears upright, coat
                              spotted/striped, long tail with black rings. Could
                              call spotted wild cat. It is in Olympic swimming
                              arena and Olympic rings, diving board. Maybe a
                              generated video concept "cat at Olympics". Need
                              avoid claiming actual. Say "A spotted wild cat
                              walks along a high diving platform..." Then
                              launches, lands in pool.


                              Need perhaps note it starts on platform and leaps,
                              splash. Let's formulate. No need discuss
                              watermarks unless useful. Ensure answer directly.
                      - id: 07229fa43cd3f5d6e41670135a648cab_msg
                        type: message
                        status: completed
                        role: assistant
                        content:
                          - type: output_text
                            text: >-
                              A spotted wild cat walks along a narrow diving
                              platform in an Olympic-style swimming arena, with
                              spectators and Olympic rings in the background. It
                              then runs off the end, jumps through the air, and
                              lands in the pool, creating a large splash.
                            annotations: []
                    output_text: >-
                      A spotted wild cat walks along a narrow diving platform in
                      an Olympic-style swimming arena, with spectators and
                      Olympic rings in the background. It then runs off the end,
                      jumps through the air, and lands in the pool, creating a
                      large splash.
                    usage:
                      input_tokens: 2287
                      output_tokens: 348
                      total_tokens: 2635
                      input_tokens_details:
                        cached_tokens: 197
                      output_tokens_details:
                        reasoning_tokens: 299
                    error: null
                    incomplete_details: null
                    instructions: null
                    metadata: {}
                    tools: null
                    tool_choice: auto
                    temperature: 1
                    top_p: 0.95
                    text:
                      format:
                        type: text
                    reasoning:
                      effort: max
                      summary: null
                    max_output_tokens: null
                    parallel_tool_calls: true
                    previous_response_id: null
                    conversation: null
                    store: false
                    service_tier: null
                    safety_identifier: null
                    truncation: disabled
                Stream:
                  value:
                    - type: response.created
                      sequence_number: 0
                      response:
                        id: 07229fa484712ce19b28c3e706b4f60c
                        object: response
                        created_at: 1792240804
                        model: MiniMax-M3.1-Flash
                        status: in_progress
                        output: []
                        output_text: null
                        usage: null
                        error: null
                        incomplete_details: null
                        instructions: null
                        metadata: {}
                        tools: null
                        tool_choice: auto
                        temperature: 1
                        top_p: 0.95
                        text:
                          format:
                            type: text
                        reasoning:
                          effort: max
                          summary: null
                        max_output_tokens: null
                        parallel_tool_calls: true
                        previous_response_id: null
                        conversation: null
                        store: false
                        service_tier: null
                        safety_identifier: null
                        truncation: disabled
                    - type: response.in_progress
                      sequence_number: 1
                      response:
                        id: 07229fa484712ce19b28c3e706b4f60c
                        object: response
                        created_at: 1792240804
                        model: MiniMax-M3.1-Flash
                        status: in_progress
                        output: []
                        output_text: null
                        usage: null
                        error: null
                        incomplete_details: null
                        instructions: null
                        metadata: {}
                        tools: null
                        tool_choice: auto
                        temperature: 1
                        top_p: 0.95
                        text:
                          format:
                            type: text
                        reasoning:
                          effort: max
                          summary: null
                        max_output_tokens: null
                        parallel_tool_calls: true
                        previous_response_id: null
                        conversation: null
                        store: false
                        service_tier: null
                        safety_identifier: null
                        truncation: disabled
                    - type: response.output_item.added
                      sequence_number: 2
                      item:
                        content: []
                        id: 07229fa484712ce19b28c3e706b4f60c_rs
                        type: reasoning
                        status: in_progress
                        summary: []
                      output_index: 0
                    - type: response.content_part.added
                      sequence_number: 3
                      part:
                        type: reasoning_text
                        text: ''
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                    - type: response.reasoning_text.delta
                      sequence_number: 4
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                      delta: We need answer
                    - type: response.reasoning_text.delta
                      sequence_number: 5
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                      delta: ' image description. Need be careful: appears young girl, close-up portrait, brown curly hair bangs, white lace'
                    - type: response.reasoning_text.delta
                      sequence_number: 6
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                      delta: >-
                        -trimmed dress/top, looking at camera, slight smile,
                        warm soft light, neutral blurred background. Could
                        mention not identify
                    - type: response.reasoning_text.delta
                      sequence_number: 7
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                      delta: . User asks what image shows. Concise.
                    - type: response.reasoning_text.done
                      sequence_number: 8
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                      text: >-
                        We need answer image description. Need be careful:
                        appears young girl, close-up portrait, brown curly hair
                        bangs, white lace-trimmed dress/top, looking at camera,
                        slight smile, warm soft light, neutral blurred
                        background. Could mention not identify. User asks what
                        image shows. Concise.
                    - type: response.content_part.done
                      sequence_number: 9
                      part:
                        type: reasoning_text
                        text: >-
                          We need answer image description. Need be careful:
                          appears young girl, close-up portrait, brown curly
                          hair bangs, white lace-trimmed dress/top, looking at
                          camera, slight smile, warm soft light, neutral blurred
                          background. Could mention not identify. User asks what
                          image shows. Concise.
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                    - type: response.output_item.done
                      sequence_number: 10
                      item:
                        id: 07229fa484712ce19b28c3e706b4f60c_rs
                        type: reasoning
                        status: completed
                        summary: []
                        content:
                          - text: >-
                              We need answer image description. Need be careful:
                              appears young girl, close-up portrait, brown curly
                              hair bangs, white lace-trimmed dress/top, looking
                              at camera, slight smile, warm soft light, neutral
                              blurred background. Could mention not identify.
                              User asks what image shows. Concise.
                            type: reasoning_text
                      output_index: 0
                    - type: response.output_item.added
                      sequence_number: 11
                      item:
                        id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                        type: message
                        status: in_progress
                        role: assistant
                        content: []
                      output_index: 1
                    - type: response.content_part.added
                      sequence_number: 12
                      part:
                        type: output_text
                        text: ''
                        annotations: []
                      output_index: 1
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                    - type: response.output_text.delta
                      sequence_number: 13
                      output_index: 1
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                      delta: >-
                        A warmly lit close-up portrait of a young girl with
                        curly brown hair and bangs. She is
                    - type: response.output_text.delta
                      sequence_number: 14
                      output_index: 1
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                      delta: ' wearing a cream-colored, lace-trimmed top, looking directly at the camera with a gentle smile against a softly blurred neutral background.'
                    - type: response.output_text.done
                      sequence_number: 15
                      output_index: 1
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                      text: >-
                        A warmly lit close-up portrait of a young girl with
                        curly brown hair and bangs. She is wearing a
                        cream-colored, lace-trimmed top, looking directly at the
                        camera with a gentle smile against a softly blurred
                        neutral background.
                    - type: response.content_part.done
                      sequence_number: 16
                      part:
                        annotations: []
                        type: output_text
                        text: >-
                          A warmly lit close-up portrait of a young girl with
                          curly brown hair and bangs. She is wearing a
                          cream-colored, lace-trimmed top, looking directly at
                          the camera with a gentle smile against a softly
                          blurred neutral background.
                      output_index: 1
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                    - type: response.output_item.done
                      sequence_number: 17
                      item:
                        id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                        type: message
                        status: completed
                        role: assistant
                        content:
                          - type: output_text
                            text: >-
                              A warmly lit close-up portrait of a young girl
                              with curly brown hair and bangs. She is wearing a
                              cream-colored, lace-trimmed top, looking directly
                              at the camera with a gentle smile against a softly
                              blurred neutral background.
                            annotations: []
                      output_index: 1
                    - type: response.completed
                      sequence_number: 18
                      response:
                        id: 07229fa484712ce19b28c3e706b4f60c
                        object: response
                        created_at: 1792240804
                        model: MiniMax-M3.1-Flash
                        status: completed
                        output:
                          - id: 07229fa484712ce19b28c3e706b4f60c_rs
                            type: reasoning
                            status: completed
                            summary: []
                            content:
                              - type: reasoning_text
                                text: >-
                                  We need answer image description. Need be
                                  careful: appears young girl, close-up
                                  portrait, brown curly hair bangs, white
                                  lace-trimmed dress/top, looking at camera,
                                  slight smile, warm soft light, neutral blurred
                                  background. Could mention not identify. User
                                  asks what image shows. Concise.
                          - id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                            type: message
                            status: completed
                            role: assistant
                            content:
                              - type: output_text
                                text: >-
                                  A warmly lit close-up portrait of a young girl
                                  with curly brown hair and bangs. She is
                                  wearing a cream-colored, lace-trimmed top,
                                  looking directly at the camera with a gentle
                                  smile against a softly blurred neutral
                                  background.
                                annotations: []
                        output_text: >-
                          A warmly lit close-up portrait of a young girl with
                          curly brown hair and bangs. She is wearing a
                          cream-colored, lace-trimmed top, looking directly at
                          the camera with a gentle smile against a softly
                          blurred neutral background.
                        usage:
                          input_tokens: 1408
                          output_tokens: 108
                          total_tokens: 1516
                          input_tokens_details:
                            cached_tokens: 197
                          output_tokens_details:
                            reasoning_tokens: 62
                        error: null
                        incomplete_details: null
                        instructions: null
                        metadata: {}
                        tools: null
                        tool_choice: auto
                        temperature: 1
                        top_p: 0.95
                        text:
                          format:
                            type: text
                        reasoning:
                          effort: max
                          summary: null
                        max_output_tokens: null
                        parallel_tool_calls: true
                        previous_response_id: null
                        conversation: null
                        store: false
                        service_tier: null
                        safety_identifier: null
                        truncation: disabled
                Tool Use:
                  value:
                    id: 07229fa4f6440a49153da1b91f2204b1
                    object: response
                    created_at: 1792240804
                    model: MiniMax-M3.1-Flash
                    status: completed
                    output:
                      - id: 07229fa4f6440a49153da1b91f2204b1_msg
                        type: message
                        status: completed
                        role: assistant
                        content:
                          - type: output_text
                            text: >-
                              I'll check the current weather in San Francisco
                              for you.
                            annotations: []
                      - id: 07229fa4f6440a49153da1b91f2204b1_fc_0
                        type: function_call
                        status: completed
                        call_id: call_function_2uih32x750pd_1
                        name: get_weather
                        arguments: '{"location": "San Francisco, US"}'
                    output_text: I'll check the current weather in San Francisco for you.
                    usage:
                      input_tokens: 465
                      output_tokens: 42
                      total_tokens: 507
                      input_tokens_details:
                        cached_tokens: 175
                    error: null
                    incomplete_details: null
                    instructions: null
                    metadata: {}
                    tools:
                      - type: function
                        name: get_weather
                        description: Get the current weather for a given location.
                        parameters:
                          type: object
                          properties:
                            location:
                              type: string
                              description: >-
                                The city and state/country, e.g. San Francisco,
                                US
                          required:
                            - location
                    tool_choice: auto
                    temperature: 1
                    top_p: 0.95
                    text:
                      format:
                        type: text
                    reasoning:
                      effort: max
                      summary: null
                    max_output_tokens: null
                    parallel_tool_calls: true
                    previous_response_id: null
                    conversation: null
                    store: false
                    service_tier: null
                    safety_identifier: null
                    truncation: disabled
            text/event-stream:
              schema:
                type: object
                description: >-
                  Streaming response (SSE). Each event's `data` is a JSON object
                  whose `type` field identifies the event type.
              examples:
                Stream:
                  value:
                    - type: response.created
                      sequence_number: 0
                      response:
                        id: 07229fa484712ce19b28c3e706b4f60c
                        object: response
                        created_at: 1792240804
                        model: MiniMax-M3.1-Flash
                        status: in_progress
                        output: []
                        output_text: null
                        usage: null
                        error: null
                        incomplete_details: null
                        instructions: null
                        metadata: {}
                        tools: null
                        tool_choice: auto
                        temperature: 1
                        top_p: 0.95
                        text:
                          format:
                            type: text
                        reasoning:
                          effort: max
                          summary: null
                        max_output_tokens: null
                        parallel_tool_calls: true
                        previous_response_id: null
                        conversation: null
                        store: false
                        service_tier: null
                        safety_identifier: null
                        truncation: disabled
                    - type: response.in_progress
                      sequence_number: 1
                      response:
                        id: 07229fa484712ce19b28c3e706b4f60c
                        object: response
                        created_at: 1792240804
                        model: MiniMax-M3.1-Flash
                        status: in_progress
                        output: []
                        output_text: null
                        usage: null
                        error: null
                        incomplete_details: null
                        instructions: null
                        metadata: {}
                        tools: null
                        tool_choice: auto
                        temperature: 1
                        top_p: 0.95
                        text:
                          format:
                            type: text
                        reasoning:
                          effort: max
                          summary: null
                        max_output_tokens: null
                        parallel_tool_calls: true
                        previous_response_id: null
                        conversation: null
                        store: false
                        service_tier: null
                        safety_identifier: null
                        truncation: disabled
                    - type: response.output_item.added
                      sequence_number: 2
                      item:
                        content: []
                        id: 07229fa484712ce19b28c3e706b4f60c_rs
                        type: reasoning
                        status: in_progress
                        summary: []
                      output_index: 0
                    - type: response.content_part.added
                      sequence_number: 3
                      part:
                        type: reasoning_text
                        text: ''
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                    - type: response.reasoning_text.delta
                      sequence_number: 4
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                      delta: We need answer
                    - type: response.reasoning_text.delta
                      sequence_number: 5
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                      delta: ' image description. Need be careful: appears young girl, close-up portrait, brown curly hair bangs, white lace'
                    - type: response.reasoning_text.delta
                      sequence_number: 6
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                      delta: >-
                        -trimmed dress/top, looking at camera, slight smile,
                        warm soft light, neutral blurred background. Could
                        mention not identify
                    - type: response.reasoning_text.delta
                      sequence_number: 7
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                      delta: . User asks what image shows. Concise.
                    - type: response.reasoning_text.done
                      sequence_number: 8
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                      text: >-
                        We need answer image description. Need be careful:
                        appears young girl, close-up portrait, brown curly hair
                        bangs, white lace-trimmed dress/top, looking at camera,
                        slight smile, warm soft light, neutral blurred
                        background. Could mention not identify. User asks what
                        image shows. Concise.
                    - type: response.content_part.done
                      sequence_number: 9
                      part:
                        type: reasoning_text
                        text: >-
                          We need answer image description. Need be careful:
                          appears young girl, close-up portrait, brown curly
                          hair bangs, white lace-trimmed dress/top, looking at
                          camera, slight smile, warm soft light, neutral blurred
                          background. Could mention not identify. User asks what
                          image shows. Concise.
                      output_index: 0
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_rs
                    - type: response.output_item.done
                      sequence_number: 10
                      item:
                        id: 07229fa484712ce19b28c3e706b4f60c_rs
                        type: reasoning
                        status: completed
                        summary: []
                        content:
                          - text: >-
                              We need answer image description. Need be careful:
                              appears young girl, close-up portrait, brown curly
                              hair bangs, white lace-trimmed dress/top, looking
                              at camera, slight smile, warm soft light, neutral
                              blurred background. Could mention not identify.
                              User asks what image shows. Concise.
                            type: reasoning_text
                      output_index: 0
                    - type: response.output_item.added
                      sequence_number: 11
                      item:
                        id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                        type: message
                        status: in_progress
                        role: assistant
                        content: []
                      output_index: 1
                    - type: response.content_part.added
                      sequence_number: 12
                      part:
                        type: output_text
                        text: ''
                        annotations: []
                      output_index: 1
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                    - type: response.output_text.delta
                      sequence_number: 13
                      output_index: 1
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                      delta: >-
                        A warmly lit close-up portrait of a young girl with
                        curly brown hair and bangs. She is
                    - type: response.output_text.delta
                      sequence_number: 14
                      output_index: 1
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                      delta: ' wearing a cream-colored, lace-trimmed top, looking directly at the camera with a gentle smile against a softly blurred neutral background.'
                    - type: response.output_text.done
                      sequence_number: 15
                      output_index: 1
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                      text: >-
                        A warmly lit close-up portrait of a young girl with
                        curly brown hair and bangs. She is wearing a
                        cream-colored, lace-trimmed top, looking directly at the
                        camera with a gentle smile against a softly blurred
                        neutral background.
                    - type: response.content_part.done
                      sequence_number: 16
                      part:
                        annotations: []
                        type: output_text
                        text: >-
                          A warmly lit close-up portrait of a young girl with
                          curly brown hair and bangs. She is wearing a
                          cream-colored, lace-trimmed top, looking directly at
                          the camera with a gentle smile against a softly
                          blurred neutral background.
                      output_index: 1
                      content_index: 0
                      item_id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                    - type: response.output_item.done
                      sequence_number: 17
                      item:
                        id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                        type: message
                        status: completed
                        role: assistant
                        content:
                          - type: output_text
                            text: >-
                              A warmly lit close-up portrait of a young girl
                              with curly brown hair and bangs. She is wearing a
                              cream-colored, lace-trimmed top, looking directly
                              at the camera with a gentle smile against a softly
                              blurred neutral background.
                            annotations: []
                      output_index: 1
                    - type: response.completed
                      sequence_number: 18
                      response:
                        id: 07229fa484712ce19b28c3e706b4f60c
                        object: response
                        created_at: 1792240804
                        model: MiniMax-M3.1-Flash
                        status: completed
                        output:
                          - id: 07229fa484712ce19b28c3e706b4f60c_rs
                            type: reasoning
                            status: completed
                            summary: []
                            content:
                              - type: reasoning_text
                                text: >-
                                  We need answer image description. Need be
                                  careful: appears young girl, close-up
                                  portrait, brown curly hair bangs, white
                                  lace-trimmed dress/top, looking at camera,
                                  slight smile, warm soft light, neutral blurred
                                  background. Could mention not identify. User
                                  asks what image shows. Concise.
                          - id: 07229fa484712ce19b28c3e706b4f60c_msg_1
                            type: message
                            status: completed
                            role: assistant
                            content:
                              - type: output_text
                                text: >-
                                  A warmly lit close-up portrait of a young girl
                                  with curly brown hair and bangs. She is
                                  wearing a cream-colored, lace-trimmed top,
                                  looking directly at the camera with a gentle
                                  smile against a softly blurred neutral
                                  background.
                                annotations: []
                        output_text: >-
                          A warmly lit close-up portrait of a young girl with
                          curly brown hair and bangs. She is wearing a
                          cream-colored, lace-trimmed top, looking directly at
                          the camera with a gentle smile against a softly
                          blurred neutral background.
                        usage:
                          input_tokens: 1408
                          output_tokens: 108
                          total_tokens: 1516
                          input_tokens_details:
                            cached_tokens: 197
                          output_tokens_details:
                            reasoning_tokens: 62
                        error: null
                        incomplete_details: null
                        instructions: null
                        metadata: {}
                        tools: null
                        tool_choice: auto
                        temperature: 1
                        top_p: 0.95
                        text:
                          format:
                            type: text
                        reasoning:
                          effort: max
                          summary: null
                        max_output_tokens: null
                        parallel_tool_calls: true
                        previous_response_id: null
                        conversation: null
                        store: false
                        service_tier: null
                        safety_identifier: null
                        truncation: disabled
components:
  schemas:
    CreateResponseReq:
      type: object
      required:
        - model
        - input
      properties:
        model:
          type: string
          description: Model name to invoke, e.g. `MiniMax-M3.1-Flash`
          example: MiniMax-M3.1-Flash
        service_tier:
          type: string
          description: >-
            Service tier for request admission. Supported values are `standard`
            and `priority`. If omitted, the request uses the `standard` tier.
            The `priority`
            [price](https://platform.minimax.io/docs/pricing/overview#models/text)
            is 1.5 times the `standard` price and ensures priority admission so
            the request is processed ahead of other requests, leading to faster
            responses and fewer failures. `MiniMax-M3.1-Flash` does not support
            this field.
          enum:
            - standard
            - priority
          default: standard
        input:
          description: >-
            Conversation content. Supports either a simple text or a full
            conversation history array
          oneOf:
            - type: string
              description: Simple text input
            - type: array
              description: Full conversation history
              items:
                $ref: '#/components/schemas/InputItem'
        instructions:
          type: string
          description: System instructions
        max_output_tokens:
          type: integer
          description: >-
            Maximum output token count. Reasoning tokens count toward it too, so
            a value that is too small yields `status: "incomplete"` with no
            `message` item in `output`.
        temperature:
          type: number
          format: float
          description: Sampling temperature, range (0, 1]
          default: 1
          minimum: 0
          maximum: 1
        top_p:
          type: number
          format: float
          description: Nucleus sampling, range (0, 1]
          default: 0.95
          minimum: 0
          maximum: 1
        stream:
          type: boolean
          description: Set to `true` to enable SSE streaming response
          default: false
        tools:
          type: array
          description: Tool list
          items:
            $ref: '#/components/schemas/Tool'
        tool_choice:
          type: string
          enum:
            - auto
          description: >-
            Tool selection strategy: `auto` lets the model decide whether to
            call tools
        metadata:
          type: object
          description: Request metadata. Both keys and values are strings
          additionalProperties:
            type: string
        prompt_cache_key:
          type: string
          description: Prompt cache routing identifier
        text:
          type: object
          description: Output format control
          properties:
            format:
              type: object
              properties:
                type:
                  type: string
                  enum:
                    - text
                  default: text
                  description: Output format type
        reasoning:
          type: object
          description: >-
            Reasoning control. The default depends on the model, so no
            schema-level default is declared.

            - `MiniMax-M3.1-Flash`: reasoning is always on, including when
            `reasoning` is omitted. `effort` accepts `low`, `medium`, `high`,
            `xhigh` or `max`, and does tune reasoning depth. When omitted, it
            defaults to `max`. `effort: "none"` returns HTTP 400.

            - `MiniMax-M3`: reasoning is off unless `effort` is set to a
            non-`none` value, which turns reasoning on but does not tune its
            depth.

            - M2.x models: reasoning cannot be disabled; `effort: "none"` is
            accepted but ignored.
          properties:
            effort:
              type: string
              enum:
                - minimal
                - low
                - medium
                - high
                - xhigh
                - max
                - none
          required: []
    CreateResponseResp:
      type: object
      properties:
        id:
          type: string
          description: Response ID
          example: abc123
        object:
          type: string
          enum:
            - response
          description: Object type, always `response`
        created_at:
          type: integer
          description: Response creation time (Unix seconds)
        model:
          type: string
          description: Actual model that processed the request
          example: MiniMax-M3.1-Flash
        status:
          type: string
          enum:
            - completed
            - incomplete
            - failed
          description: Response status
        output:
          type: array
          description: Model output list
          items:
            $ref: '#/components/schemas/OutputItem'
        output_text:
          type: string
          nullable: true
          description: 'Convenience field: concatenates all text outputs'
        usage:
          $ref: '#/components/schemas/Usage'
        error:
          type: object
          nullable: true
          description: Error info, only returned when `status=failed`
          properties:
            code:
              type: string
              description: Error code
            message:
              type: string
              description: Human-readable error description
        incomplete_details:
          type: object
          nullable: true
          description: Reason for incompletion, only returned when `status=incomplete`
          properties:
            reason:
              type: string
              enum:
                - max_output_tokens
                - content_filter
        parallel_tool_calls:
          type: boolean
          description: >-
            This parameter is not supported in requests. If passed, it will be
            ignored, and the response always returns **`true`**.
        store:
          type: boolean
          description: >-
            This parameter is not supported in requests. If passed, it will be
            ignored, and the response always returns **`false`**.
        truncation:
          type: string
          enum:
            - disabled
          description: >-
            This parameter is not supported in requests. If passed, it will be
            ignored, and the response always returns **`disabled`**.
        previous_response_id:
          type: string
          nullable: true
          description: >-
            This parameter is not supported in requests. If passed, it will be
            ignored, and the response always returns **`null`**.
        conversation:
          type: object
          nullable: true
          description: >-
            This parameter is not supported in requests. If passed, it will be
            ignored, and the response always returns **`null`**.
        service_tier:
          type: string
          nullable: true
          description: >-
            The service tier actually applied to this request: `standard` or
            `priority`. `MiniMax-M3.1-Flash` does not support this field, so the
            response returns **`null`**.
        safety_identifier:
          type: string
          nullable: true
          description: >-
            This parameter is not supported in requests. If passed, it will be
            ignored, and the response always returns **`null`**.
    InputItem:
      type: object
      description: >-
        Conversation history item. The `type` field determines the shape:
        `message` (default) / `function_call` / `function_call_output` /
        `reasoning`
      properties:
        type:
          type: string
          enum:
            - message
            - function_call
            - function_call_output
            - reasoning
          default: message
          description: Item type
        role:
          type: string
          enum:
            - user
            - assistant
            - system
            - developer
            - tool
          description: Message role (only when `type` is `message`)
        content:
          description: >-
            Message content; string or multimodal parts array (only when `type`
            is `message`)
          oneOf:
            - type: string
            - type: array
              items:
                $ref: '#/components/schemas/ContentPart'
        call_id:
          type: string
          description: >-
            Tool call ID (only when `type` is `function_call` or
            `function_call_output`)
        name:
          type: string
          description: Function name (only when `type` is `function_call`)
        arguments:
          type: string
          description: >-
            Function arguments as a JSON string (only when `type` is
            `function_call`)
        output:
          description: Tool return result (only when `type` is `function_call_output`)
          oneOf:
            - type: string
            - type: array
              items:
                $ref: '#/components/schemas/ContentPart'
        summary:
          type: array
          description: Reasoning segment array (only when `type` is `reasoning`)
          items:
            type: object
            properties:
              type:
                type: string
                enum:
                  - summary_text
              text:
                type: string
                description: Reasoning text
    Tool:
      type: object
      required:
        - type
        - name
      properties:
        type:
          type: string
          enum:
            - function
          description: Tool type
        name:
          type: string
          description: Function name
        description:
          type: string
          description: Function description, helps the model decide when to call it
        parameters:
          type: object
          description: Function parameter definition in JSON Schema format
    OutputItem:
      oneOf:
        - title: Message
          type: object
          properties:
            id:
              type: string
              description: '`<id>_msg` format'
            type:
              type: string
              enum:
                - message
            status:
              type: string
              enum:
                - completed
            role:
              type: string
              enum:
                - assistant
            content:
              type: array
              items:
                type: object
                properties:
                  type:
                    type: string
                    enum:
                      - output_text
                  text:
                    type: string
                    description: Text generated by the model
                  annotations:
                    type: array
                    description: Reference annotations
        - title: Reasoning
          type: object
          description: Reasoning output (only returned when reasoning is enabled)
          properties:
            id:
              type: string
              description: '`<id>_rs` format'
            type:
              type: string
              enum:
                - reasoning
            status:
              type: string
              enum:
                - completed
            summary:
              type: array
              description: Reasoning summary
            content:
              type: array
              items:
                type: object
                properties:
                  type:
                    type: string
                    enum:
                      - reasoning_text
                  text:
                    type: string
                    description: Reasoning text
        - title: Function Call
          type: object
          description: Function call
          properties:
            id:
              type: string
              description: '`<id>_fc_<index>` format'
            type:
              type: string
              enum:
                - function_call
            status:
              type: string
              enum:
                - completed
            call_id:
              type: string
              description: Tool call ID, used to correlate with `function_call_output`
            name:
              type: string
              description: Function name
            arguments:
              type: string
              description: Function arguments as a JSON string
    Usage:
      type: object
      properties:
        input_tokens:
          type: integer
          description: Input token count
        input_tokens_details:
          type: object
          properties:
            cached_tokens:
              type: integer
              description: Prompt cache hit tokens
        output_tokens:
          type: integer
          description: Output token count
        output_tokens_details:
          type: object
          properties:
            reasoning_tokens:
              type: integer
              description: >-
                Tokens consumed by reasoning (only counted when reasoning is
                enabled)
        total_tokens:
          type: integer
          description: Total token count
    ContentPart:
      type: object
      required:
        - type
      description: Message content part
      properties:
        type:
          type: string
          enum:
            - input_text
            - output_text
            - input_image
            - input_video
          description: |-
            Content part type:
            - `input_text` / `output_text`: Text part
            - `input_image`: Image input
            - `input_video`: Video input
        text:
          type: string
          description: Text content (when `type` is `input_text` / `output_text`)
        image_url:
          description: >-
            Image input (when `type` is `input_image`). Supported formats: JPEG,
            PNG, GIF, WEBP
          oneOf:
            - type: string
            - type: object
              required:
                - url
              properties:
                url:
                  type: string
                  description: Image URL or Base64 encoding
                detail:
                  type: string
                  enum:
                    - low
                    - default
                    - high
                  default: default
                  description: Image understanding precision tier
        video_url:
          description: >-
            Video input (when `type` is `input_video`). Supported formats: MP4,
            AVI, MOV, MKV
          oneOf:
            - type: string
            - type: object
              required:
                - url
              properties:
                url:
                  type: string
                  description: >-
                    Video URL or Base64 encoding. Use the File API to upload
                    large files
                fps:
                  type: number
                  format: float
                  default: 1
                  minimum: 0.2
                  maximum: 5
                  description: Frame extraction rate
                detail:
                  type: string
                  enum:
                    - low
                    - default
                    - high
                  default: default
                  description: Video understanding precision tier
                max_long_side_pixel:
                  type: integer
                  description: Pixel constraint on the longest side of video frames
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |-
        `HTTP: Bearer Auth`
         - Security Scheme Type: http
         - HTTP Authorization Scheme: Bearer API_key, used to authenticate your account. View it in [Account Management > API Keys](https://platform.minimax.io/user-center/basic-information/interface-key)

````