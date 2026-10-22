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

"""What a host can know about MMSP's clients without building one.

Which client a model reaches, and where that client takes its key and its endpoint from. This module
imports only the standard library and reads no environment. AutoLLMClient routes through it and
every client resolves its credentials through it (`resolve_credentials` in `utils`), so what it says
a client does is what the client does.
"""

import re
from dataclasses import dataclass
from typing import Literal


# An official client speaks its vendor's own API, knows the vendor's models, and reads the
# vendor's key from the environment.
OFFICIAL_CLIENT_TYPES = (
    "openai-official",
    "anthropic-official",
    "google-official",
    "zai-official",
    "moonshot-official",
    "deepseek-official",
    "minimax-official",
)

# A compatible client speaks one wire protocol for whatever endpoint serves it.
COMPATIBLE_CLIENT_TYPES = (
    "openai-responses",
    "openai-chat",
    "openai-chat-vllm-adapter",
    "openai-embedding",
    "ant-messages",
    "google-genai",
    "mmsp",
)

# Without a client type, the family a model id begins with names its official client.
MODEL_FAMILIES = (
    ("gpt-", "openai-official"),
    ("text-embedding-", "openai-official"),
    ("claude-", "anthropic-official"),
    ("gemini-", "google-official"),
    ("glm-", "zai-official"),
    ("kimi-", "moonshot-official"),
    ("deepseek-", "deepseek-official"),
    ("minimax-", "minimax-official"),
)

# The earlier names of three client types, still accepted.
_CLIENT_TYPE_ALIASES = {
    "openai": "openai-chat",
    "gemini-official": "google-official",
    "gemini-generate-content": "google-genai",
}


@dataclass(frozen=True)
class ClientCredentials:
    """Where a client takes its key and its endpoint from.

    Attributes:
        api_key_env: The variable holding the key, read when no key is passed (see environment_credential).
        base_url_env: The variable holding the endpoint, read when no base URL is passed.
        default_base_url: The endpoint when no base URL is passed and base_url_env is unset.
        open_server: The client's server may take no key: a base URL passed without a key is called
            keyless, and so is the endpoint of base_url_env or default_base_url when api_key_env is
            unset as well.
    """

    api_key_env: str
    base_url_env: str
    default_base_url: str
    open_server: bool = False


