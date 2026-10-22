# Copyright 2025 Prism Shadow. and/or its affiliates
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from typing import Any

from anthropic import AsyncAnthropic


class ExplicitAsyncAnthropic(AsyncAnthropic):
    """The Anthropic SDK's async client, sending exactly the credentials it is handed.

    The SDK fills a credential it is not handed from its own environment (`ANTHROPIC_API_KEY`,
    `ANTHROPIC_AUTH_TOKEN`) and, in its later versions, from a profile on disk or workload
    identity federation; 2.0 moved the API key from `X-Api-Key` to `Authorization: Bearer` and
    stopped taking a key and a token together. This subclass pins what goes on the wire on every
    SDK version: the key as `X-Api-Key`, the token as `Authorization: Bearer`, None as nothing.
    The SDK reserves its own discovery for its base classes, so a subclass never reads a profile
    or a federation variable.
    """

    def __init__(
        self,
        *,
        api_key: str | None,
        auth_token: str | None,
        base_url: str | None,
        default_headers: dict[str, str] | None,
        **options: Any,
    ):
        # options is what the SDK's own copy() and with_options() pass to a client's class
        super().__init__(api_key=api_key, base_url=base_url, default_headers=default_headers, **options)
        self.api_key = api_key
        self.auth_token = auth_token

    @property
    def auth_headers(self) -> dict[str, str]:
        headers = {}
        if self.api_key is not None:
            headers["X-Api-Key"] = self.api_key
        if self.auth_token is not None:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers
