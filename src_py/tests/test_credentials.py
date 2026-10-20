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

import pytest

from mmsp.credentials import EnvironmentCredential, environment_credential, routed_client_type


# What a host asks before it builds a client; how the clients act on the answers is in
# test_env_credentials.py.

_DEEPSEEK_ENV = EnvironmentCredential("env", "DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL")


def test_without_a_base_url_a_client_reads_its_key_and_its_base_url_variables():
    assert environment_credential("deepseek-official") == _DEEPSEEK_ENV
    assert environment_credential("deepseek-official", "") == _DEEPSEEK_ENV


@pytest.mark.parametrize(
    ("client_type", "base_url", "api_key_env"),
    [
        ("deepseek-official", "https://api.deepseek.com", "DEEPSEEK_API_KEY"),
        ("deepseek-official", "https://API.DeepSeek.com//", "DEEPSEEK_API_KEY"),
        ("minimax-official", "https://api.minimax.io/v1", "MINIMAX_API_KEY"),
        ("minimax-official", "HTTPS://api.minimax.io/v1/", "MINIMAX_API_KEY"),
        ("zai-official", "https://api.z.ai/api/paas/v4", "ZAI_API_KEY"),
        ("openai-chat", " https://api.openai.com/v1 ", "OPENAI_API_KEY"),
    ],
)
def test_a_client_given_its_default_endpoint_reads_its_key_for_it_not_the_base_url_variable(
    client_type: str, base_url: str, api_key_env: str
):
    assert environment_credential(client_type, base_url) == EnvironmentCredential("env", api_key_env, None)


@pytest.mark.parametrize(
    "base_url",
    [
        "https://api.deepseek.com/v1",
        "https://api.deepseek.com/anthropic",
        "http://api.deepseek.com",
        "https://api.deepseek.com:8443",
        "https://api.deepseek.com/?region=cn",
        "https://gateway.example/deepseek",
        "not a url",
    ],
)
def test_another_endpoint_needs_a_key_passed_in(base_url: str):
    assert environment_credential("deepseek-official", base_url) == EnvironmentCredential(
        "required", "DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL"
    )


def test_the_mmsp_client_calls_any_base_url_passed_without_a_key_keyless_its_default_included():
    assert environment_credential("mmsp", "https://gateway.example/v1") == EnvironmentCredential("keyless")
    assert environment_credential("mmsp", "http://127.0.0.1:25752/v1") == EnvironmentCredential("keyless")
    assert environment_credential("mmsp") == EnvironmentCredential("env", "MMSP_API_KEY", "MMSP_BASE_URL")


def test_an_earlier_name_in_any_casing_answers_as_the_client_type_it_names():
    assert environment_credential("Gemini-Official", "https://gateway.example") == environment_credential(
        "google-official", "https://gateway.example"
    )
    assert environment_credential("openai") == environment_credential("openai-chat")


def test_an_unknown_client_type_has_no_answer():
    assert environment_credential("nope", "https://api.deepseek.com") is None


@pytest.mark.parametrize(
    ("model", "client_type", "routed"),
    [
        ("deepseek-v4-flash", None, "deepseek-official"),
        ("MiniMax-M3", None, "minimax-official"),
        ("gpt-6-astra", None, "openai-official"),
        ("text-embedding-3-large", None, "openai-embedding"),
        ("text-embedding-3-large", "OpenAI-Official", "openai-embedding"),
        ("claude-sonnet-5", "ant-messages", "ant-messages"),
        ("qwen3.8", "openai", "openai-chat"),
        ("gemini-3.8-flash", "gemini-generate-content", "google-genai"),
    ],
)
def test_a_model_routes_to_its_client(model: str, client_type: str | None, routed: str):
    assert routed_client_type(model, client_type) == routed


def test_a_model_of_no_known_family_or_an_unknown_client_type_routes_nowhere():
    assert routed_client_type("qwen3.8") is None
    assert routed_client_type("gpt-6-astra", "nope") is None
