> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Error Codes

> This document lists common MiniMax API error codes and solutions to help developers quickly resolve issues.

| Error Code | Message | Solution |
| :- | :- | :- |
| 1000 | unknown error | Please retry your requests later. |
| 1001 | request timeout | Please retry your requests later. |
| 1002 | rate limit | Please retry your requests later. |
| 1004 | not authorized / token not match group / cookie is missing, log in again | please check your API Key and make sure it is correct and active. |
| 1008 | insufficient balance | Please check your account balance. |
| 1024 | internal error | Please retry your requests later. |
| 1026 | input new\_sensitive | Please change your input content. |
| 1027 | output new\_sensitive | Please change your input content. |
| 1033 | system error / mysql failed | Please retry your requests later. |
| 1039 | token limit | Please retry your requests later. |
| 1041 | conn limit | Please contact us if the issue persists. |
| 1042 | invisible character ratio limit | Please check your input content for invisible or illegal characters. |
| 1043 | The asr similarity check failed | Please check file\_id and text\_validation. |
| 1044 | clone prompt similarity check failed | Please check clone prompt audio and prompt words. |
| 2013 | invalid params / glyph definition format error | Please check the request parameters. |
| 20132 | invalid samples or voice\_id | Please check your file\_id（in Voice Cloning API）, voice\_id（in T2A v2 API, T2A Large v2 API） and contact us if the issue persists. |
| 2037 | voice duration too short / voice duration too long | Please adjust the duration of your file\_id for voice clone. |
| 2039 | voice clone voice id duplicate | Please check the voice\_id to ensure no duplication with the existing ones. |
| 2042 | You don't have access to this voice\_id | Please check whether you are the creator of this voice\_id and contact us if the issue persists. |
| 2045 | rate growth limit | Please avoid sudden increases and decreases in requests. |
| 2048 | prompt audio too long | Please adjust the duration of the prompt\_audio file (\< 8s). |
| 2049 | invalid API Key | Please check your API Key and make sure it is correct and active. |
| 2056 | usage limit exceeded | Please wait for the resource release in the next 5-hour window. |
