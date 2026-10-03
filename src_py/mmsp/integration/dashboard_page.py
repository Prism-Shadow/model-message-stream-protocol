#!/usr/bin/env python
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

"""The dashboard of the MMSP server, one HTML document; `server.py` serves it at / as it is written."""

DASHBOARD_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>MMSP Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Cstyle%3E.d{fill:%23111116}@media (prefers-color-scheme: dark){.d{fill:%232a2a33}}%3C/style%3E%3Cpath d=%22M15.5 0H25a7 7 0 0 1 7 7v9.5H15.5Z%22 class=%22d%22/%3E%3Cpath d=%22M0 15.5h16.5V32H7a7 7 0 0 1-7-7Z%22 class=%22d%22/%3E%3Cpath d=%22M0 16V7a7 7 0 0 1 7-7h9v16Z%22 fill=%22%23477dfb%22/%3E%3Cpath d=%22M16 16h16v9a7 7 0 0 1-7 7h-9Z%22 fill=%22%23477dfb%22/%3E%3Cg fill=%22%23fff%22 font-family=%22ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif%22 font-size=%2210.5%22 font-weight=%22700%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3E%3Ctext x=%228.5%22 y=%228.5%22%3EM%3C/text%3E%3Ctext x=%2223.5%22 y=%228.5%22%3EM%3C/text%3E%3Ctext x=%228.5%22 y=%2223.5%22%3ES%3C/text%3E%3Ctext x=%2223.5%22 y=%2223.5%22%3EP%3C/text%3E%3C/g%3E%3C/svg%3E">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
    <script>
        // the stored theme applies before the first paint; without one the page follows the system
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
            --panel: #fafafa;
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
            --on-accent: #ffffff;
            --green: #16945b;
            --green-soft: rgba(22, 148, 91, 0.12);
            --amber: #b16a0a;
            --amber-soft: rgba(177, 106, 10, 0.12);
            --red: #d23b3b;
            --red-soft: rgba(210, 59, 59, 0.1);
            --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(20, 22, 28, 0.04);
            --shadow-menu: 0 0 0 1px var(--ring), 0 12px 32px -10px rgba(20, 22, 28, 0.22);
            --shadow-composer: 0 0 0 1px var(--ring), 0 10px 30px -14px rgba(20, 22, 28, 0.25);
            --ease: cubic-bezier(0.23, 1, 0.32, 1);
            --font: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
            --mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
            color-scheme: light;
        }

        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
                --bg: #1b1c1f;
                --panel: #18191c;
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
                --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.3);
                --shadow-menu: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 36px -10px rgba(0, 0, 0, 0.7);
                --shadow-composer: 0 0 0 1px rgba(255, 255, 255, 0.09), 0 14px 36px -14px rgba(0, 0, 0, 0.7);
                color-scheme: dark;
            }
        }

        :root[data-theme="dark"] {
            --bg: #1b1c1f;
            --panel: #18191c;
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
            --shadow-card: 0 0 0 1px var(--ring), 0 1px 2px rgba(0, 0, 0, 0.3);
            --shadow-menu: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 16px 36px -10px rgba(0, 0, 0, 0.7);
            --shadow-composer: 0 0 0 1px rgba(255, 255, 255, 0.09), 0 14px 36px -14px rgba(0, 0, 0, 0.7);
            color-scheme: dark;
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        html, body {
            height: 100%;
            margin: 0;
        }

        body {
            background: var(--bg);
            color: var(--text);
            font: 14px/1.55 var(--font);
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
        }

        button, input, textarea {
            font: inherit;
            color: inherit;
        }

        button {
            cursor: pointer;
            background: none;
            border: 0;
            padding: 0;
        }

        button:disabled {
            cursor: not-allowed;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        svg {
            flex: none;
        }

        .hidden {
            display: none !important;
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
            background: var(--bg);
            box-shadow: 0 1px 0 var(--ring);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: none;
        }

        .brand-mark {
            width: 22px;
            height: 22px;
            flex: none;
            align-self: center;
        }

        .mark-bg {
            fill: #111116;
        }

        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) .mark-bg {
                fill: #2a2a33;
            }
        }

        :root[data-theme="dark"] .mark-bg {
            fill: #2a2a33;
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

        /* groups and controls */

        .group-title {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 14px;
            color: var(--subtle);
            font-size: 12px;
            font-weight: 500;
        }

        .group-title::after {
            content: "";
            flex: 1;
            height: 1px;
            background: var(--ring);
        }

        .field-error {
            margin: 6px 0 0;
            color: var(--red);
            font-size: 12px;
            line-height: 1.45;
            overflow-wrap: anywhere;
        }

        .control {
            display: block;
            width: 100%;
            min-height: 34px;
            padding: 7px 10px;
            background: var(--surface);
            border: 0;
            border-radius: 8px;
            box-shadow: 0 0 0 1px var(--ring);
            font-size: 13px;
            line-height: 20px;
            transition: box-shadow 0.15s var(--ease), background-color 0.15s;
        }

        .control::placeholder {
            color: var(--subtle);
        }

        .control:hover {
            box-shadow: 0 0 0 1px var(--ring-strong);
        }

        .control:focus, .control:focus-visible {
            outline: none;
            box-shadow: 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-soft);
        }

        .control.invalid {
            box-shadow: 0 0 0 1px var(--red), 0 0 0 4px var(--red-soft);
        }

        .control.code {
            font-family: var(--mono);
            font-size: 12px;
            line-height: 18px;
        }

        /* the dashboard */

        .page {
            max-width: 960px;
            margin: 0 auto;
            padding: 32px 20px 64px;
        }

        /* the dot, the first line of the text and the button share one center line, 20px down,
           however many lines the served ids wrap to */
        .status-bar {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            min-height: 40px;
        }

        .status-dot {
            flex: none;
            width: 8px;
            height: 8px;
            margin-top: 16px;
            border-radius: 50%;
            background: var(--subtle);
        }

        .status-dot[data-state="up"] {
            background: var(--green);
        }

        .status-text {
            display: flex;
            flex: 1 1 0;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 4px 12px;
            min-width: 0;
            padding-top: 9px;
            font-weight: 500;
        }

        .status-text .mono {
            color: var(--muted);
            font-size: 13px;
            font-weight: 400;
            overflow-wrap: anywhere;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 32px;
            padding: 0 12px;
            margin: 0;
            border-radius: 8px;
            background: var(--accent);
            color: var(--on-accent);
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            transition: opacity 0.15s;
        }

        .btn:hover {
            opacity: 0.9;
        }

        .btn:disabled {
            opacity: 0.5;
        }

        .group {
            margin-top: 32px;
        }

        .table-head {
            display: grid;
            grid-template-columns: var(--cols);
            gap: 8px;
            align-items: center;
            padding-bottom: 8px;
            color: var(--subtle);
            font-size: 12px;
            font-weight: 500;
        }

        .row {
            display: grid;
            grid-template-columns: var(--cols);
            gap: 8px;
            align-items: center;
            padding: 6px 0;
        }

        .row + .row {
            border-top: 1px solid var(--ring);
        }

        .cell {
            display: block;
            min-width: 0;
        }

        .cell::before {
            content: attr(data-label);
            display: none;
            margin-bottom: 4px;
            color: var(--subtle);
            font-family: var(--font);
            font-size: 12px;
        }

        .key-prompt {
            display: flex;
            gap: 8px;
            margin: 4px 0 0 auto;
        }

        .key-prompt .control {
            width: 240px;
        }

        /* plain numbers on the page background: a label, the value, one line of detail */
        .stats {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 16px 24px;
            margin-top: 28px;
        }

        .stat {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }

        .stat-label {
            color: var(--subtle);
            font-size: 12px;
            font-weight: 500;
        }

        .stat-value {
            font-size: 28px;
            font-weight: 600;
            letter-spacing: -0.02em;
            line-height: 1.15;
            font-variant-numeric: tabular-nums;
        }

        /* wraps rather than truncates: the counts cut off at the end are the failed and dropped ones */
        .stat-sub {
            min-height: 16px;
            color: var(--muted);
            font-size: 12px;
            line-height: 18px;
        }

        .table {
            --cols: 16px minmax(160px, 1.6fr) minmax(80px, 0.7fr) minmax(80px, 0.7fr) minmax(80px, 0.7fr) minmax(90px, 0.8fr);
        }

        /* numbers line up by their last digit */
        .table-head span:nth-child(n+3), .row .cell.mono {
            text-align: right;
        }

        /* the dot centers on the first line, which stays put when an error line sits under the id */
        .row {
            align-items: start;
            padding: 10px 0;
            line-height: 20px;
        }

        .row .cell.mono {
            font-size: 12.5px;
            font-variant-numeric: tabular-nums;
        }

        .model-id {
            display: block;
            overflow: hidden;
            font-size: 13px;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .outcome {
            width: 8px;
            height: 8px;
            margin-top: 6px;
            border-radius: 50%;
            box-shadow: inset 0 0 0 1.5px var(--subtle);
        }

        .outcome[data-outcome="success"] {
            box-shadow: none;
            background: var(--green);
        }

        .outcome[data-outcome="failure"] {
            box-shadow: none;
            background: var(--red);
        }

        .outcome[data-outcome="disconnect"] {
            box-shadow: none;
            background: var(--subtle);
        }

        .err {
            display: block;
            overflow: hidden;
            color: var(--subtle);
            font-size: 11px;
            line-height: 16px;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        @media (max-width: 900px) {
            .status-bar {
                flex-wrap: wrap;
            }

            .key-prompt {
                width: calc(100% - 20px);
                margin: 8px 0 0 20px;
            }

            .key-prompt .control {
                flex: 1;
                width: auto;
            }

            .stats {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .table-head {
                display: none;
            }

            /* two lines a model: the id, then the four numbers under their labels */
            .row {
                grid-template-columns: 16px repeat(4, minmax(0, 1fr));
                row-gap: 6px;
                padding: 12px 0;
            }

            .row .cell:not(.mono) {
                grid-column: 2 / -1;
            }

            .row .cell.mono {
                grid-row: 2;
                text-align: left;
            }

            .row > :nth-child(3) {
                grid-column: 2;
            }

            .row > :nth-child(4) {
                grid-column: 3;
            }

            .row > :nth-child(5) {
                grid-column: 4;
            }

            .row > :nth-child(6) {
                grid-column: 5;
            }

            .row .cell.mono::before {
                display: block;
                margin-bottom: 0;
                line-height: 18px;
            }
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
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                transition-duration: 0.01ms !important;
            }
        }
    </style>
</head>
<body>
    <header class="topbar">
        <a class="brand" href="/"><svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M15.5 0H25a7 7 0 0 1 7 7v9.5H15.5Z" class="mark-bg"></path><path d="M0 15.5h16.5V32H7a7 7 0 0 1-7-7Z" class="mark-bg"></path><path d="M0 16V7a7 7 0 0 1 7-7h9v16Z" fill="#477dfb"></path><path d="M16 16h16v9a7 7 0 0 1-7 7h-9Z" fill="#477dfb"></path><g fill="#fff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="10.5" font-weight="700" text-anchor="middle" dominant-baseline="central"><text x="8.5" y="8.5">M</text><text x="23.5" y="8.5">M</text><text x="8.5" y="23.5">S</text><text x="23.5" y="23.5">P</text></g></svg><span class="brand-name">MMSP</span><span class="brand-sub">Dashboard</span></a>
        <div class="topbar-actions">
            <a href="https://github.com/Prism-Shadow/model-message-stream-protocol" target="_blank" rel="noopener noreferrer" class="ghost-btn" title="GitHub"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"></path></svg><span class="label-wide">GitHub</span></a>
            <div class="segmented theme-toggle" id="themeToggle" role="radiogroup" aria-label="Theme">
                <span class="seg-thumb" aria-hidden="true"></span>
                <button type="button" role="radio" aria-checked="false" aria-label="Light theme" title="Light" data-theme-choice="light" onclick="setTheme('light')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg></button>
                <button type="button" role="radio" aria-checked="false" aria-label="Dark theme" title="Dark" data-theme-choice="dark" onclick="setTheme('dark')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path></svg></button>
            </div>
        </div>
    </header>
    <main class="page">
        <section class="status-bar">
            <span class="status-dot" id="statusDot" data-state="down" aria-hidden="true"></span>
            <div class="status-text" role="status"><span id="statusText">Connecting</span><span id="statusSince" class="mono hidden"></span></div>
            <form id="keyPrompt" class="key-prompt hidden" onsubmit="submitKey(event)">
                <input id="keyInput" class="control code" type="password" placeholder="Server key" autocomplete="off" aria-label="Server key" oninput="this.classList.remove('invalid')">
                <button type="submit" class="btn">Unlock</button>
            </form>
        </section>

        <section class="stats" aria-label="Totals">
            <div class="stat"><span class="stat-label">Requests</span><span class="stat-value" id="statRequests">–</span><span class="stat-sub mono" id="statRequestsSub"></span></div>
            <div class="stat"><span class="stat-label">Success</span><span class="stat-value" id="statSuccess">–</span><span class="stat-sub mono" id="statSuccessSub"></span></div>
            <div class="stat"><span class="stat-label">Latency p90</span><span class="stat-value" id="statLatency">–</span><span class="stat-sub mono" id="statLatencySub"></span></div>
            <div class="stat"><span class="stat-label">First event p90</span><span class="stat-value" id="statFirstEvent">–</span><span class="stat-sub mono" id="statFirstEventSub"></span></div>
            <div class="stat"><span class="stat-label">Tokens out</span><span class="stat-value" id="statTokens">–</span><span class="stat-sub mono" id="statTokensSub"></span></div>
        </section>

        <section class="group">
            <div class="group-title"><span>Models</span></div>
            <div class="table">
                <div class="table-head" aria-hidden="true"><span></span><span>Model</span><span>Requests</span><span>Success</span><span>p90</span><span>Last</span></div>
                <div id="modelRows" role="list"></div>
            </div>
        </section>
    </main>

    <script>
        const METRICS = '/v1/metrics';
        const KEY_STORAGE = 'mmsp.dashboard.key';
        const REFRESH_MS = 3000;
        // a server that takes the connection and never answers reads as unreachable
        const FETCH_TIMEOUT_MS = 10000;
        // the key of this page alone when the browser refuses storage
        let memoryKey = '';
        // every fetch is numbered, so a slow answer never overwrites a newer one
        let fetchSeq = 0;
        // a server slower than the refresh is waited for, not asked again over and over
        let pending = false;
        let refreshTimer = null;

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

        function storedKey() {
            try {
                return localStorage.getItem(KEY_STORAGE) || memoryKey;
            } catch (error) {
                return memoryKey;
            }
        }

        function storeKey(key) {
            memoryKey = key;
            try {
                if (key) {
                    localStorage.setItem(KEY_STORAGE, key);
                } else {
                    localStorage.removeItem(KEY_STORAGE);
                }
            } catch (error) {
                // kept in memory for this page only
            }
        }

        function submitKey(event) {
            event.preventDefault();
            const input = document.getElementById('keyInput');
            input.classList.remove('invalid');
            storeKey(input.value.trim());
            fetchMetrics();
        }

        function showKeyPrompt(key) {
            const prompt = document.getElementById('keyPrompt');
            const input = document.getElementById('keyInput');
            if (prompt.classList.contains('hidden')) {
                prompt.classList.remove('hidden');
                input.value = key;
                input.focus();
            }
            // ring the key the server refused, not one typed over it while the answer was on its way
            input.classList.toggle('invalid', !!key && input.value.trim() === key);
        }

        function hideKeyPrompt() {
            const input = document.getElementById('keyInput');
            document.getElementById('keyPrompt').classList.add('hidden');
            input.classList.remove('invalid');
            input.value = '';
        }

        function promptShown() {
            return !document.getElementById('keyPrompt').classList.contains('hidden');
        }

        // the server counts every refused request, so a page waiting for its key does not poll
        function startRefresh() {
            if (!refreshTimer) {
                refreshTimer = setInterval(() => {
                    if (!document.hidden && !pending) {
                        fetchMetrics();
                    }
                }, REFRESH_MS);
            }
        }

        function stopRefresh() {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }

        async function fetchMetrics() {
            const seq = ++fetchSeq;
            const key = storedKey();
            let response;
            let metrics;
            pending = true;
            try {
                response = await fetch(METRICS, { headers: key ? { Authorization: 'Bearer ' + key } : {}, cache: 'no-store', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
                if (response.ok) {
                    metrics = await response.json();
                }
            } catch (error) {
                if (seq === fetchSeq) {
                    pending = false;
                    setStatus('down', 'Unreachable');
                }
                return;
            }
            if (seq !== fetchSeq) {
                return;
            }
            pending = false;
            if (response.status === 401) {
                stopRefresh();
                showKeyPrompt(key);
                setStatus('down', key ? 'Key refused' : 'Key required');
                return;
            }
            if (!response.ok) {
                setStatus('down', 'HTTP ' + response.status);
                return;
            }
            hideKeyPrompt();
            startRefresh();
            render(metrics);
            setStatus('up', 'Up ' + formatUptime(metrics.uptime_s));
            const since = document.getElementById('statusSince');
            since.textContent = 'since ' + new Date(metrics.started_at * 1000).toLocaleTimeString();
            since.classList.remove('hidden');
        }

        function setStatus(state, text) {
            const label = document.getElementById('statusText');
            document.getElementById('statusDot').dataset.state = state;
            // the status line is a live region: rewriting the same words would announce them again
            if (label.textContent !== text) {
                label.textContent = text;
            }
            if (state !== 'up') {
                document.getElementById('statusSince').classList.add('hidden');
            }
        }

        // a detail line wraps only after a separator, never inside "6 refused"
        function detailLine(parts) {
            return parts.map((part) => part.replaceAll(' ', '\\u00a0')).join('\\u00a0· ');
        }

        function setStat(id, value, detail, title) {
            const sub = document.getElementById(id + 'Sub');
            document.getElementById(id).textContent = value;
            sub.textContent = detail;
            if (title) {
                sub.title = title;
            } else {
                sub.removeAttribute('title');
            }
        }

        function render(m) {
            const refused = m.refused.unauthorized + m.refused.invalid_request + m.refused.unknown_model;
            const requests = [];
            if (m.in_flight > 0) {
                requests.push(formatCount(m.in_flight) + ' streaming');
            }
            if (refused > 0) {
                requests.push(formatCount(refused) + ' refused');
            }
            const breakdown = refused > 0
                ? 'unauthorized ' + m.refused.unauthorized + ' · invalid ' + m.refused.invalid_request + ' · unknown model ' + m.refused.unknown_model
                : '';
            setStat('statRequests', formatCount(m.requests), detailLine(requests), breakdown);

            // a detail line only once there is something to detail, so an idle server reads as dashes
            const outcomes = [];
            if (m.successes + m.failures + m.disconnects > 0) {
                outcomes.push(formatCount(m.successes) + ' ok', formatCount(m.failures) + ' failed');
                if (m.disconnects > 0) {
                    outcomes.push(formatCount(m.disconnects) + ' dropped');
                }
            }
            setStat('statSuccess', formatRate(m.success_rate), detailLine(outcomes));

            const total = m.latency_ms.total;
            const first = m.latency_ms.first_event;
            setStat('statLatency', formatMs(total.p90), total.p50 == null ? '' : 'p50 ' + formatMs(total.p50));
            setStat('statFirstEvent', formatMs(first.p90), first.p50 == null ? '' : 'p50 ' + formatMs(first.p50));

            const tokens = m.tokens;
            const spent = [];
            if (tokens.prompt + tokens.thoughts + tokens.response > 0) {
                spent.push(formatCount(tokens.prompt) + ' prompt');
                if (tokens.thoughts > 0) {
                    spent.push(formatCount(tokens.thoughts) + ' thinking');
                }
            }
            setStat('statTokens', formatCount(tokens.response), detailLine(spent));

            // "ago" on the server's clock, so a browser clock that is off does not shift it
            renderModels(m.models, m.started_at + m.uptime_s);
        }

        function modelCell(label, text) {
            const cell = document.createElement('span');
            cell.className = 'cell mono';
            cell.dataset.label = label;
            cell.textContent = text;
            return cell;
        }

        function renderModels(models, now) {
            const rows = models.map((model) => {
                const row = document.createElement('div');
                row.className = 'row';
                row.setAttribute('role', 'listitem');

                const last = model.last_outcome || 'none';
                const outcome = document.createElement('span');
                outcome.className = 'outcome';
                outcome.dataset.outcome = last;
                outcome.title = 'Last: ' + last;
                outcome.setAttribute('role', 'img');
                outcome.setAttribute('aria-label', 'Last: ' + last);

                const name = document.createElement('span');
                name.className = 'cell';
                name.dataset.label = 'Model';
                const id = document.createElement('span');
                id.className = 'mono model-id';
                id.textContent = model.id;
                id.title = model.id;
                const error = document.createElement('span');
                error.className = 'mono err';
                if (model.last_error) {
                    error.textContent = model.last_error.message;
                    error.title = model.last_error.message;
                } else {
                    error.classList.add('hidden');
                }
                name.append(id, error);

                const ago = model.last_request_at == null ? null : Math.max(0, now - model.last_request_at);
                row.append(
                    outcome,
                    name,
                    modelCell('Requests', formatCount(model.requests)),
                    modelCell('Success', formatRate(model.success_rate)),
                    modelCell('p90', formatMs(model.latency_ms.total.p90)),
                    modelCell('Last', formatAgo(ago))
                );
                return row;
            });
            document.getElementById('modelRows').replaceChildren(...rows);
        }

        function formatMs(ms) {
            if (ms == null) {
                return '–';
            }
            return ms < 1000 ? ms + ' ms' : (ms / 1000).toFixed(1) + ' s';
        }

        function formatRate(rate) {
            return rate == null ? '–' : (rate * 100).toFixed(1) + '%';
        }

        function formatCount(n) {
            return n == null ? '–' : n.toLocaleString('en-US');
        }

        function formatAgo(seconds) {
            if (seconds == null) {
                return '–';
            }
            if (seconds < 60) {
                return Math.floor(seconds) + ' s ago';
            }
            if (seconds < 3600) {
                return Math.floor(seconds / 60) + ' min ago';
            }
            if (seconds < 86400) {
                return Math.floor(seconds / 3600) + ' h ago';
            }
            return Math.floor(seconds / 86400) + ' d ago';
        }

        function formatUptime(seconds) {
            const s = Math.max(0, Math.floor(seconds));
            if (s < 60) {
                return s + ' s';
            }
            if (s < 3600) {
                return Math.floor(s / 60) + ' min';
            }
            if (s < 86400) {
                return Math.floor(s / 3600) + ' h ' + Math.floor((s % 3600) / 60) + ' min';
            }
            return Math.floor(s / 86400) + ' d ' + Math.floor((s % 86400) / 3600) + ' h';
        }

        fetchMetrics();
        startRefresh();
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !pending && !promptShown()) {
                fetchMetrics();
            }
        });
        updateThemeToggle();
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeToggle);
        document.fonts.ready.then(updateThemeToggle);
    </script>
</body>
</html>
"""
