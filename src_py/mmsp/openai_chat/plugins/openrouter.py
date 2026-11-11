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

from ...plugin import ClientPlugin
from ...types import UniEvent
from ...utils import fix_openrouter_usage_metadata


class OpenRouterPlugin(ClientPlugin):
    """OpenRouter at times leaves the reasoning tokens out of the completion tokens it reports."""

    hosts = ("openrouter.ai",)

    def on_event(self, event: UniEvent) -> None:
        if event["usage_metadata"] is not None:
            event["usage_metadata"] = fix_openrouter_usage_metadata(event["usage_metadata"], self.base_url)
