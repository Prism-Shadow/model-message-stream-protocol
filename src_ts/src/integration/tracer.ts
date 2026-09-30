// Copyright 2025 Prism Shadow. and/or its affiliates
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Conversation tracer module for saving and viewing conversation history.
 *
 * This module provides functionality to save conversation history to local files
 * and serve them via a web interface for real-time monitoring.
 */

import * as fs from "fs";
import * as path from "path";
import express, { Express, Request, Response } from "express";
import { normalizeLegacyMessages } from "../legacy";
import { UniConfig, UniMessage } from "../types";

// The head every tracer page shares: the playground's tokens, fonts and light and dark themes.
const TRACER_HEAD = `
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
        --indigo: #4a57c9;
        --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(20, 22, 28, 0.04);
        --shadow-menu: 0 0 0 1px var(--ring), 0 12px 32px -10px rgba(20, 22, 28, 0.22);
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
            --indigo: #8d97f2;
            --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.3);
            --shadow-menu: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 36px -10px rgba(0, 0, 0, 0.7);
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
        --indigo: #8d97f2;
        --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.3);
        --shadow-menu: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 36px -10px rgba(0, 0, 0, 0.7);
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

    .page-nav {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 20px;
    }

    .nav-buttons {
        display: flex;
        flex: none;
        gap: 2px;
    }

    .nav-btn {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        color: var(--muted);
        transition: color 0.15s, background-color 0.15s;
    }

    .nav-btn:hover {
        color: var(--text);
        background: var(--hover);
    }

    .nav-btn:disabled, .nav-btn[aria-disabled="true"] {
        color: var(--subtle);
        opacity: 0.45;
        cursor: default;
        pointer-events: none;
    }

    .address {
        display: flex;
        align-items: center;
        gap: 2px;
        flex: 1;
        min-width: 0;
        height: 34px;
        padding: 0 6px;
        overflow: hidden;
        border-radius: 8px;
        background: var(--surface);
        box-shadow: var(--shadow-card);
        font-size: 13px;
        white-space: nowrap;
    }

    .address-icon {
        display: grid;
        place-items: center;
        flex: none;
        width: 24px;
        color: var(--subtle);
    }

    .crumb {
        flex: none;
        padding: 3px 6px;
        border-radius: 5px;
        color: var(--muted);
        transition: color 0.15s, background-color 0.15s;
    }

    a.crumb:hover {
        color: var(--text);
        background: var(--hover);
    }

    .crumb-current {
        flex: 0 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text);
        font-weight: 500;
    }

    .crumb-sep {
        display: grid;
        place-items: center;
        flex: none;
        color: var(--subtle);
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

    .rail {
        position: fixed;
        top: 76px;
        right: 20px;
        z-index: 20;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
    }

    .rail-toggle {
        display: none;
        align-items: center;
        gap: 8px;
        height: 32px;
        padding: 0 10px 0 12px;
        border-radius: 999px;
        background: var(--surface);
        box-shadow: var(--shadow-menu);
        color: var(--muted);
        font-size: 12.5px;
        font-weight: 500;
    }

    .rail-toggle .mono {
        color: var(--text);
        font-size: 12px;
    }

    .rail-panel {
        width: 200px;
        max-height: calc(100vh - 120px);
        overflow-y: auto;
        padding: 12px 12px 10px;
        border-radius: 12px;
        background: color-mix(in srgb, var(--surface) 92%, transparent);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        box-shadow: var(--shadow-menu);
    }

    @keyframes panel-in {
        from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
        }
    }

    .rail-title {
        margin-bottom: 8px;
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
        padding: 4px 0 4px 12px;
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

    @media (max-width: 1400px) {
        .rail-toggle {
            display: inline-flex;
        }

        .rail-panel {
            display: none;
        }

        .rail.open .rail-panel {
            display: block;
            transform-origin: top right;
            animation: panel-in 0.18s var(--ease);
        }

        .rail.open .rail-toggle .chevron {
            transform: rotate(180deg);
        }
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
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .role-user { color: var(--accent); }
    .role-assistant { color: var(--green); }

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

    .item {
        --k: var(--subtle);
        padding: 9px 14px 12px;
        border-radius: 8px;
        background: color-mix(in srgb, var(--k) 7%, var(--surface));
        box-shadow: inset 3px 0 0 var(--k);
    }

    .item + .item {
        margin-top: 10px;
    }

    .kind-text { --k: var(--subtle); }
    .kind-thinking, .kind-inline_thinking { --k: var(--accent); }
    .kind-tool_call { --k: var(--amber); }
    .kind-tool_result { --k: var(--green); }
    .kind-image_url, .kind-inline_data { --k: var(--violet); }
    .kind-embedding { --k: var(--indigo); }

    .item-head {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 5px;
    }

    .item-type {
        color: var(--k);
        font-family: var(--mono);
        font-size: 11px;
        font-weight: 500;
    }

    .item-id {
        margin-left: auto;
        color: var(--subtle);
        font-family: var(--mono);
        font-size: 11px;
        white-space: nowrap;
    }

    .item-text {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        line-height: 1.65;
    }

    .item-thinking {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .item-note {
        color: var(--subtle);
        font-family: var(--mono);
        font-size: 12px;
    }

    .item-note + * {
        margin-top: 8px;
    }

    .item-img {
        display: block;
        max-width: min(100%, 360px);
        max-height: 280px;
        border-radius: 8px;
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

    .tool-sig, .result-text, .embedding {
        font-family: var(--mono);
        font-size: 12.5px;
        line-height: 1.6;
        white-space: pre-wrap;
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

    @media (max-width: 640px) {
        .topbar {
            gap: 10px;
            padding: 0 12px;
        }

        .label-wide {
            display: none;
        }

        .page {
            padding: 24px 16px 48px;
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

        .nav-btn.forward {
            display: none;
        }

        .rail {
            top: auto;
            bottom: 16px;
            right: 16px;
            flex-direction: column-reverse;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
        }
    }
</style>
`;

