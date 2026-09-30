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
Conversation tracer module for saving and viewing conversation history.

This module provides functionality to save conversation history to local files
and serve them via a web interface for real-time monitoring.
"""

import base64
import html
import io
import json
import os
import wave
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from flask import Flask, Response, render_template_string, request

from ..legacy import normalize_legacy_messages
from ..types import UniMessage


# The head every tracer page shares: the playground's tokens, fonts and light and dark themes.
_TRACER_HEAD = """
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='1' y='1' width='6' height='6' rx='1.5' fill='%232f6fed'/%3E%3Crect x='9' y='1' width='6' height='6' rx='1.5' fill='%2316945b'/%3E%3Crect x='1' y='9' width='6' height='6' rx='1.5' fill='%23b16a0a'/%3E%3Crect x='9' y='9' width='6' height='6' rx='1.5' fill='%23d23b3b'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<script>
    // the playground and the tracer share one origin, so they share the theme a reader picked
    try {
        const theme = localStorage.getItem('mmsp.playground.theme');
        if (theme === 'light' || theme === 'dark') {
            document.documentElement.dataset.theme = theme;
        }
    } catch (error) {
        // storage refused: the system theme it is
    }
</script>
<style>
    :root {
        --bg: #f5f5f6;
        --surface: #ffffff;
        --raised: #f0f0f2;
        --hover: rgba(20, 22, 28, 0.05);
        --ring: rgba(20, 22, 28, 0.09);
        --ring-strong: rgba(20, 22, 28, 0.17);
        --text: #16181d;
        --muted: #5c616c;
        --subtle: #8a8f99;
        --accent: #2f6fed;
        --accent-soft: rgba(47, 111, 237, 0.14);
        --green: #16945b;
        --green-soft: rgba(22, 148, 91, 0.12);
        --amber: #b16a0a;
        --amber-soft: rgba(177, 106, 10, 0.12);
        --red: #d23b3b;
        --red-soft: rgba(210, 59, 59, 0.1);
        --violet: #7a4fd6;
        --violet-soft: rgba(122, 79, 214, 0.12);
        --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(20, 22, 28, 0.04);
        --ease: cubic-bezier(0.23, 1, 0.32, 1);
        --font: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
        --mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
        color-scheme: light;
    }

    @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) {
            --bg: #1b1c1f;
            --surface: #222327;
            --raised: #28292e;
            --hover: rgba(255, 255, 255, 0.05);
            --ring: rgba(255, 255, 255, 0.08);
            --ring-strong: rgba(255, 255, 255, 0.15);
            --text: #eceef1;
            --muted: #a3a8b1;
            --subtle: #6f747e;
            --accent: #4d8ef7;
            --accent-soft: rgba(77, 142, 247, 0.2);
            --green: #43c283;
            --green-soft: rgba(67, 194, 131, 0.14);
            --amber: #e3a646;
            --amber-soft: rgba(227, 166, 70, 0.14);
            --red: #f06a6a;
            --red-soft: rgba(240, 106, 106, 0.14);
            --violet: #a98bf0;
            --violet-soft: rgba(169, 139, 240, 0.16);
            --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.3);
            color-scheme: dark;
        }
    }

    :root[data-theme="dark"] {
        --bg: #1b1c1f;
        --surface: #222327;
        --raised: #28292e;
        --hover: rgba(255, 255, 255, 0.05);
        --ring: rgba(255, 255, 255, 0.08);
        --ring-strong: rgba(255, 255, 255, 0.15);
        --text: #eceef1;
        --muted: #a3a8b1;
        --subtle: #6f747e;
        --accent: #4d8ef7;
        --accent-soft: rgba(77, 142, 247, 0.2);
        --green: #43c283;
        --green-soft: rgba(67, 194, 131, 0.14);
        --amber: #e3a646;
        --amber-soft: rgba(227, 166, 70, 0.14);
        --red: #f06a6a;
        --red-soft: rgba(240, 106, 106, 0.14);
        --violet: #a98bf0;
        --violet-soft: rgba(169, 139, 240, 0.16);
        --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.3);
        color-scheme: dark;
    }

    *, *::before, *::after {
        box-sizing: border-box;
    }

    html {
        scroll-padding-top: 72px;
    }

    body {
        margin: 0;
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
        font: 14px/1.55 var(--font);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
    }

    a {
        color: inherit;
        text-decoration: none;
    }

    button {
        font: inherit;
        color: inherit;
        cursor: pointer;
        background: none;
        border: 0;
        padding: 0;
    }

    svg {
        flex: none;
    }

    .mono {
        font-family: var(--mono);
    }

    :focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }

    ::selection {
        background: var(--accent-soft);
    }

    /* top bar */

    .topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 16px;
        height: 56px;
        padding: 0 20px;
        background: color-mix(in srgb, var(--bg) 86%, transparent);
        backdrop-filter: saturate(1.4) blur(12px);
        -webkit-backdrop-filter: saturate(1.4) blur(12px);
        box-shadow: 0 1px 0 var(--ring);
    }

    .brand {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex: none;
    }

    .brand-name {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
    }

    .brand-sub {
        color: var(--subtle);
        font-size: 13px;
    }

    .crumbs {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        overflow: hidden;
        color: var(--subtle);
        font-family: var(--mono);
        font-size: 12.5px;
        white-space: nowrap;
    }

    .crumbs a {
        color: var(--muted);
        border-radius: 4px;
        transition: color 0.15s;
    }

    .crumbs a:hover {
        color: var(--text);
    }

    .crumb-current {
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text);
    }

    .crumb-sep {
        color: var(--subtle);
        opacity: 0.55;
    }

    .topbar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
    }

    .ghost-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 10px;
        border-radius: 8px;
        color: var(--muted);
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
        transition: color 0.15s, background-color 0.15s;
    }

    .ghost-btn:hover {
        color: var(--text);
        background: var(--hover);
    }

    .segmented {
        position: relative;
        display: flex;
        padding: 3px;
        border-radius: 9px;
        background: var(--raised);
        box-shadow: inset 0 0 0 1px var(--ring);
    }

    .segmented button, .segmented a {
        position: relative;
        z-index: 1;
        display: grid;
        place-items: center;
        min-width: 0;
        height: 26px;
        padding: 0 10px;
        border-radius: 6px;
        color: var(--muted);
        font-size: 12.5px;
        font-weight: 500;
        white-space: nowrap;
        transition: color 0.15s, background-color 0.15s;
    }

    .segmented button:hover, .segmented a:hover {
        color: var(--text);
    }

    .segmented [aria-checked="true"], .segmented [aria-current="true"] {
        color: var(--text);
    }

    .segmented a[aria-current="true"] {
        background: var(--surface);
        box-shadow: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.12);
    }

    .seg-thumb {
        position: absolute;
        top: 3px;
        bottom: 3px;
        left: 0;
        width: 0;
        border-radius: 6px;
        background: var(--surface);
        box-shadow: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.12);
        transition: transform 0.25s var(--ease), width 0.25s var(--ease);
    }

    .theme-toggle button {
        width: 29px;
        padding: 0;
    }

    /* pages */

    .page {
        max-width: 920px;
        margin: 0 auto;
        padding: 32px 20px 64px;
    }

    .page-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
    }

    .page-head h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
        letter-spacing: -0.015em;
        overflow-wrap: anywhere;
    }

    .page-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 14px;
        margin: 6px 0 0;
        color: var(--subtle);
        font-size: 13px;
    }

    .page-meta b {
        color: var(--muted);
        font-weight: 500;
    }

    .card {
        background: var(--surface);
        border-radius: 12px;
        box-shadow: var(--shadow-card);
    }

    /* directory */

    .list {
        overflow: hidden;
    }

    .row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        transition: background-color 0.12s;
    }

    .row + .row {
        box-shadow: inset 0 1px 0 var(--ring);
    }

    .row:hover {
        background: var(--hover);
    }

    .row-icon {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 7px;
        background: var(--raised);
        color: var(--muted);
    }

    .row-icon.dir {
        background: var(--accent-soft);
        color: var(--accent);
    }

    .row-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
    }

    .row-size, .row-time {
        flex: none;
        color: var(--subtle);
        font-family: var(--mono);
        font-size: 12px;
        font-variant-numeric: tabular-nums;
    }

    .row-size {
        width: 72px;
        text-align: right;
    }

    .row-time {
        width: 150px;
        text-align: right;
    }

    .empty {
        padding: 48px 20px;
        color: var(--muted);
        text-align: center;
    }

    .empty code {
        padding: 1px 5px;
        border-radius: 5px;
        background: var(--raised);
        font-family: var(--mono);
        font-size: 12.5px;
    }

    /* trace */

    .viewer {
        display: flex;
        gap: 32px;
        max-width: 1180px;
        margin: 0 auto;
        padding: 0 20px;
    }

    .viewer .page {
        flex: 1;
        min-width: 0;
        max-width: 880px;
        margin: 0;
        padding: 32px 0 64px;
    }

    .rail {
        width: 200px;
        flex: none;
        padding-top: 32px;
    }

    .rail-inner {
        position: sticky;
        top: 88px;
        max-height: calc(100vh - 120px);
        overflow-y: auto;
    }

    .rail-title {
        margin-bottom: 10px;
        color: var(--subtle);
        font-size: 12px;
        font-weight: 500;
    }

    .rail-list {
        margin: 0;
        padding: 0;
        list-style: none;
        box-shadow: inset 1px 0 0 var(--ring);
    }

    .rail-list a {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        margin-left: -1px;
        padding: 4px 0 4px 14px;
        border-left: 1.5px solid transparent;
        color: var(--muted);
        font-size: 13px;
        transition: color 0.15s, border-color 0.15s;
    }

    .rail-list a:hover {
        color: var(--text);
    }

    .rail-list a.active {
        border-left-color: var(--accent);
        color: var(--text);
        font-weight: 500;
    }

    .rail-list a span {
        color: var(--subtle);
        font-family: var(--mono);
        font-size: 11px;
        font-weight: 400;
    }

    .fold summary, .msg-card summary {
        list-style: none;
        cursor: pointer;
    }

    .fold summary::-webkit-details-marker, .msg-card summary::-webkit-details-marker {
        display: none;
    }

    .chevron {
        color: var(--subtle);
        transition: transform 0.25s var(--ease);
    }

    details[open] > summary .chevron {
        transform: rotate(180deg);
    }

    .config {
        margin-bottom: 20px;
    }

    .card-head {
        padding: 12px 16px;
        box-shadow: inset 0 -1px 0 var(--ring);
        color: var(--muted);
        font-size: 12.5px;
        font-weight: 500;
    }

    .kv {
        margin: 0;
    }

    .kv-row {
        display: grid;
        grid-template-columns: 160px 1fr;
        gap: 16px;
        padding: 9px 16px;
    }

    .kv-row + .kv-row {
        box-shadow: inset 0 1px 0 var(--ring);
    }

    .kv-row dt {
        color: var(--muted);
        font-family: var(--mono);
        font-size: 12.5px;
    }

    .kv-row dd {
        margin: 0;
        min-width: 0;
        font-family: var(--mono);
        font-size: 12.5px;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
    }

    .fold summary {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--accent);
        font-family: var(--font);
        font-size: 12.5px;
        font-weight: 500;
    }

    .fold pre {
        margin: 8px 0 0;
        padding: 10px 12px;
        max-height: 360px;
        overflow: auto;
        border-radius: 8px;
        background: var(--raised);
        font-family: var(--mono);
        font-size: 12px;
        line-height: 1.6;
        white-space: pre-wrap;
    }

    .msg-card {
        margin-bottom: 14px;
        overflow: hidden;
    }

    .msg-summary {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 14px;
        padding: 11px 16px;
        color: var(--subtle);
        font-size: 12.5px;
        transition: background-color 0.12s;
    }

    .msg-summary:hover {
        background: var(--hover);
    }

    details[open] > .msg-summary {
        box-shadow: inset 0 -1px 0 var(--ring);
    }

    .role {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 22px;
        padding: 0 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
    }

    .role::before {
        content: "";
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
    }

    .role-user { background: var(--accent-soft); color: var(--accent); }
    .role-assistant { background: var(--green-soft); color: var(--green); }

    .msg-summary .spacer {
        flex: 1;
    }

    .msg-summary .num {
        font-family: var(--mono);
        font-size: 11.5px;
        font-variant-numeric: tabular-nums;
    }

    .msg-body {
        padding: 16px;
    }

    .item + .item {
        margin-top: 16px;
    }

    .item-type {
        margin-bottom: 6px;
        color: var(--subtle);
        font-family: var(--mono);
        font-size: 11px;
    }

    .item-text {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        line-height: 1.65;
    }

    .item-thinking {
        padding: 2px 0 2px 14px;
        box-shadow: inset 1.5px 0 0 var(--ring-strong);
        color: var(--muted);
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .item-note {
        margin-bottom: 8px;
        color: var(--subtle);
        font-family: var(--mono);
        font-size: 12px;
    }

    .item-img {
        display: block;
        max-width: min(100%, 360px);
        max-height: 280px;
        border-radius: 10px;
        box-shadow: 0 0 0 1px var(--ring);
    }

    .item-images {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
    }

    .item-audio {
        display: block;
        width: min(100%, 360px);
        height: 36px;
    }

    .tool, .result {
        border-radius: 10px;
        background: var(--raised);
        box-shadow: inset 0 0 0 1px var(--ring);
        overflow: hidden;
    }

    .tool-head, .result-head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        font-size: 13px;
    }

    .tool-icon, .result-icon {
        display: grid;
        place-items: center;
        width: 22px;
        height: 22px;
        border-radius: 6px;
    }

    .tool-icon { background: var(--amber-soft); color: var(--amber); }
    .result-icon { background: var(--violet-soft); color: var(--violet); }

    .tool-sig {
        min-width: 0;
        font-family: var(--mono);
        font-size: 12.5px;
        overflow-wrap: anywhere;
    }

    .tool-id {
        margin-left: auto;
        padding-left: 8px;
        color: var(--subtle);
        font-family: var(--mono);
        font-size: 11px;
        white-space: nowrap;
    }

    .result-text {
        padding: 10px 12px;
        box-shadow: inset 0 1px 0 var(--ring);
        font-family: var(--mono);
        font-size: 12.5px;
        line-height: 1.6;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .result .item-images {
        margin: 0;
        padding: 0 12px 12px;
    }

    .embedding {
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--raised);
        font-family: var(--mono);
        font-size: 12px;
        overflow-wrap: anywhere;
    }

    .msg-foot {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 14px;
        margin-top: 16px;
        padding-top: 12px;
        box-shadow: inset 0 1px 0 var(--ring);
        color: var(--subtle);
        font-size: 12px;
    }

    .reason {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 22px;
        padding: 0 8px;
        border-radius: 999px;
        background: var(--raised);
        color: var(--muted);
        font-family: var(--mono);
        font-size: 11.5px;
    }

    .reason::before {
        content: "";
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
    }

    .reason-stop { background: var(--green-soft); color: var(--green); }
    .reason-tool_call { background: var(--amber-soft); color: var(--amber); }
    .reason-length, .reason-unknown { background: var(--red-soft); color: var(--red); }

    .usage {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 4px 12px;
        font-family: var(--mono);
        font-size: 11.5px;
        font-variant-numeric: tabular-nums;
    }

    .usage b {
        color: var(--muted);
        font-weight: 500;
    }

    .text-file {
        margin: 0;
        padding: 16px 18px;
        overflow-x: auto;
        font-family: var(--mono);
        font-size: 12.5px;
        line-height: 1.65;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    @media (max-width: 1000px) {
        .rail {
            display: none;
        }
    }

    @media (max-width: 640px) {
        .topbar {
            gap: 10px;
            padding: 0 12px;
        }

        .brand-sub, .label-wide {
            display: none;
        }

        .page {
            padding: 24px 16px 48px;
        }

        .viewer {
            padding: 0 16px;
        }

        .row-time {
            display: none;
        }

        .kv-row {
            grid-template-columns: 1fr;
            gap: 2px;
        }

        .page-head {
            flex-direction: column;
            align-items: flex-start;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
        }
    }
</style>
"""

_TRACER_SCRIPT = """
<script>
    function updateSegmentThumb(root) {
        const thumb = root && root.querySelector('.seg-thumb');
        const checked = root && root.querySelector('[aria-checked="true"]');
        if (!thumb || !checked || !checked.offsetWidth) {
            return;
        }
        thumb.style.width = checked.offsetWidth + 'px';
        thumb.style.transform = 'translateX(' + checked.offsetLeft + 'px)';
    }

    function updateThemeToggle() {
        const stored = document.documentElement.dataset.theme;
        const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.querySelectorAll('#themeToggle [data-theme-choice]').forEach(function (button) {
            button.setAttribute('aria-checked', button.dataset.themeChoice === theme ? 'true' : 'false');
        });
        updateSegmentThumb(document.getElementById('themeToggle'));
    }

    function setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        try {
            localStorage.setItem('mmsp.playground.theme', theme);
        } catch (error) {
            // a browser that refuses storage keeps the choice for this page only
        }
        updateThemeToggle();
    }

    updateThemeToggle();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeToggle);
    document.fonts.ready.then(updateThemeToggle);

    // the rail marks the round whose first message is nearest the top of the view
    const railLinks = Array.from(document.querySelectorAll('.rail-list a'));
    if (railLinks.length) {
        const targets = railLinks.map(function (link) {
            return document.querySelector(link.getAttribute('href'));
        });
        const markActive = function () {
            let active = 0;
            targets.forEach(function (target, index) {
                if (target && target.getBoundingClientRect().top < 140) {
                    active = index;
                }
            });
            // at the bottom of the page the last round is the one being read, however high it sits
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
                active = targets.length - 1;
            }
            railLinks.forEach(function (link, index) {
                link.classList.toggle('active', index === active);
            });
        };
        window.addEventListener('scroll', markActive, { passive: true });
        markActive();
    }