_OPENAI = ClientCredentials("OPENAI_API_KEY", "OPENAI_BASE_URL", "https://api.openai.com/v1")
_ANTHROPIC = ClientCredentials("ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "https://api.anthropic.com")
_GEMINI = ClientCredentials("GEMINI_API_KEY", "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com")

# Every client type's credentials, by its canonical name.
CLIENT_CREDENTIALS: dict[str, ClientCredentials] = {
    "openai-official": _OPENAI,
    "anthropic-official": _ANTHROPIC,
    "google-official": _GEMINI,
    "zai-official": ClientCredentials("ZAI_API_KEY", "ZAI_BASE_URL", "https://api.z.ai/api/paas/v4/"),
    "moonshot-official": ClientCredentials("MOONSHOT_API_KEY", "MOONSHOT_BASE_URL", "https://api.moonshot.cn/v1"),
    "deepseek-official": ClientCredentials("DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
    "minimax-official": ClientCredentials("MINIMAX_API_KEY", "MINIMAX_BASE_URL", "https://api.minimax.io/v1"),
    "openai-responses": _OPENAI,
    "openai-chat": _OPENAI,
    # the variables `vllm serve` itself reads for its key, and the address it answers on by default
    "openai-chat-vllm-adapter": ClientCredentials(
        "VLLM_API_KEY", "VLLM_BASE_URL", "http://127.0.0.1:8000/v1", open_server=True
    ),
    "openai-embedding": _OPENAI,
    "ant-messages": _ANTHROPIC,
    "google-genai": _GEMINI,
    "mmsp": ClientCredentials("MMSP_API_KEY", "MMSP_BASE_URL", "http://127.0.0.1:25752/v1", open_server=True),
}


@dataclass(frozen=True)
class EnvironmentCredential:
    """What a client handed no key does with the base URL it is handed.

    Attributes:
        kind: `env` reads api_key_env, and base_url_env when that is not None (no base URL was
            passed); `keyless` sends no key, as an open server takes (`openai-chat-vllm-adapter`,
            built on the OpenAI SDK, which sends a key with every request, sends the placeholder
            `EMPTY`); `required` refuses with ApiKeyRequiredError before any request.
        api_key_env: The variable holding the key, for `env` and `required`.
        base_url_env: The variable holding the endpoint: for `required`, and for `env` when no base
            URL was passed.
    """

    kind: Literal["env", "keyless", "required"]
    api_key_env: str | None = None
    base_url_env: str | None = None


def _canonical_client_type(client_type: str) -> str | None:
    lowered = client_type.lower()
    canonical = _CLIENT_TYPE_ALIASES.get(lowered, lowered)
    return canonical if canonical in CLIENT_CREDENTIALS else None


# Scheme and host compared case-insensitively and the path without trailing slashes; anything after
# the path compared as written.
_ENDPOINT = re.compile(r"([a-z][a-z0-9+.-]*)://([^/?#]*)([^?#]*)(.*)", re.IGNORECASE | re.DOTALL)


def _normalized_endpoint(url: str) -> str | None:
    match = _ENDPOINT.fullmatch(url.strip())
    if match is None:
        return None
    scheme, host, path, rest = match.groups()
    return f"{scheme.lower()}://{host.lower()}{path.rstrip('/')}{rest}"


def client_type_for_model(model: str) -> str | None:
    """
    The official client a model id routes to on its own, or None when its family is unknown.

    Args:
        model: The model id, in any casing.

    Returns:
        str | None: One of OFFICIAL_CLIENT_TYPES, or None.
    """
    lowered = model.lower()
    for prefix, client_type in MODEL_FAMILIES:
        if lowered.startswith(prefix):
            return client_type
    return None


def routed_client_type(model: str, client_type: str | None = None) -> str | None:
    """
    The client AutoLLMClient builds for a model.

    The client type passed in (in any casing, an earlier name accepted), else the official client of
    the model id's family. `openai-official` serves a `text-embedding-` model through
    `openai-embedding`.

    Args:
        model: The model id.
        client_type: The client type passed in, if any.

    Returns:
        str | None: A key of CLIENT_CREDENTIALS, or None for an unknown client type or family.
    """
    routed = _canonical_client_type(client_type) if client_type else client_type_for_model(model)
    if routed == "openai-official" and model.lower().startswith("text-embedding-"):
        return "openai-embedding"
    return routed


def environment_credential(client_type: str, base_url: str | None = None) -> EnvironmentCredential | None:
    """
    What a client does for its key when it is handed none.

    Without a base URL it reads `<P>_API_KEY` and `<P>_BASE_URL`. With its own default endpoint
    (trailing slashes and the host's case ignored) it reads `<P>_API_KEY` for that endpoint. With any
    other base URL it refuses, because the environment's key was not given for that endpoint, except
    a client of an open server (`mmsp`, `openai-chat-vllm-adapter`), which calls any base URL keyless.

    Args:
        client_type: A client type, in any casing, an earlier name accepted.
        base_url: The base URL passed to the client, if any.

    Returns:
        EnvironmentCredential | None: What the client does, or None for an unknown client type.
    """
    canonical = _canonical_client_type(client_type)
    if canonical is None:
        return None
    credentials = CLIENT_CREDENTIALS[canonical]
    if not base_url:
        return EnvironmentCredential("env", credentials.api_key_env, credentials.base_url_env)
    if credentials.open_server:
        return EnvironmentCredential("keyless")
    if _normalized_endpoint(base_url) == _normalized_endpoint(credentials.default_base_url):
        return EnvironmentCredential("env", credentials.api_key_env, None)
    return EnvironmentCredential("required", credentials.api_key_env, credentials.base_url_env)