const TRACER_SCRIPT = `
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

    // back and forward grey out, as in a file explorer, when the history has nowhere to go
    (function () {
        const back = document.getElementById('navBack');
        const forward = document.getElementById('navForward');
        const navigation = window.navigation;
        if (back) {
            back.disabled = navigation ? !navigation.canGoBack : history.length <= 1;
        }
        if (forward && navigation) {
            forward.disabled = !navigation.canGoForward;
        }
    })();

    function toggleRail(open) {
        const rail = document.getElementById('rail');
        const isOpen = typeof open === 'boolean' ? open : !rail.classList.contains('open');
        rail.classList.toggle('open', isOpen);
        rail.querySelector('.rail-toggle').setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    document.addEventListener('click', function (event) {
        const rail = document.getElementById('rail');
        if (rail && rail.classList.contains('open') && !rail.contains(event.target)) {
            toggleRail(false);
        }
    });

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
            const current = document.getElementById('railCurrent');
            if (current) {
                current.textContent = (active + 1) + ' / ' + railLinks.length;
            }
        };
        railLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                toggleRail(false);
            });
        });
        window.addEventListener('scroll', markActive, { passive: true });
        markActive();
    }
</script>
`;

const ICONS = {
  github:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"></path></svg>',
  sun: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>',
  moon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path></svg>',
  folder:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"></path></svg>',
  file: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"></path><path d="M14 3v5h5M9 13h6M9 17h4"></path></svg>',
  chevron:
    '<svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>',
  arrow_left:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>',
  arrow_right:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>',
  arrow_up:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"></path></svg>',
  crumb:
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>',
};

/**
 * Tracer for saving conversation history to local files.
 *
 * This class handles saving conversation history to files in a cache directory.
 */
export class Tracer {
  private cacheDir: string;

  /**
   * Initialize the tracer.
   *
   * @param cacheDir - Directory to store conversation history files
   */
  constructor(cacheDir?: string) {
    this.cacheDir = path.resolve(
      cacheDir || process.env.MMSP_CACHE_DIR || "cache",
    );
    this._ensureDirectoryExists(this.cacheDir);
  }