</script>
"""

_ICONS = {
    "github": '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"></path></svg>',
    "sun": '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>',
    "moon": '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path></svg>',
    "folder": '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"></path></svg>',
    "file": '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"></path><path d="M14 3v5h5M9 13h6M9 17h4"></path></svg>',
    "back": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>',
    "chevron": '<svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>',
    "tool": '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L2 10l8-8Z"></path></svg>',
    "result": '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 10 4 15l5 5"></path><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>',
}


@dataclass
class Tracer:
    """
    Tracer for saving conversation history to local files.

    This class handles saving conversation history to files in a cache directory
    and provides a web server for browsing and viewing the saved conversations.
    """

    cache_dir: Path = field(default=None, init=True)

    def __post_init__(self) -> None:
        """Initialize cache directory after instance creation."""
        if self.cache_dir is None:
            cache_dir_str = os.getenv("MMSP_CACHE_DIR", "cache")
            self.cache_dir = Path(cache_dir_str).absolute()
        elif isinstance(self.cache_dir, str):
            self.cache_dir = Path(self.cache_dir).absolute()
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _serialize_for_json(self, obj: Any) -> Any:
        """
        Recursively serialize objects for JSON, converting bytes to base64.

        Args:
            obj: Object to serialize

        Returns:
            JSON-serializable object
        """
        if isinstance(obj, bytes):
            return base64.b64encode(obj).decode("utf-8")
        elif isinstance(obj, dict):
            return {k: self._serialize_for_json(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._serialize_for_json(item) for item in obj]
        return obj

    @staticmethod
    def _is_browser_playable_audio_mime_type(mime_type: str | None) -> bool:
        """Return whether browsers can usually play this MIME type directly."""
        return (mime_type or "").lower() in {
            "audio/wav",
            "audio/x-wav",
            "audio/mpeg",
            "audio/mp3",
            "audio/ogg",
            "audio/webm",
            "audio/flac",
            "audio/aac",
            "audio/mp4",
        }

    @staticmethod
    def _decode_inline_data(item: dict[str, Any]) -> bytes:
        """Decode inline_data payloads from bytes or base64 text."""
        data = item.get("data") or b""
        if isinstance(data, str):
            return base64.b64decode(data.encode("utf-8"))
        return data

    def _build_wave_bytes_from_pcm(self, item: dict[str, Any]) -> bytes:
        """Wrap raw PCM bytes in a WAV header using Gemini TTS defaults."""
        pcm_bytes = self._decode_inline_data(item)
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(24000)
            wav_file.writeframes(pcm_bytes)
        return buffer.getvalue()

    def _build_inline_data_url(self, item: dict[str, Any]) -> str:
        """Build a browser-friendly data URL for inline_data content."""
        mime_type = item.get("mime_type") or "application/octet-stream"
        raw_bytes = self._decode_inline_data(item)

        if mime_type.startswith("image/"):
            encoded = base64.b64encode(raw_bytes).decode("utf-8")
            return f"data:{mime_type};base64,{encoded}"

        if mime_type.startswith("audio/"):
            if not self._is_browser_playable_audio_mime_type(mime_type):
                mime_type = "audio/wav"
                raw_bytes = self._build_wave_bytes_from_pcm(item)
            encoded = base64.b64encode(raw_bytes).decode("utf-8")
            return f"data:{mime_type};base64,{encoded}"

        encoded = base64.b64encode(raw_bytes).decode("utf-8")
        return f"data:{mime_type};base64,{encoded}"

    def _format_inline_data_summary(self, item: dict[str, Any], *, is_thinking: bool = False) -> str:
        """
        Format inline_data metadata without emitting raw payloads.

        Args:
            item: inline_data content item

        Returns:
            Human-readable summary of the inline payload
        """
        mime_type = item.get("mime_type") or "application/octet-stream"
        data = item.get("data")

        if isinstance(data, str):
            byte_count = len(base64.b64decode(data.encode("utf-8")))
        else:
            byte_count = len(data) if data else 0

        # Convert bytes to KBs and MBs
        kb_count = byte_count / 1024
        mb_count = byte_count / (1024 * 1024)

        label = "Thinking " if is_thinking else ""
        if mime_type.startswith("image/"):
            label += "Inline Image"
        elif mime_type.startswith("audio/"):
            label += "Inline Audio"
        else:
            label += "Inline Data"

        if kb_count < 1000:
            return f"{label}: {mime_type} ({kb_count:.2f} KB)"
        else:
            return f"{label}: {mime_type} ({mb_count:.2f} MB)"

    @staticmethod
    def _format_embedding_preview(item: dict[str, Any]) -> str:
        values = item.get("embedding") or []
        preview = ", ".join(str(value) for value in values[:5])
        return f"Embedding: [{preview}]"

    @staticmethod
    def _normalize_base_path(base_path: str = "") -> str:
        """Normalize a URL prefix used when tracer is mounted inside another app."""
        if not base_path or base_path == "/":
            return ""
        prefixed = base_path if base_path.startswith("/") else f"/{base_path}"
        return prefixed[:-1] if prefixed.endswith("/") else prefixed

    @staticmethod
    def _prefix_url(base_path: str, url: str) -> str:
        """Prefix an internal tracer URL with the mount path."""
        if not base_path:
            return url
        if url == "/":
            return f"{base_path}/"
        return f"{base_path}{url}"

    @staticmethod
    def _format_duration(ms: float) -> str:
        """Format milliseconds the way the playground does: 840 ms, 2.41 s, 1 min 5 s."""
        if ms < 1000:
            return f"{round(ms)} ms"
        if ms < 60000:
            return f"{ms / 1000:.{2 if ms < 10000 else 1}f} s"
        return f"{int(ms // 60000)} min {round((ms % 60000) / 1000)} s"

    def _breadcrumb(self, base_path: str, parts: list[str]) -> str:
        """The path from the cache root to the page, every step but the last a link."""
        steps = ["cache", *parts]
        crumbs = []
        for i, step in enumerate(steps):
            if i == len(steps) - 1:
                crumbs.append(f'<span class="crumb-current">{html.escape(step)}</span>')
            else:
                url = self._prefix_url(base_path, "/" + "/".join(parts[:i]))
                crumbs.append(f'<a href="{html.escape(url)}">{html.escape(step)}</a>')
        return '<span class="crumb-sep">/</span>'.join(crumbs)

    @staticmethod
    def _page(title: str, root_url: str, breadcrumb: str, body: str) -> str:
        """Wrap a page body in the head, top bar and script every tracer page shares."""
        return (
            '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
            f"<title>{html.escape(title)}</title>\n"
            f"{_TRACER_HEAD}\n</head>\n<body>\n"
            '<header class="topbar">'
            f'<a class="brand" href="{html.escape(root_url)}"><span class="brand-name">MMSP</span>'
            '<span class="brand-sub">Tracer</span></a>'
            f'<nav class="crumbs" aria-label="Path">{breadcrumb}</nav>'
            '<div class="topbar-actions">'
            '<a href="https://github.com/Prism-Shadow/model-message-stream-protocol" target="_blank" '
            f'rel="noopener noreferrer" class="ghost-btn" title="GitHub">{_ICONS["github"]}'
            '<span class="label-wide">GitHub</span></a>'
            '<div class="segmented theme-toggle" id="themeToggle" role="radiogroup" aria-label="Theme">'
            '<span class="seg-thumb" aria-hidden="true"></span>'
            '<button type="button" role="radio" aria-checked="false" aria-label="Light theme" title="Light" '
            f'data-theme-choice="light" onclick="setTheme(\'light\')">{_ICONS["sun"]}</button>'
            '<button type="button" role="radio" aria-checked="false" aria-label="Dark theme" title="Dark" '
            f'data-theme-choice="dark" onclick="setTheme(\'dark\')">{_ICONS["moon"]}</button>'
            "</div></div></header>\n"
            f"{body}\n{_TRACER_SCRIPT}\n</body>\n</html>\n"
        )

    def save_history(self, model: str, history: list[UniMessage], file_id: str, config: dict[str, Any]) -> None:
        """
        Save conversation history to files.

        Args:
            model: The model name used for this conversation
            history: List of UniMessage objects representing the conversation
            file_id: File identifier without extension (e.g., "agent1/00001")
            config: The UniConfig used for this conversation
        """
        # Create directory if needed
        file_path_base = self.cache_dir / file_id
        file_path_base.parent.mkdir(parents=True, exist_ok=True)

        config_with_model = config.copy()
        config_with_model["model"] = model
        # Save as JSON
        json_path = file_path_base.with_suffix(".json")
        json_data = {
            "history": self._serialize_for_json(history),
            "config": self._serialize_for_json(config_with_model),
            "timestamp": datetime.now().isoformat(),
        }
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)

        # Save as human-readable text
        txt_path = file_path_base.with_suffix(".txt")
        formatted_content = self._format_history(history, config_with_model)
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(formatted_content)

    def _format_history(self, history: list[UniMessage], config: dict[str, Any]) -> str:
        """
        Format conversation history in a readable text format.

        Args:
            history: List of UniMessage objects
            config: The UniConfig used for this conversation

        Returns:
            Formatted string representation of the conversation
        """
        lines = []
        lines.append("=" * 80)
        lines.append(f"Conversation History - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 80)
        lines.append("")

        # Add config information
        lines.append("Configuration:")
        for key, value in config.items():
            if key != "trace_id":  # Don't include trace_id itself
                if key == "tools" and isinstance(value, list):
                    lines.append(f"  {key}:")
                    lines.append(f"    {json.dumps(value, indent=2, ensure_ascii=False)}")
                else:
                    lines.append(f"  {key}: {value}")
        lines.append("")

        for i, message in enumerate(history, 1):
            role = message["role"].upper()
            lines.append(f"[{i}] {role}:")
            lines.append("-" * 80)

            for item in message["content_items"]:
                if item["type"] == "text.done":
                    lines.append(f"Text: {item['text']}")
                elif item["type"] == "thinking.done":
                    lines.append(f"Thinking: {item['thinking']}")
                elif item["type"] == "inline_thinking.done":
                    lines.append(self._format_inline_data_summary(item, is_thinking=True))
                elif item["type"] == "image_url.done":
                    lines.append(f"Image URL: {item['image_url']}")
                elif item["type"] == "inline_data.done":
                    lines.append(self._format_inline_data_summary(item))
                elif item["type"] == "embedding.done":
                    lines.append(self._format_embedding_preview(item))
                elif item["type"] == "tool_call.done":
                    lines.append(f"Tool Call: {item['name']}")
                    lines.append(f"  Arguments: {json.dumps(item['arguments'], indent=2, ensure_ascii=False)}")
                    lines.append(f"  Tool Call ID: {item['tool_call_id']}")
                elif item["type"] == "tool_result.done":
                    lines.append(f"Tool Result (ID: {item['tool_call_id']}): {item['text']}")
                    if "images" in item and item["images"]:
                        for i, image_url in enumerate(item["images"], 1):
                            lines.append(f"  Image {i}: {image_url}")

            # Add usage metadata if available
            if "usage_metadata" in message and message["usage_metadata"]:
                metadata = message["usage_metadata"]
                lines.append("\nUsage Metadata:")
                if metadata.get("cached_tokens") is not None:
                    lines.append(f"  Cached Tokens: {metadata['cached_tokens']}")
                if metadata.get("prompt_tokens") is not None:
                    lines.append(f"  Prompt Tokens: {metadata['prompt_tokens']}")
                if metadata.get("thoughts_tokens") is not None:
                    lines.append(f"  Thoughts Tokens: {metadata['thoughts_tokens']}")
                if metadata.get("response_tokens") is not None:
                    lines.append(f"  Response Tokens: {metadata['response_tokens']}")

                # Calculate and show total tokens
                # Input tokens = cached_tokens + prompt_tokens
                # Output tokens = thoughts_tokens + response_tokens
                # Total tokens = input_tokens + output_tokens
                input_tokens = (metadata.get("cached_tokens") or 0) + (metadata.get("prompt_tokens") or 0)
                output_tokens = (metadata.get("thoughts_tokens") or 0) + (metadata.get("response_tokens") or 0)
                total_tokens = input_tokens + output_tokens
                lines.append(f"  Total Tokens: {total_tokens}")

            # Add finish reason if available
            if "finish_reason" in message:
                lines.append(f"\nFinish Reason: {message['finish_reason']}")

            lines.append("")

        return "\n".join(lines)

    def create_web_app(self, base_path: str = "") -> Flask:
        """
        Create a Flask web application for browsing conversation files.

        Returns:
            Flask application instance
        """
        app = Flask(__name__)
        app.jinja_env.policies["json.dumps_kwargs"] = {"ensure_ascii": False}
        base_path = self._normalize_base_path(base_path)
        root_url = self._prefix_url(base_path, "/")

        @app.template_filter("format_ts")
        def format_ts(ms: int | None) -> str:
            """Format a Unix timestamp in milliseconds as YYYY-MM-DD HH:MM:SS."""
            if ms is None:
                return ""
            return datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d %H:%M:%S")

        @app.template_filter("inline_data_url")
        def inline_data_url(item: dict[str, Any]) -> str:
            """Build a data URL for inline_data content."""
            return self._build_inline_data_url(item)

        @app.template_filter("inline_data_summary")
        def inline_data_summary(item: dict[str, Any]) -> str:
            """Render a concise inline_data summary."""
            return self._format_inline_data_summary(item)

        @app.template_filter("inline_thinking_summary")
        def inline_thinking_summary(item: dict[str, Any]) -> str:
            """Render a concise inline_thinking summary."""
            return self._format_inline_data_summary(item, is_thinking=True)

        @app.template_filter("duration")
        def duration(ms: float) -> str:
            """Format milliseconds as 840 ms, 2.41 s or 1 min 5 s."""
            return self._format_duration(ms)

        @app.template_filter("thousands")
        def thousands(value: int) -> str:
            """Group a count's digits by thousands."""
            return f"{value:,}"

        @app.template_filter("embedding_preview")
        def embedding_preview(item: dict[str, Any]) -> str:
            """Render the first five embedding values."""
            return self._format_embedding_preview(item)

        # The page bodies; _page wraps each in the head, top bar and script every page shares.
        DIRECTORY_TEMPLATE = """
        <main class="page">
            <div class="page-head">
                <div>
                    <h1>{{ title }}</h1>
                    <p class="page-meta"><span>{{ items|length }} {{ 'entry' if items|length == 1 else 'entries' }}</span></p>
                </div>
                <div class="segmented" role="group" aria-label="Sort by">
                    <a href="{{ sort_name_url }}"{% if current_sort == 'name' %} aria-current="true"{% endif %}>Name</a>
                    <a href="{{ sort_mtime_url }}"{% if current_sort == 'mtime' %} aria-current="true"{% endif %}>Modified</a>
                </div>
            </div>
            <div class="card list">
                {% for item in items %}
                <a class="row" href="{{ item.url }}">
                    <span class="row-icon{% if item.is_dir %} dir{% endif %}">{% if item.is_dir %}{{ icons.folder|safe }}{% else %}{{ icons.file|safe }}{% endif %}</span>
                    <span class="row-name">{{ item.name }}</span>
                    <span class="row-size">{{ item.size or '' }}</span>
                    <span class="row-time">{{ item.mtime }}</span>
                </a>
                {% else %}
                <div class="empty">No traces here yet. Requests with a <code>trace_id</code> in their config are saved here.</div>
                {% endfor %}
            </div>
        </main>
        """

        JSON_VIEWER_TEMPLATE = """
        {% set total_rounds = ((history|length) + 1) // 2 %}
        <div class="viewer">
            <main class="page">
                <div class="page-head">
                    <div>
                        <h1>{{ filename }}</h1>
                        <p class="page-meta">
                            {% if config.model %}<span class="mono"><b>{{ config.model }}</b></span>{% endif %}
                            <span>{{ history|length }} {{ 'message' if history|length == 1 else 'messages' }}</span>
                            <span>{{ total_rounds }} {{ 'round' if total_rounds == 1 else 'rounds' }}</span>
                            {% if saved_at %}<span>Saved {{ saved_at }}</span>{% endif %}
                        </p>
                    </div>
                    <a class="ghost-btn" href="{{ back_url }}">{{ icons.back|safe }}Back</a>
                </div>

                {% if config %}
                <section class="card config">
                    <div class="card-head">Configuration</div>
                    <dl class="kv">
                        {% for key, value in config.items() %}{% if key != 'trace_id' %}
                        <div class="kv-row"><dt>{{ key }}</dt><dd>{% if key == 'system_prompt' and value is not none %}<details class="fold"><summary>Show {{ icons.chevron|safe }}</summary><pre>{{ value }}</pre></details>{% elif key == 'tools' and value is iterable and value is not string %}<details class="fold"><summary>{{ value|length }} {{ 'tool' if value|length == 1 else 'tools' }} {{ icons.chevron|safe }}</summary><pre>{{ value|tojson(indent=2) }}</pre></details>{% elif value is string %}{{ value }}{% else %}{{ value|tojson }}{% endif %}</dd></div>
                        {% endif %}{% endfor %}
                    </dl>
                </section>
                {% endif %}

                {% for msg_idx, message in enumerate(history) %}
                <details class="card msg-card" id="msg-{{ msg_idx }}" open>
                    <summary class="msg-summary">
                        <span class="role role-{{ message.role }}">{{ message.role }}</span>
                        <span>{{ message.content_items|length }} {{ 'item' if message.content_items|length == 1 else 'items' }}</span>
                        <span>Round {{ msg_idx // 2 + 1 }} / {{ total_rounds }}</span>
                        <span class="spacer"></span>
                        {% if msg_idx > 0 and message.created_at and history[msg_idx - 1].created_at %}
                        <span class="num" title="Time since the message before">{{ (message.created_at - history[msg_idx - 1].created_at)|abs|duration }}</span>
                        {% endif %}
                        {% if message.created_at %}<span class="num">{{ message.created_at|format_ts }}</span>{% endif %}
                        {{ icons.chevron|safe }}
                    </summary>
                    <div class="msg-body">
                        {% for item in message.content_items %}
                        <div class="item">
                            <div class="item-type">{{ item.type }}</div>
                            {% if item.type == 'text.done' %}
                            <div class="item-text">{{ item.text }}</div>
                            {% elif item.type == 'thinking.done' %}
                            {% if item.thinking|trim %}<div class="item-thinking">{{ item.thinking|trim }}</div>{% else %}<div class="item-note">No text{% if item.fidelity %}, only fidelity{% endif %}</div>{% endif %}
                            {% elif item.type == 'inline_thinking.done' %}
                            <div class="item-note">{{ item|inline_thinking_summary }}</div>
                            {% if item.mime_type and item.mime_type.startswith('image/') %}<img class="item-img" src="{{ item|inline_data_url }}" alt="Thinking image">{% endif %}
                            {% elif item.type == 'tool_call.done' %}
                            <div class="tool"><div class="tool-head"><span class="tool-icon">{{ icons.tool|safe }}</span><span class="tool-sig">{{ item.name }}({% for key, value in item.arguments.items() %}{{ key }}="{{ value }}"{% if not loop.last %}, {% endif %}{% endfor %})</span><span class="tool-id">{{ item.tool_call_id }}</span></div></div>
                            {% elif item.type == 'tool_result.done' %}
                            <div class="result">
                                <div class="result-head"><span class="result-icon">{{ icons.result|safe }}</span><span>Result</span><span class="tool-id">{{ item.tool_call_id }}</span></div>
                                <div class="result-text">{{ item.text }}</div>
                                {% if item.images %}<div class="item-images">{% for image_url in item.images %}<img class="item-img" src="{{ image_url }}" alt="Tool result image">{% endfor %}</div>{% endif %}
                            </div>
                            {% elif item.type == 'image_url.done' %}
                            <img class="item-img" src="{{ item.image_url }}" alt="Image">
                            {% elif item.type == 'inline_data.done' %}
                            <div class="item-note">{{ item|inline_data_summary }}</div>
                            {% if item.mime_type and item.mime_type.startswith('image/') %}
                            <img class="item-img" src="{{ item|inline_data_url }}" alt="Inline image">
                            {% elif item.mime_type and item.mime_type.startswith('audio/') %}
                            <audio class="item-audio" controls preload="metadata"><source src="{{ item|inline_data_url }}"></audio>
                            {% endif %}
                            {% elif item.type == 'embedding.done' %}
                            <div class="embedding">{{ item|embedding_preview }}</div>
                            {% endif %}
                        </div>
                        {% endfor %}

                        {% if message.usage_metadata or message.finish_reason %}
                        <div class="msg-foot">
                            {% if message.finish_reason %}<span class="reason reason-{{ message.finish_reason }}" title="Finish reason">{{ message.finish_reason }}</span>{% endif %}
                            {% if message.usage_metadata %}
                            {% set usage = message.usage_metadata %}
                            <span class="usage" title="Token usage">
                                {% if usage.cached_tokens %}<span>Cached <b>{{ usage.cached_tokens|thousands }}</b></span>{% endif %}
                                {% if usage.prompt_tokens %}<span>Prompt <b>{{ usage.prompt_tokens|thousands }}</b></span>{% endif %}
                                {% if usage.thoughts_tokens %}<span>Thoughts <b>{{ usage.thoughts_tokens|thousands }}</b></span>{% endif %}
                                {% if usage.response_tokens %}<span>Response <b>{{ usage.response_tokens|thousands }}</b></span>{% endif %}
                                <span>Total <b>{{ ((usage.cached_tokens or 0) + (usage.prompt_tokens or 0) + (usage.thoughts_tokens or 0) + (usage.response_tokens or 0))|thousands }}</b></span>
                            </span>
                            {% endif %}
                        </div>
                        {% endif %}
                    </div>
                </details>
                {% endfor %}
            </main>

            <aside class="rail" aria-label="Rounds">
                <div class="rail-inner">
                    <div class="rail-title">Rounds ({{ total_rounds }})</div>
                    <ol class="rail-list">
                        {% for round_idx in range(total_rounds) %}
                        {% set curr_idx = round_idx * 2 + 1 %}
                        {% set prev_idx = round_idx * 2 - 1 %}
                        <li><a href="#msg-{{ round_idx * 2 }}">Round {{ round_idx + 1 }}{% if round_idx > 0 and curr_idx < history|length and history[curr_idx].created_at and history[prev_idx].created_at %}<span>{{ (history[curr_idx].created_at - history[prev_idx].created_at)|abs|duration }}</span>{% endif %}</a></li>
                        {% endfor %}
                    </ol>
                </div>
            </aside>
        </div>
        """

        TEXT_VIEWER_TEMPLATE = """
        <main class="page">
            <div class="page-head">
                <div>
                    <h1>{{ filename }}</h1>
                    <p class="page-meta"><span>Plain-text transcript</span></p>
                </div>
                <a class="ghost-btn" href="{{ back_url }}">{{ icons.back|safe }}Back</a>
            </div>
            <pre class="card text-file">{{ content }}</pre>
        </main>
        """

        @app.route("/")
        @app.route("/<path:subpath>")
        def browse(subpath: str = "") -> str | Response:
            """Browse files and directories in the cache folder."""
            full_path = self.cache_dir / subpath
            full_path = full_path.resolve()

            # Security check: ensure path is within cache_dir
            if not str(full_path).startswith(str(self.cache_dir.resolve())):
                return "Access denied", 403

            # If path doesn't exist
            if not full_path.exists():
                return "Path not found", 404

            # If it's a file, display its content
            if full_path.is_file():
                try:
                    parts = subpath.split("/") if subpath else []
                    breadcrumb = self._breadcrumb(base_path, parts)

                    # Determine back URL
                    back_url = self._prefix_url(
                        base_path,
                        "/" + "/".join(parts[:-1]) if len(parts) > 1 else "/",
                    )

                    # If it's a JSON file, render with the JSON viewer
                    if full_path.suffix == ".json":
                        with open(full_path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        # trace files written before 0.5.0 carry the legacy content item types
                        history = normalize_legacy_messages(data.get("history", []))

                        body = render_template_string(
                            JSON_VIEWER_TEMPLATE,
                            filename=full_path.name,
                            back_url=back_url,
                            history=history,
                            config=data.get("config", {}),
                            saved_at=(data.get("timestamp") or "")[:19].replace("T", " "),
                            icons=_ICONS,
                            enumerate=enumerate,
                        )
                        return self._page(f"{full_path.name} - MMSP Tracer", root_url, breadcrumb, body)
                    else:
                        # For text files, use simple viewer
                        with open(full_path, "r", encoding="utf-8") as f:
                            content = f.read()

                        body = render_template_string(
                            TEXT_VIEWER_TEMPLATE,
                            filename=full_path.name,
                            content=content,
                            back_url=back_url,
                            icons=_ICONS,
                        )
                        return self._page(f"{full_path.name} - MMSP Tracer", root_url, breadcrumb, body)
                except Exception as e:
                    return f"Error reading file: {str(e)}", 500

            # If it's a directory, list its contents
            sort_by = request.args.get("sort", "name")
            if sort_by not in ("name", "mtime"):
                sort_by = "name"

            items = []
            try:
                with os.scandir(full_path) as scanner:
                    raw_entries = [entry for entry in scanner if entry.name != ".DS_Store"]

                # Filter entries that pass the security check first
                safe_entries: list[tuple[os.DirEntry, Path]] = []
                for entry in raw_entries:
                    try:
                        relative_path = Path(entry.path).resolve().relative_to(self.cache_dir.resolve())
                        safe_entries.append((entry, relative_path))
                    except ValueError:
                        # If relative_to fails, skip this entry for security
                        continue

                # Pre-compute stat for each safe entry exactly once
                entry_stats = {entry.name: entry.stat() for entry, _ in safe_entries}

                if sort_by == "mtime":
                    safe_entries.sort(key=lambda x: (not x[0].is_dir(), -entry_stats[x[0].name].st_mtime))
                else:
                    safe_entries.sort(key=lambda x: (not x[0].is_dir(), x[0].name))

                for entry, relative_path in safe_entries:
                    stat = entry_stats[entry.name]
                    item_info: dict[str, Any] = {
                        "name": entry.name,
                        "is_dir": entry.is_dir(),
                        "url": self._prefix_url(base_path, f"/{relative_path}"),
                        "mtime": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                    }
                    if entry.is_file():
                        size = stat.st_size
                        if size < 1024:
                            item_info["size"] = f"{size} B"
                        elif size < 1024 * 1024:
                            item_info["size"] = f"{size / 1024:.1f} KB"
                        else:
                            item_info["size"] = f"{size / (1024 * 1024):.1f} MB"
                    items.append(item_info)
            except Exception as e:
                return f"Error listing directory: {str(e)}", 500

            parts = [part for part in subpath.split("/") if part] if subpath else []
            breadcrumb = self._breadcrumb(base_path, parts)

            base_url = self._prefix_url(base_path, "/" + subpath if subpath else "/")
            sort_name_url = base_url + "?sort=name"
            sort_mtime_url = base_url + "?sort=mtime"

            body = render_template_string(
                DIRECTORY_TEMPLATE,
                title=parts[-1] if parts else "Traces",
                items=items,
                current_sort=sort_by,
                sort_name_url=sort_name_url,
                sort_mtime_url=sort_mtime_url,
                icons=_ICONS,
            )
            return self._page(f"{parts[-1] if parts else 'Traces'} - MMSP Tracer", root_url, breadcrumb, body)

        return app

    def start_web_server(self, host: str = "127.0.0.1", port: int = 25750, debug: bool = False) -> None:
        """
        Start the web server for browsing conversation files.

        Args:
            host: Host address to bind to
            port: Port number to listen on
            debug: Enable debug mode
        """
        app = self.create_web_app()
        print(f"Starting tracer web server at http://{host}:{port}")
        print(f"Cache directory: {self.cache_dir.resolve()}")
        app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Start the Tracer web server for browsing conversation files")
    parser.add_argument("--cache_dir", type=str, default=None, help="Directory to store conversation history files")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host address to bind to")
    parser.add_argument("--port", type=int, default=25750, help="Port number to listen on")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")

    args = parser.parse_args()

    tracer = Tracer(cache_dir=args.cache_dir)
    tracer.start_web_server(host=args.host, port=args.port, debug=args.debug)
