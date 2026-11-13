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

"""
Plugins: what one endpoint, or one vendor's models, need of a client beyond the protocol it speaks.

A compatible client speaks its protocol in its transforms as its reference client does; a field an
endpoint names otherwise, a shape it streams otherwise or a count it reports wrong lives in a plugin
of the client's ``plugins/`` folder instead, enabled where it matches (MMSP-RFC-0009 §9).
"""

import re
from collections.abc import Iterable
from typing import Any
from urllib.parse import urlparse

from .types import UniConfig, UniEvent


class ClientPlugin:
    """
    The handling one endpoint, or one vendor's models, need of a client.

    A subclass declares ``hosts``, the base-URL hosts it runs on, each matching itself and its
    subdomains, and ``models``, a regular expression searched in the model id without regard to
    case; the client enables it where every one it declares matches. Its hooks change their argument
    in place, turning the endpoint's wire into the shape the transforms read and back.
    """

    hosts: tuple[str, ...] = ()
    models: str | None = None

    def __init__(self, model: str, base_url: str, sdk: Any) -> None:
        self.model = model
        self.base_url = base_url
        # the client's SDK object, through which a request of the plugin's own goes, to the
        # client's endpoint with the client's credential
        self.sdk = sdk

    @classmethod
    def matches(cls, model: str, base_url: str) -> bool:
        """Whether a client of this model id and base URL runs the plugin."""
        if not cls.hosts and cls.models is None:
            return False

        host = (urlparse(base_url).hostname or "").lower()
        if cls.hosts and not any(host == name or host.endswith(f".{name}") for name in cls.hosts):
            return False

        return cls.models is None or re.search(cls.models, model, re.IGNORECASE) is not None

    async def on_request(self, config: UniConfig, request: dict[str, Any]) -> None:
        """Change the keyword arguments of the SDK call, the wire messages among them, before it is sent."""

    def on_wire_event(self, wire_event: Any) -> None:
        """Change one wire event before the event transform reads it."""

    def on_event(self, event: UniEvent) -> None:
        """Change the UniEvent the event transform made of a wire event."""


def enabled_plugins(
    plugins: Iterable[type[ClientPlugin]], model: str, base_url: str, sdk: Any
) -> tuple[ClientPlugin, ...]:
    """The plugins a client of this model id and base URL runs, in the order listed."""
    return tuple(plugin(model, base_url, sdk) for plugin in plugins if plugin.matches(model, base_url))