  /**
   * Ensure directory exists, create if it doesn't.
   *
   * @param dirPath - Directory path to create
   */
  private _ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Recursively serialize objects for JSON, converting Buffer to base64.
   *
   * @param obj - Object to serialize
   * @returns JSON-serializable object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _serializeForJson(obj: any): any {
    if (Buffer.isBuffer(obj)) {
      return obj.toString("base64");
    } else if (obj && typeof obj === "object") {
      if (Array.isArray(obj)) {
        return obj.map((item) => this._serializeForJson(item));
      } else {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = this._serializeForJson(value);
        }
        return result;
      }
    }
    return obj;
  }

  /**
   * Return whether browsers can usually play this MIME type directly.
   *
   * @param mimeType - MIME type to inspect
   * @returns Whether the browser can typically play the audio type
   */
  private _isBrowserPlayableAudioMimeType(mimeType?: string): boolean {
    return new Set([
      "audio/wav",
      "audio/x-wav",
      "audio/mpeg",
      "audio/mp3",
      "audio/ogg",
      "audio/webm",
      "audio/flac",
      "audio/aac",
      "audio/mp4",
    ]).has((mimeType || "").toLowerCase());
  }

  /**
   * Decode an inline_data payload to raw bytes.
   *
   * @param item - inline_data content item
   * @returns Raw payload bytes
   */
  private _decodeInlineData(item: { data?: Buffer | string }): Buffer {
    if (typeof item.data === "string") {
      return Buffer.from(item.data, "base64");
    }
    return item.data || Buffer.alloc(0);
  }

  /**
   * Wrap raw PCM bytes in a WAV header using Gemini TTS defaults.
   *
   * @param item - inline_data content item
   * @returns WAV bytes
   */
  private _buildWaveBytesFromPcm(item: { data?: Buffer | string }): Buffer {
    const pcmBytes = this._decodeInlineData(item);
    const channels = 1;
    const sampleRate = 24000;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * channels * bitsPerSample) / 8;
    const blockAlign = (channels * bitsPerSample) / 8;
    const header = Buffer.alloc(44);

    header.write("RIFF", 0, "ascii");
    header.writeUInt32LE(36 + pcmBytes.length, 4);
    header.write("WAVE", 8, "ascii");
    header.write("fmt ", 12, "ascii");
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36, "ascii");
    header.writeUInt32LE(pcmBytes.length, 40);

    return Buffer.concat([header, pcmBytes]);
  }

  /**
   * Format inline_data metadata without emitting raw payloads.
   *
   * @param item - inline_data content item
   * @returns Human-readable summary of the inline payload
   */
  private _formatInlineDataSummary(
    item: {
      mime_type?: string;
      data?: Buffer | string;
    },
    isThinking?: boolean,
  ): string {
    const mimeType = item.mime_type || "application/octet-stream";
    const data = item.data;

    let byteCount = 0;
    if (typeof data === "string") {
      byteCount = Buffer.from(data, "base64").length;
    } else if (Buffer.isBuffer(data)) {
      byteCount = data.length;
    }

    const kbCount = byteCount / 1024;
    const mbCount = byteCount / (1024 * 1024);

    let label = isThinking ? "Thinking " : "";
    if (mimeType.startsWith("image/")) {
      label += "Inline Image";
    } else if (mimeType.startsWith("audio/")) {
      label += "Inline Audio";
    } else {
      label += "Inline Data";
    }

    if (kbCount < 1000) {
      return `${label}: ${mimeType} (${kbCount.toFixed(2)} KB)`;
    }
    return `${label}: ${mimeType} (${mbCount.toFixed(2)} MB)`;
  }

  private _formatEmbeddingPreview(item: { embedding?: number[] }): string {
    const preview = (item.embedding || [])
      .slice(0, 5)
      .map((value) => String(value))
      .join(", ");
    return `Embedding: [${preview}]`;
  }

  /**
   * Build a data URL for inline_data content.
   *
   * @param item - inline_data content item
   * @returns Data URL string
   */
  private _inlineDataUrl(item: {
    mime_type?: string;
    data?: Buffer | string;
  }): string {
    const mimeType = item.mime_type || "application/octet-stream";
    let rawBytes = this._decodeInlineData(item);
    let normalizedMimeType = mimeType;

    if (mimeType.startsWith("audio/")) {
      if (!this._isBrowserPlayableAudioMimeType(mimeType)) {
        normalizedMimeType = "audio/wav";
        rawBytes = this._buildWaveBytesFromPcm(item);
      }
      return `data:${normalizedMimeType};base64,${rawBytes.toString("base64")}`;
    }

    return `data:${normalizedMimeType};base64,${rawBytes.toString("base64")}`;
  }

  /**
   * Return whether inline_data should be rendered as audio.
   *
   * @param item - inline_data content item
   * @returns Whether the payload is audio
   */
  private _inlineDataIsAudio(item: { mime_type?: string }): boolean {
    return (item.mime_type || "").toLowerCase().startsWith("audio/");
  }

  /**
   * Return the browser-facing audio MIME type after any WAV fallback.
   *
   * @param item - inline_data content item
   * @returns Playable audio MIME type
   */
  private _inlineDataAudioType(item: { mime_type?: string }): string {
    const mimeType = item.mime_type || "application/octet-stream";
    if (this._isBrowserPlayableAudioMimeType(mimeType)) {
      return mimeType;
    }
    return "audio/wav";
  }

  /**
   * Save conversation history to files.
   *
   * @param history - List of UniMessage objects representing the conversation
   * @param fileId - File identifier without extension (e.g., "agent1/00001")
   * @param config - The UniConfig used for this conversation
   */
  saveHistory(
    model: string,
    history: UniMessage[],
    fileId: string,
    config: UniConfig,
  ): void {
    const filePathBase = path.join(this.cacheDir, fileId);
    const dirPath = path.dirname(filePathBase);
    this._ensureDirectoryExists(dirPath);

    const configWithModel: UniConfig & { model: string } = {
      ...(config as UniConfig),
      model,
    };

    const jsonPath = filePathBase + ".json";
    const jsonData = {
      history: this._serializeForJson(history),
      config: this._serializeForJson(configWithModel),
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");

    const txtPath = filePathBase + ".txt";
    const formattedContent = this._formatHistory(history, configWithModel);
    fs.writeFileSync(txtPath, formattedContent, "utf-8");
  }

  /**
   * Format conversation history in a readable text format.
   *
   * @param history - List of UniMessage objects
   * @param config - The UniConfig used for this conversation
   * @returns Formatted string representation of the conversation
   */
  private _formatHistory(history: UniMessage[], config: UniConfig): string {
    const lines: string[] = [];
    lines.push("=".repeat(80));
    lines.push(`Conversation History - ${new Date().toLocaleString()}`);
    lines.push("=".repeat(80));
    lines.push("");

    lines.push("Configuration:");
    for (const [key, value] of Object.entries(config)) {
      if (key !== "trace_id") {
        if (key === "tools" && Array.isArray(value)) {
          lines.push(`  ${key}:`);
          lines.push(`    ${JSON.stringify(value, null, 2)}`);
        } else {
          lines.push(`  ${key}: ${value}`);
        }
      }
    }
    lines.push("");

    for (let i = 0; i < history.length; i++) {
      const message = history[i];
      const role = message.role.toUpperCase();
      lines.push(`[${i + 1}] ${role}:`);
      lines.push("-".repeat(80));

      for (const item of message.content_items) {
        if (item.type === "text.done") {
          lines.push(`Text: ${item.text}`);
        } else if (item.type === "thinking.done") {
          lines.push(`Thinking: ${item.thinking}`);
        } else if (item.type === "inline_thinking.done") {
          lines.push(this._formatInlineDataSummary(item, true));
        } else if (item.type === "image_url.done") {
          lines.push(`Image URL: ${item.image_url}`);
        } else if (item.type === "inline_data.done") {
          lines.push(this._formatInlineDataSummary(item));
        } else if (item.type === "embedding.done") {
          lines.push(this._formatEmbeddingPreview(item));
        } else if (item.type === "tool_call.done") {
          lines.push(`Tool Call: ${item.name}`);
          lines.push(`  Arguments: ${JSON.stringify(item.arguments, null, 2)}`);
          lines.push(`  Tool Call ID: ${item.tool_call_id}`);
        } else if (item.type === "tool_result.done") {
          lines.push(`Tool Result (ID: ${item.tool_call_id}): ${item.text}`);
          if (item.images && item.images.length > 0) {
            item.images.forEach((imageUrl, i) => {
              lines.push(`  Image ${i + 1}: ${imageUrl}`);
            });
          }
        }
      }

      if (message.usage_metadata) {
        const metadata = message.usage_metadata;
        lines.push("\nUsage Metadata:");
        if (metadata.cached_tokens !== null) {
          lines.push(`  Cached Tokens: ${metadata.cached_tokens}`);
        }
        if (metadata.prompt_tokens !== null) {
          lines.push(`  Prompt Tokens: ${metadata.prompt_tokens}`);
        }
        if (metadata.thoughts_tokens !== null) {
          lines.push(`  Thoughts Tokens: ${metadata.thoughts_tokens}`);
        }
        if (metadata.response_tokens !== null) {
          lines.push(`  Response Tokens: ${metadata.response_tokens}`);
        }

        const inputTokens =
          (metadata.cached_tokens || 0) + (metadata.prompt_tokens || 0);
        const outputTokens =
          (metadata.thoughts_tokens || 0) + (metadata.response_tokens || 0);
        const totalTokens = inputTokens + outputTokens;
        lines.push(`  Total Tokens: ${totalTokens}`);
      }

      if (message.finish_reason) {
        lines.push(`\nFinish Reason: ${message.finish_reason}`);
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Create an Express web application for browsing conversation files.
   *
   * @returns Express application instance
   */
  createWebApp(options: { basePath?: string } = {}): Express {
    const app = express();
    const basePath = this._normalizeBasePath(options.basePath);
    const rootUrl = this._prefixUrl(basePath, "/");
    const esc = (value: unknown) => this._escapeHtml(String(value));
    const plural = (count: number, one: string, many: string) =>
      `${count} ${count === 1 ? one : many}`;

    app.get("*", (req: Request, res: Response) => {
      const subpath = req.path.slice(1);
      const fullPath = path.resolve(path.join(this.cacheDir, subpath));

      if (!fullPath.startsWith(path.resolve(this.cacheDir))) {
        return res.status(403).send("Access denied");
      }

      if (!fs.existsSync(fullPath)) {
        return res.status(404).send("Path not found");
      }

      if (fs.statSync(fullPath).isFile()) {
        try {
          const parts = subpath ? subpath.split("/") : [];
          const breadcrumb = this._breadcrumb(basePath, parts);
          const backUrl = this._prefixUrl(
            basePath,
            parts.length > 1 ? "/" + parts.slice(0, -1).join("/") : "/",
          );
          const filename = path.basename(fullPath);
          const pageHead = (meta: string) => `
        ${this._nav(breadcrumb, backUrl, true)}
        <div class="page-head">
            <div>
                <h1>${esc(filename)}</h1>
                <p class="page-meta">${meta}</p>
            </div>
        </div>`;

          if (!fullPath.endsWith(".json")) {
            const content = fs.readFileSync(fullPath, "utf-8");
            const body = `
    <main class="page">${pageHead("<span>Plain-text transcript</span>")}
        <pre class="card text-file">${esc(content)}</pre>
    </main>`;
            return res.send(
              this._page(`${filename} - MMSP Tracer`, rootUrl, body),
            );
          }

          const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          const config: Record<string, unknown> = data.config || {};
          // trace files written before 0.5.0 carry the legacy content item types
          const history = normalizeLegacyMessages(data.history || []);
          const totalRounds = Math.ceil(history.length / 2);
          // Python saves the time local and TypeScript in UTC; both show local
          const savedMs = Date.parse(data.timestamp || "");
          const savedAt = Number.isNaN(savedMs)
            ? String(data.timestamp || "")
            : this._formatTimestamp(savedMs);

          const metaParts: string[] = [];
          if (config.model) {
            metaParts.push(
              `<span class="mono"><b>${esc(config.model)}</b></span>`,
            );
          }
          metaParts.push(
            `<span>${plural(history.length, "message", "messages")}</span>`,
          );
          metaParts.push(
            `<span>${plural(totalRounds, "round", "rounds")}</span>`,
          );
          if (savedAt) {
            metaParts.push(`<span>Saved ${esc(savedAt)}</span>`);
          }

          const configRows = Object.entries(config)
            .filter(([key]) => key !== "trace_id")
            .map(([key, value]) => {
              let valueHtml: string;
              if (key === "system_prompt" && value != null) {
                valueHtml = `<details class="fold"><summary>Show ${ICONS.chevron}</summary><pre>${esc(value)}</pre></details>`;
              } else if (key === "tools" && Array.isArray(value)) {
                valueHtml = `<details class="fold"><summary>${plural(value.length, "tool", "tools")} ${ICONS.chevron}</summary><pre>${esc(JSON.stringify(value, null, 2))}</pre></details>`;
              } else if (typeof value === "string") {
                valueHtml = esc(value);
              } else {
                valueHtml = esc(JSON.stringify(value));
              }
              return `
                <div class="kv-row"><dt>${esc(key)}</dt><dd>${valueHtml}</dd></div>`;
            })
            .join("");
          const configHtml = configRows
            ? `
        <section class="card config">
            <div class="card-head">Configuration</div>
            <dl class="kv">${configRows}
            </dl>
        </section>`
            : "";

          const messagesHtml = history
            .map((msg: UniMessage, idx: number) => {
              const itemsHtml = msg.content_items
                .map((item) => {
                  let inner = "";
                  if (item.type === "text.done") {
                    inner = `<div class="item-text">${esc(item.text)}</div>`;
                  } else if (item.type === "thinking.done") {
                    inner = item.thinking.trim()
                      ? `<div class="item-thinking">${esc(item.thinking.trim())}</div>`
                      : `<div class="item-note">No text${item.fidelity ? ", only fidelity" : ""}</div>`;
                  } else if (item.type === "inline_thinking.done") {
                    inner = `<div class="item-note">${esc(this._formatInlineDataSummary(item, true))}</div>`;
                    if (item.mime_type?.startsWith("image/")) {
                      inner += `<img class="item-img" src="${esc(this._inlineDataUrl(item))}" alt="Thinking image">`;
                    }
                  } else if (item.type === "tool_call.done") {
                    const args = Object.entries(item.arguments)
                      .map(([key, value]) => `${esc(key)}="${esc(value)}"`)
                      .join(", ");
                    inner = `<div class="tool-sig">${esc(item.name)}(${args})</div>`;
                  } else if (item.type === "tool_result.done") {
                    const images =
                      item.images && item.images.length > 0
                        ? `<div class="item-images">${item.images
                            .map(
                              (imageUrl) =>
                                `<img class="item-img" src="${esc(imageUrl)}" alt="Tool result image">`,
                            )
                            .join("")}</div>`
                        : "";
                    inner = `<div class="result-text">${esc(item.text)}</div>${images}`;
                  } else if (item.type === "image_url.done") {
                    inner = `<img class="item-img" src="${esc(item.image_url)}" alt="Image">`;
                  } else if (item.type === "inline_data.done") {
                    inner = `<div class="item-note">${esc(this._formatInlineDataSummary(item))}</div>`;
                    if (item.mime_type?.startsWith("image/")) {
                      inner += `<img class="item-img" src="${esc(this._inlineDataUrl(item))}" alt="Inline image">`;
                    } else if (this._inlineDataIsAudio(item)) {
                      inner += `<audio class="item-audio" controls preload="metadata"><source src="${esc(this._inlineDataUrl(item))}" type="${esc(this._inlineDataAudioType(item))}"></audio>`;
                    }
                  } else if (item.type === "embedding.done") {
                    inner = `<div class="embedding">${esc(this._formatEmbeddingPreview(item))}</div>`;
                  }
                  const callId =
                    item.type === "tool_call.done" ||
                    item.type === "tool_result.done"
                      ? `<span class="item-id">${esc(item.tool_call_id)}</span>`
                      : "";
                  return `
                    <div class="item kind-${esc(item.type.split(".")[0])}">
                        <div class="item-head"><div class="item-type">${esc(item.type)}</div>${callId}</div>
                        ${inner}
                    </div>`;
                })
                .join("");

              let footHtml = "";
              if (msg.usage_metadata || msg.finish_reason) {
                footHtml = `
                    <div class="msg-foot">`;
                if (msg.finish_reason) {
                  footHtml += `<span class="reason reason-${esc(msg.finish_reason)}" title="Finish reason">${esc(msg.finish_reason)}</span>`;
                }
                const usage = msg.usage_metadata;
                if (usage) {
                  const parts: string[] = [];
                  const add = (label: string, value?: number | null) => {
                    if (value) {
                      parts.push(
                        `<span>${label} <b>${this._formatCount(value)}</b></span>`,
                      );
                    }
                  };
                  add("Cached", usage.cached_tokens);
                  add("Prompt", usage.prompt_tokens);
                  add("Thoughts", usage.thoughts_tokens);
                  add("Response", usage.response_tokens);
                  const total =
                    (usage.cached_tokens || 0) +
                    (usage.prompt_tokens || 0) +
                    (usage.thoughts_tokens || 0) +
                    (usage.response_tokens || 0);
                  parts.push(
                    `<span>Total <b>${this._formatCount(total)}</b></span>`,
                  );
                  footHtml += `<span class="usage" title="Token usage">${parts.join("")}</span>`;
                }
                footHtml += "</div>";
              }

              const prevMsg = idx > 0 ? history[idx - 1] : null;
              const tookHtml =
                prevMsg && msg.created_at && prevMsg.created_at
                  ? `<span class="num" title="Time since the message before">${this._formatDuration(Math.abs(msg.created_at - prevMsg.created_at))}</span>`
                  : "";
              const timestampHtml = msg.created_at
                ? `<span class="num">${this._formatTimestamp(msg.created_at)}</span>`
                : "";
              return `
        <details class="card msg-card" id="msg-${idx}" open>
            <summary class="msg-summary">
                <span class="role role-${esc(msg.role)}">${esc(msg.role)}</span>
                <span>${plural(msg.content_items.length, "item", "items")}</span>
                <span>Round ${Math.floor(idx / 2) + 1} / ${totalRounds}</span>
                <span class="spacer"></span>
                ${tookHtml}
                ${timestampHtml}
                ${ICONS.chevron}
            </summary>
            <div class="msg-body">${itemsHtml}${footHtml}
            </div>
        </details>`;
            })
            .join("");

          const body = `
    <main class="page">${pageHead(metaParts.join("\n"))}${configHtml}${messagesHtml}
    </main>
    ${this._buildSidebarHtml(totalRounds, history)}`;
          return res.send(
            this._page(`${filename} - MMSP Tracer`, rootUrl, body),
          );
        } catch (error) {
          return res.status(500).send(`Error reading file: ${error}`);
        }
      }

      try {
        const sortBy = req.query["sort"] === "mtime" ? "mtime" : "name";

        const entries = fs
          .readdirSync(fullPath, { withFileTypes: true })
          .filter((entry) => entry.name !== ".DS_Store");
        const entryStats = new Map<string, fs.Stats>();
        for (const entry of entries) {
          entryStats.set(
            entry.name,
            fs.statSync(path.join(fullPath, entry.name)),
          );
        }
        entries.sort((a: fs.Dirent, b: fs.Dirent) => {
          const aIsDir = a.isDirectory();
          const bIsDir = b.isDirectory();
          if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
          if (sortBy === "mtime") {
            const aMtime = entryStats.get(a.name)!.mtimeMs;
            const bMtime = entryStats.get(b.name)!.mtimeMs;
            return bMtime - aMtime;
          }
          return a.name.localeCompare(b.name);
        });

        const rowsHtml = entries
          .map((entry: fs.Dirent) => {
            const entryPath = path.join(fullPath, entry.name);
            const relativePath = path.relative(this.cacheDir, entryPath);
            const stat = entryStats.get(entry.name)!;
            const isDir = stat.isDirectory();
            let size = "";
            if (!isDir) {
              if (stat.size < 1024) {
                size = `${stat.size} B`;
              } else if (stat.size < 1024 * 1024) {
                size = `${(stat.size / 1024).toFixed(1)} KB`;
              } else {
                size = `${(stat.size / (1024 * 1024)).toFixed(1)} MB`;
              }
            }
            const url = this._prefixUrl(
              basePath,
              "/" + relativePath.replace(/\\/g, "/"),
            );
            return `
            <a class="row" href="${esc(url)}">
                <span class="row-icon${isDir ? " dir" : ""}">${isDir ? ICONS.folder : ICONS.file}</span>
                <span class="row-name">${esc(entry.name)}</span>
                <span class="row-size">${size}</span>
                <span class="row-time">${this._formatTimestamp(stat.mtimeMs)}</span>
            </a>`;
          })
          .join("");

        const parts = subpath ? subpath.split("/").filter(Boolean) : [];
        const title = parts.length ? parts[parts.length - 1] : "Traces";
        const baseUrl = subpath ? "/" + subpath : "/";
        const sortNameUrl = this._prefixUrl(basePath, baseUrl + "?sort=name");
        const sortMtimeUrl = this._prefixUrl(basePath, baseUrl + "?sort=mtime");
        const current = (sort: string) =>
          sortBy === sort ? ' aria-current="true"' : "";

        const body = `
    <main class="page">
        ${this._nav(
          this._breadcrumb(basePath, parts),
          parts.length
            ? this._prefixUrl(basePath, "/" + parts.slice(0, -1).join("/"))
            : undefined,
        )}
        <div class="page-head">
            <div>
                <h1>${esc(title)}</h1>
                <p class="page-meta"><span>${plural(entries.length, "entry", "entries")}</span></p>
            </div>
            <div class="segmented" role="group" aria-label="Sort by">
                <a href="${esc(sortNameUrl)}"${current("name")}>Name</a>
                <a href="${esc(sortMtimeUrl)}"${current("mtime")}>Modified</a>
            </div>
        </div>
        <div class="card list">${
          rowsHtml ||
          `
            <div class="empty">No traces here yet. Requests with a <code>trace_id</code> in their config are saved here.</div>`
        }
        </div>
    </main>`;

        return res.send(this._page(`${title} - MMSP Tracer`, rootUrl, body));
      } catch (error) {
        return res.status(500).send(`Error listing directory: ${error}`);
      }
    });

    return app;
  }

  /**
   * Normalize the base path used when tracer is mounted inside another app.
   *
   * @param basePath - Optional URL prefix for tracer routes
   * @returns Normalized URL prefix without a trailing slash
   */
  private _normalizeBasePath(basePath: string = ""): string {
    if (!basePath || basePath === "/") {
      return "";
    }
    const prefixed = basePath.startsWith("/") ? basePath : "/" + basePath;
    return prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
  }

  /**
   * Prefix an internal tracer URL with the mount path.
   *
   * @param basePath - Normalized tracer mount path
   * @param url - Internal URL beginning with /
   * @returns URL safe to render into tracer links
   */
  private _prefixUrl(basePath: string, url: string): string {
    if (!basePath) {
      return url;
    }
    if (url === "/") {
      return basePath + "/";
    }
    return basePath + url;
  }

  /**
   * Format a Unix timestamp in milliseconds as YYYY-MM-DD HH:MM:SS.
   *
   * @param ms - Unix timestamp in milliseconds
   * @returns Formatted date string
   */
  private _formatTimestamp(ms: number): string {
    const d = new Date(ms);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /**
   * Build the rail that lists the rounds of a trace.
   *
   * @param totalRounds - Total number of rounds
   * @param history - Full message history array
   * @returns HTML string for the rail
   */
  private _buildSidebarHtml(
    totalRounds: number,
    history: UniMessage[],
  ): string {
    let links = "";
    for (let roundIdx = 0; roundIdx < totalRounds; roundIdx++) {
      let tookHtml = "";
      if (roundIdx > 0) {
        const currAssistant = history[roundIdx * 2 + 1];
        const prevAssistant = history[(roundIdx - 1) * 2 + 1];
        if (currAssistant?.created_at && prevAssistant?.created_at) {
          tookHtml = `<span>${this._formatDuration(Math.abs(currAssistant.created_at - prevAssistant.created_at))}</span>`;
        }
      }
      links += `
                <li><a href="#msg-${roundIdx * 2}">Round ${roundIdx + 1}${tookHtml}</a></li>`;
    }
    return `<aside class="rail" id="rail" aria-label="Rounds">
            <button type="button" class="rail-toggle" onclick="toggleRail()" aria-expanded="false">Round <span class="mono" id="railCurrent">1 / ${totalRounds}</span>${ICONS.chevron}</button>
            <div class="rail-panel">
                <div class="rail-title">Rounds (${totalRounds})</div>
                <ol class="rail-list">${links}
                </ol>
            </div>
        </aside>`;
  }

  /**
   * Format milliseconds the way the playground does: 840 ms, 2.41 s, 1 min 5 s.
   *
   * @param ms - Duration in milliseconds
   * @returns Formatted duration
   */
  private _formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${Math.round(ms)} ms`;
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`;
    }
    return `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`;
  }

  /**
   * Group a count's digits by thousands.
   *
   * @param value - Count to format
   * @returns Formatted count
   */
  private _formatCount(value: number): string {
    return value.toLocaleString("en-US");
  }

  /**
   * Build the path from the cache root to the page, every step but the last a link.
   *
   * @param basePath - Normalized tracer mount path
   * @param parts - Path segments below the cache root
   * @returns Breadcrumb HTML
   */
  private _breadcrumb(basePath: string, parts: string[]): string {
    const steps = ["cache", ...parts];
    return steps
      .map((step, i) => {
        if (i === steps.length - 1) {
          return `<span class="crumb crumb-current">${this._escapeHtml(step)}</span>`;
        }
        const url = this._prefixUrl(
          basePath,
          "/" + parts.slice(0, i).join("/"),
        );
        return `<a class="crumb" href="${this._escapeHtml(url)}">${this._escapeHtml(step)}</a>`;
      })
      .join(`<span class="crumb-sep">${ICONS.crumb}</span>`);
  }

  /**
   * Build the bar that opens a page, as in a file explorer: back, forward and up, then the address.
   *
   * @param breadcrumb - Breadcrumb HTML
   * @param upUrl - The parent the up button leads to, if there is one
   * @param isFile - Whether the page shows a file rather than a folder
   * @returns Navigation bar HTML
   */
  private _nav(breadcrumb: string, upUrl?: string, isFile = false): string {
    const up = upUrl
      ? `<a class="nav-btn" href="${this._escapeHtml(upUrl)}" aria-label="Up" title="Up">${ICONS.arrow_up}</a>`
      : `<span class="nav-btn" aria-disabled="true" title="Up">${ICONS.arrow_up}</span>`;
    return (
      '<div class="page-nav"><div class="nav-buttons">' +
      '<button type="button" class="nav-btn" id="navBack" onclick="history.back()" aria-label="Back" ' +
      `title="Back">${ICONS.arrow_left}</button>` +
      '<button type="button" class="nav-btn forward" id="navForward" onclick="history.forward()" ' +
      `aria-label="Forward" title="Forward">${ICONS.arrow_right}</button>` +
      `${up}</div>` +
      `<nav class="address" aria-label="Path"><span class="address-icon">${isFile ? ICONS.file : ICONS.folder}` +
      `</span>${breadcrumb}</nav></div>`
    );
  }

  /**
   * Wrap a page body in the head, top bar and script every tracer page shares.
   *
   * @param title - Page title
   * @param rootUrl - URL of the cache root
   * @param body - Page body HTML
   * @returns Full HTML page
   */
  private _page(title: string, rootUrl: string, body: string): string {
    return (
      '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
      `<title>${this._escapeHtml(title)}</title>\n` +
      `${TRACER_HEAD}\n</head>\n<body>\n` +
      '<header class="topbar">' +
      `<a class="brand" href="${this._escapeHtml(rootUrl)}"><span class="brand-name">MMSP</span>` +
      '<span class="brand-sub">Tracer</span></a>' +
      '<div class="topbar-actions">' +
      '<a href="https://github.com/Prism-Shadow/model-message-stream-protocol" target="_blank" ' +
      `rel="noopener noreferrer" class="ghost-btn" title="GitHub">${ICONS.github}` +
      '<span class="label-wide">GitHub</span></a>' +
      '<div class="segmented theme-toggle" id="themeToggle" role="radiogroup" aria-label="Theme">' +
      '<span class="seg-thumb" aria-hidden="true"></span>' +
      '<button type="button" role="radio" aria-checked="false" aria-label="Light theme" title="Light" ' +
      `data-theme-choice="light" onclick="setTheme('light')">${ICONS.sun}</button>` +
      '<button type="button" role="radio" aria-checked="false" aria-label="Dark theme" title="Dark" ' +
      `data-theme-choice="dark" onclick="setTheme('dark')">${ICONS.moon}</button>` +
      "</div></div></header>\n" +
      `${body}\n${TRACER_SCRIPT}\n</body>\n</html>\n`
    );
  }

  /**
   * Escape HTML special characters.
   *
   * @param text - Text to escape
   * @returns Escaped text
   */
  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Start the web server for browsing conversation files.
   *
   * @param host - Host address to bind to
   * @param port - Port number to listen on
   */
  startWebServer(host: string = "127.0.0.1", port: number = 25750): void {
    const app = this.createWebApp();
    app.listen(port, host, () => {
      console.log(`Starting tracer web server at http://${host}:${port}`);
      console.log(`Cache directory: ${path.resolve(this.cacheDir)}`);
    });
  }
}
