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

"""The server page of the playground, one HTML document; `playground.py` serves it at /server/ with `__PLAYGROUND_DEFAULTS__` filled in."""

SERVER_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>MMSP Server</title>
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

        .ghost-btn:disabled {
            color: var(--muted);
            background: none;
            opacity: 0.5;
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

        .field-label {
            color: var(--muted);
            font-size: 12.5px;
            font-weight: 500;
        }

        .field-note {
            margin: 6px 0 0;
            color: var(--subtle);
            font-size: 12px;
            line-height: 1.45;
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

        /* comboboxes */

        [data-combobox] {
            position: relative;
        }

        .combo-button {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            text-align: left;
        }

        .combo-button[aria-expanded="true"] {
            box-shadow: 0 0 0 1px var(--accent), 0 0 0 4px var(--accent-soft);
        }

        .combo-button [data-combobox-label] {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Auto is a word, the client types are ids */
        .combo-button [data-combobox-label]:not(.mono) {
            font-family: var(--font);
            font-size: 13px;
        }

        .combo-button svg {
            color: var(--subtle);
            transition: transform 0.2s var(--ease);
        }

        .combo-button[aria-expanded="true"] svg {
            transform: rotate(180deg);
        }

        [data-combobox-menu] {
            position: absolute;
            z-index: 30;
            top: calc(100% + 6px);
            left: 0;
            right: 0;
            max-height: 320px;
            overflow-y: auto;
            padding: 4px;
            background: var(--surface);
            border-radius: 10px;
            box-shadow: var(--shadow-menu);
            transform-origin: top center;
            animation: menu-in 0.18s var(--ease);
        }

        @keyframes menu-in {
            from {
                opacity: 0;
                transform: translateY(-4px) scale(0.98);
            }
        }

        .menu-heading {
            padding: 8px 8px 4px;
            color: var(--subtle);
            font-size: 11.5px;
            font-weight: 500;
        }

        .combo-option {
            position: relative;
            display: block;
            width: 100%;
            padding: 6px 28px 6px 8px;
            border-radius: 6px;
            text-align: left;
            font-size: 13px;
            line-height: 18px;
            transition: background-color 0.1s;
        }

        .combo-option span {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .combo-option::after {
            content: attr(data-description);
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--subtle);
            font-family: var(--mono);
            font-size: 11px;
            line-height: 16px;
        }

        .combo-option[data-description=""]::after {
            display: none;
        }

        .combo-option:hover, .combo-option:focus-visible {
            outline: none;
            background: var(--hover);
        }

        .combo-option[aria-selected="true"] {
            background: var(--accent-soft);
        }

        .combo-option[aria-selected="true"]::before {
            content: "";
            position: absolute;
            right: 9px;
            top: 50%;
            width: 10px;
            height: 6px;
            margin-top: -5px;
            border-left: 1.75px solid var(--accent);
            border-bottom: 1.75px solid var(--accent);
            transform: rotate(-45deg);
        }

        .icon-btn {
            display: inline-grid;
            place-items: center;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            color: var(--muted);
            transition: color 0.15s, background-color 0.15s;
        }

        .icon-btn:hover {
            color: var(--text);
            background: var(--hover);
        }

        /* the server page */

        .page {
            max-width: 1120px;
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

        .status-dot[data-state="running"] {
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

        /* right-aligned with Restart left of Save: the buttons that come and go (Dashboard, Restart) sit at the
           left end, so none slides another under the pointer, as Restart would under a Save just clicked */
        .actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            margin: 4px 0 0 auto;
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

        .config-line {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 10px;
            margin: 8px 0 0 20px;
        }

        .config-line .mono {
            overflow-wrap: anywhere;
        }

        #serverError {
            margin: 10px 0 0 20px;
        }

        .group {
            margin-top: 32px;
        }

        .table {
            --cols: 16px minmax(140px, 1.1fr) minmax(170px, 1fr) minmax(220px, 1.6fr) minmax(150px, 1fr) minmax(120px, 0.9fr) 32px;
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

        /* the legend and the eye sit past the hairline, at the right end of the title; the negative margin keeps the
           title row as tall as the others */
        .legend {
            display: flex;
            gap: 14px;
            order: 1;
        }

        .group-title .icon-btn {
            order: 1;
            width: 24px;
            height: 24px;
            margin: -4px 0;
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

        .row.invalid .control {
            box-shadow: 0 0 0 1px var(--red), 0 0 0 4px var(--red-soft);
        }

        .key-row {
            --cols: 16px minmax(200px, 420px) 32px;
        }

        /* a row's state: green filled in effect, amber filled saved, a hollow ring unsaved; the word shows on
           narrow screens and in the legend */
        .state {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--muted);
            font-size: 12px;
            white-space: nowrap;
        }

        .state::before {
            content: "";
            flex: none;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            box-shadow: inset 0 0 0 1.5px var(--subtle);
        }

        .state[data-state="saved"]::before {
            box-shadow: none;
            background: var(--amber);
        }

        .state[data-state="effect"]::before {
            box-shadow: none;
            background: var(--green);
        }

        .state::after {
            content: attr(data-label);
            display: none;
        }

        .legend .state::after {
            display: inline;
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
            font-size: 12px;
        }

        /* wider than its column, so every client type and both headings fit on one line */
        .row [data-combobox-menu] {
            right: auto;
            width: max(100%, 300px);
        }

        .remove-btn {
            color: var(--subtle);
        }

        .add-btn {
            margin-top: 8px;
            padding: 0 8px;
        }

        .listen-row {
            display: grid;
            grid-template-columns: auto minmax(160px, 260px) auto 120px 16px;
            justify-content: start;
            gap: 8px 10px;
            align-items: center;
        }

        @media (max-width: 900px) {
            .status-bar {
                flex-wrap: wrap;
            }

            .actions {
                width: 100%;
                margin: 8px 0 0 20px;
            }

            .table-head {
                display: none;
            }

            .row {
                position: relative;
                grid-template-columns: 1fr;
                gap: 10px;
                padding: 14px 0;
            }

            .row .remove-btn {
                position: absolute;
                top: 10px;
                right: 0;
            }

            .state::after {
                display: inline;
            }

            .row .state {
                padding-right: 40px;
            }

            .cell::before {
                display: block;
            }

            .key-row {
                grid-template-columns: 1fr;
            }

            .listen-row {
                grid-template-columns: auto 1fr;
            }

            .listen-row .state {
                grid-column: 1 / -1;
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
        <a class="brand" href="/server/"><svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M15.5 0H25a7 7 0 0 1 7 7v9.5H15.5Z" class="mark-bg"></path><path d="M0 15.5h16.5V32H7a7 7 0 0 1-7-7Z" class="mark-bg"></path><path d="M0 16V7a7 7 0 0 1 7-7h9v16Z" fill="#477dfb"></path><path d="M16 16h16v9a7 7 0 0 1-7 7h-9Z" fill="#477dfb"></path><g fill="#fff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="10.5" font-weight="700" text-anchor="middle" dominant-baseline="central"><text x="8.5" y="8.5">M</text><text x="23.5" y="8.5">M</text><text x="8.5" y="23.5">S</text><text x="23.5" y="23.5">P</text></g></svg><span class="brand-name">MMSP</span><span class="brand-sub">Server</span></a>
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
            <span class="status-dot" id="statusDot" data-state="stopped" aria-hidden="true"></span>
            <div class="status-text" role="status">
                <span id="statusText">Stopped</span>
                <span id="statusUrl" class="mono hidden"></span>
                <span id="statusModels" class="mono hidden"></span>
            </div>
            <div class="actions">
                <a id="dashboardLink" class="ghost-btn hidden" target="_blank" rel="noopener noreferrer" title="Dashboard" aria-label="Dashboard"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg><span class="label-wide">Dashboard</span></a>
                <button type="button" id="restartButton" class="ghost-btn hidden" onclick="restartServer()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg><span>Restart</span></button>
                <button type="button" id="saveButton" class="ghost-btn" onclick="saveServerConfig()" disabled><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><path d="M17 21v-8H7v8M7 3v5h8"></path></svg><span>Save</span></button>
                <button type="button" class="btn" id="serverToggle" data-state="stopped" onclick="toggleServer()">
                    <svg id="serverToggleStart" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8Z"></path></svg>
                    <svg id="serverToggleStop" class="hidden" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>
                    <span id="serverToggleLabel">Start</span>
                </button>
            </div>
        </section>
        <p class="field-note config-line"><span id="configPath" class="mono"></span><span>Written as typed; use $VAR for keys.</span></p>
        <p id="serverError" class="field-error hidden" role="alert"></p>

        <section class="group">
            <div class="group-title">
                <span>Models</span>
                <span class="legend" aria-hidden="true"><span class="state" data-state="effect" data-label="In effect"></span><span class="state" data-state="saved" data-label="Saved"></span><span class="state" data-state="unsaved" data-label="Unsaved"></span></span>
                <button type="button" id="keyVisibilityToggle" class="icon-btn" data-visible="false" aria-label="Show keys" title="Show keys" onclick="toggleKeyVisibility()">
                    <svg id="keyVisibilityShowIcon" class="hidden" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <svg id="keyVisibilityHideIcon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.7 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-3.3 4.3"></path><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a10.9 10.9 0 0 0 5.4-1.4"></path><path d="M9.9 9.9A3 3 0 0 0 14.1 14.1"></path><path d="M3 3l18 18"></path></svg>
                </button>
            </div>
            <div class="table">
                <div class="table-head" aria-hidden="true">
                    <span></span><span>Model id</span><span>Client type</span><span>Base URL</span><span>API key</span>
                    <span>Served as</span><span></span>
                </div>
                <div id="modelRows" role="list"></div>
            </div>
            <button type="button" id="addRowButton" class="ghost-btn add-btn" onclick="addRow()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>Model</span></button>
        </section>

        <section class="group">
            <div class="group-title"><span>Keys</span></div>
            <div id="apiKeyRows" role="list"></div>
            <p id="keysNote" class="field-note">None: open to every request.</p>
            <button type="button" id="addKeyButton" class="ghost-btn add-btn" onclick="addKey()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg><span>Key</span></button>
        </section>

        <section class="group">
            <div class="group-title"><span>Listen</span></div>
            <div class="listen-row">
                <label class="field-label" for="hostInput">Host</label>
                <input id="hostInput" class="control code" type="text" value="127.0.0.1" placeholder="127.0.0.1" spellcheck="false" autocomplete="off" oninput="saveDraft()">
                <label class="field-label" for="portInput">Port</label>
                <input id="portInput" class="control code" type="number" min="0" max="65535" value="25752" placeholder="25752" oninput="saveDraft()">
                <span class="state" id="listenState" data-state="unsaved" data-label="Unsaved" title="Unsaved" role="img" aria-label="Unsaved"></span>
            </div>
        </section>
    </main>

    <script>
        // the client types the playground knows, official and compatible, for the client type menus
        const PLAYGROUND = __PLAYGROUND_DEFAULTS__;
        const CLIENT_TYPE_DESCRIPTIONS = {
            'openai-official': 'OpenAI',
            'anthropic-official': 'Anthropic',
            'gemini-official': 'Google Gemini',
            'zai-official': 'Z.AI',
            'moonshot-official': 'Moonshot',
            'deepseek-official': 'DeepSeek',
            'minimax-official': 'MiniMax',
            'openai-responses': 'OpenAI Responses',
            'openai-chat': 'OpenAI Chat Completions',
            'openai-chat-vllm-adapter': 'Chat Completions on vLLM',
            'openai-embedding': 'OpenAI Embeddings',
            'ant-messages': 'Anthropic Messages',
            'google-genai': 'Google generateContent',
            'mmsp': 'MMSP server'
        };
        const DRAFT_KEY = 'mmsp.playground.server';
        const API = '/server/api';
        const DEFAULT_HOST = '127.0.0.1';
        const DEFAULT_PORT = 25752;
        // a row's cells in the order the server's config lists them; the last two may be left out
        const COLUMNS = ['model_id', 'base_url', 'api_key', 'server_model_id', 'client_type'];
        const OPTIONAL_COLUMNS = ['base_url', 'client_type'];
        const STATE_LABELS = { effect: 'In effect', saved: 'Saved', unsaved: 'Unsaved' };
        const CHEVRON_ICON = '<svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>';
        const REMOVE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>';
        // set while the saved draft is laid out again, which is not the user typing
        let restoring = false;
        let saved = null; // the GET /config body
        let status = { running: false };
        let nextRowId = 1;
        let nextKeyId = 1;

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

        function closeCombobox(comboboxId) {
            const root = document.getElementById(comboboxId);
            if (!root) {
                return;
            }
            const menu = root.querySelector('[data-combobox-menu]');
            const button = root.querySelector('[data-combobox-button]');
            if (!menu || !button) {
                return;
            }
            menu.classList.add('hidden');
            button.setAttribute('aria-expanded', 'false');
        }

        function closeComboboxes(exceptId) {
            document.querySelectorAll('[data-combobox]').forEach((root) => {
                if (root.id !== exceptId) {
                    closeCombobox(root.id);
                }
            });
        }

        function visibleOptions(menu) {
            return Array.from(menu.querySelectorAll('[data-combobox-option]')).filter((option) => !option.classList.contains('hidden'));
        }

        function toggleCombobox(comboboxId) {
            const root = document.getElementById(comboboxId);
            const menu = root.querySelector('[data-combobox-menu]');
            const isOpen = !menu.classList.contains('hidden');
            closeComboboxes(comboboxId);
            if (isOpen) {
                closeCombobox(comboboxId);
                return;
            }
            menu.classList.remove('hidden');
            root.querySelector('[data-combobox-button]').setAttribute('aria-expanded', 'true');

            // the arrows need somewhere to start: the selected option, else the first
            const selected = menu.querySelector('[data-combobox-option][aria-selected="true"]') || visibleOptions(menu)[0];
            if (selected) {
                selected.scrollIntoView({ block: 'nearest' });
                selected.focus();
            }
        }

        function selectComboboxOption(comboboxId, option) {
            const root = document.getElementById(comboboxId);
            root.querySelector('[data-combobox-value]').value = option.dataset.value || '';
            const label = root.querySelector('[data-combobox-label]');
            label.textContent = option.dataset.label;
            label.classList.toggle('mono', !!option.dataset.value);

            root.querySelectorAll('[data-combobox-option]').forEach((item) => {
                item.setAttribute('aria-selected', item === option ? 'true' : 'false');
            });

            const wasOpen = root.querySelector('[data-combobox-button][aria-expanded="true"]');
            closeCombobox(comboboxId);
            if (wasOpen) {
                wasOpen.focus();
            }
            if (comboboxId.startsWith('clientType-')) {
                handleRowClientType(comboboxId.slice('clientType-'.length));
            }
        }

        function handleComboboxKeydown(event, comboboxId) {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                event.preventDefault();
                toggleCombobox(comboboxId);
            } else if (event.key === 'Escape') {
                closeCombobox(comboboxId);
            }
        }

        // arrows walk the open menu, Escape hands focus back to its button
        function handleMenuKeydown(event, comboboxId) {
            const root = document.getElementById(comboboxId);
            const menu = root.querySelector('[data-combobox-menu]');
            const options = visibleOptions(menu);
            const index = options.indexOf(document.activeElement);
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const step = event.key === 'ArrowDown' ? 1 : -1;
                const next = index < 0 ? (step > 0 ? 0 : options.length - 1) : Math.min(Math.max(index + step, 0), options.length - 1);
                if (options[next]) {
                    options[next].focus();
                }
            } else if (event.key === 'Enter' && index < 0 && options.length) {
                event.preventDefault();
                selectComboboxOption(comboboxId, options[0]);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                closeCombobox(comboboxId);
                root.querySelector('[data-combobox-button]').focus();
            }
        }

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }
            if (!target.closest('[data-combobox]')) {
                closeComboboxes();
            }
        });

        function clientTypeOption(comboboxId, value, label, description) {
            const option = document.createElement('button');
            option.type = 'button';
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            option.className = 'combo-option';
            option.setAttribute('data-combobox-option', '');
            option.dataset.value = value;
            option.dataset.label = label;
            option.dataset.description = description;
            const text = document.createElement('span');
            text.textContent = label;
            if (value) {
                text.className = 'mono';
            }
            option.appendChild(text);
            option.onclick = () => selectComboboxOption(comboboxId, option);
            return option;
        }

        function populateClientTypes(comboboxId) {
            const menu = document.getElementById(comboboxId + '-menu');
            const auto = clientTypeOption(comboboxId, '', 'Auto', 'The official client the model id names');
            auto.setAttribute('aria-selected', 'true');
            menu.appendChild(auto);
            [['Official: the vendor’s own API', PLAYGROUND.official], ['Compatible: any endpoint serving the protocol', PLAYGROUND.compatible]].forEach(([title, types]) => {
                const header = document.createElement('div');
                header.className = 'menu-heading';
                header.textContent = title;
                menu.appendChild(header);
                types.forEach((type) => menu.appendChild(clientTypeOption(comboboxId, type, type, CLIENT_TYPE_DESCRIPTIONS[type] || '')));
            });
        }

        function modelRows() {
            return Array.from(document.getElementById('modelRows').children);
        }

        function keyInputs() {
            return Array.from(document.querySelectorAll('#apiKeyRows [data-key]'));
        }

        function rowCell(row, column) {
            return row.querySelector('[data-column="' + column + '"]');
        }

        // a type the menu does not list (written into the file by hand) is kept, listed after Auto, so the
        // row still equals its saved form and the server can name it
        function setRowClientType(rowId, type) {
            const menu = document.getElementById('clientType-' + rowId + '-menu');
            let option = visibleOptions(menu).find((item) => item.dataset.value === type);
            if (!option) {
                option = clientTypeOption('clientType-' + rowId, type, type, '');
                menu.insertBefore(option, menu.querySelector('.menu-heading'));
            }
            selectComboboxOption('clientType-' + rowId, option);
        }

        function addRow(cells) {
            const rowId = 'r' + nextRowId++;
            const row = document.createElement('div');
            row.className = 'row';
            row.setAttribute('role', 'listitem');
            row.dataset.rowId = rowId;
            row.innerHTML = `
                <span class="state" data-state="unsaved" data-label="Unsaved" title="Unsaved" role="img" aria-label="Unsaved"></span>
                <label class="cell" data-label="Model id"><input class="control code" data-column="model_id" type="text" placeholder="claude-sonnet-5-5" aria-label="Model id" spellcheck="false" autocomplete="off" oninput="handleModelIdInput(this)"></label>
                <div class="cell" data-label="Client type">
                    <div id="clientType-${rowId}" data-combobox>
                        <input type="hidden" data-combobox-value data-column="client_type" value="">
                        <button type="button" role="combobox" aria-expanded="false" aria-controls="clientType-${rowId}-menu" aria-label="Client type" class="control code combo-button" onclick="toggleCombobox('clientType-${rowId}')" onkeydown="handleComboboxKeydown(event, 'clientType-${rowId}')" data-combobox-button><span data-combobox-label>Auto</span>${CHEVRON_ICON}</button>
                        <div id="clientType-${rowId}-menu" class="hidden" role="listbox" aria-label="Client type" data-combobox-menu onkeydown="handleMenuKeydown(event, 'clientType-${rowId}')"></div>
                    </div>
                </div>
                <label class="cell" data-label="Base URL"><input class="control code" data-column="base_url" type="url" placeholder="Default" aria-label="Base URL" spellcheck="false" autocomplete="off" oninput="handleCellInput(this)"></label>
                <label class="cell" data-label="API key"><input class="control code key" data-column="api_key" type="password" placeholder="$ANTHROPIC_API_KEY" aria-label="API key" autocomplete="off" oninput="handleCellInput(this)"></label>
                <label class="cell" data-label="Served as"><input class="control code" data-column="server_model_id" type="text" placeholder="claude" aria-label="Served as" spellcheck="false" autocomplete="off" oninput="handleServerIdInput(this)"></label>
                <button type="button" class="icon-btn remove-btn" onclick="removeRow('${rowId}')" aria-label="Remove model" title="Remove">${REMOVE_ICON}</button>
            `;
            document.getElementById('modelRows').appendChild(row);
            populateClientTypes('clientType-' + rowId);
            applyKeyVisibility(rowCell(row, 'api_key'));

            const serverId = rowCell(row, 'server_model_id');
            serverId.dataset.auto = 'true';
            if (cells) {
                const text = (column) => (typeof cells[column] === 'string' ? cells[column] : '');
                rowCell(row, 'model_id').value = text('model_id');
                setRowClientType(rowId, text('client_type'));
                rowCell(row, 'base_url').value = text('base_url');
                rowCell(row, 'api_key').value = text('api_key');
                serverId.value = text('server_model_id');
                serverId.dataset.auto = text('server_model_id') === text('model_id') ? 'true' : 'false';
            }
            if (!restoring) {
                rowCell(row, 'model_id').focus();
            }
            saveDraft();
        }

        function removeRow(rowId) {
            const row = document.querySelector('#modelRows [data-row-id="' + rowId + '"]');
            if (row) {
                row.remove();
            }
            saveDraft();
        }

        function updateKeysNote() {
            document.getElementById('keysNote').classList.toggle('hidden', document.getElementById('apiKeyRows').children.length > 0);
        }

        function addKey(value) {
            const keyId = 'k' + nextKeyId++;
            const row = document.createElement('div');
            row.className = 'row key-row';
            row.setAttribute('role', 'listitem');
            row.dataset.keyId = keyId;
            row.innerHTML = `
                <span class="state" data-state="unsaved" data-label="Unsaved" title="Unsaved" role="img" aria-label="Unsaved"></span>
                <label class="cell" data-label="Key"><input class="control code key" data-key type="password" placeholder="$MMSP_SERVER_API_KEY" aria-label="Key" autocomplete="off" oninput="handleCellInput(this)"></label>
                <button type="button" class="icon-btn remove-btn" onclick="removeKey('${keyId}')" aria-label="Remove key" title="Remove">${REMOVE_ICON}</button>
            `;
            document.getElementById('apiKeyRows').appendChild(row);
            const input = row.querySelector('[data-key]');
            input.value = typeof value === 'string' ? value : '';
            applyKeyVisibility(input);
            updateKeysNote();
            if (!restoring) {
                input.focus();
            }
            saveDraft();
        }

        function removeKey(keyId) {
            const row = document.querySelector('#apiKeyRows [data-key-id="' + keyId + '"]');
            if (row) {
                row.remove();
            }
            updateKeysNote();
            saveDraft();
        }

        // only Served as follows the model id: an empty client type and base URL are the defaults
        function handleModelIdInput(input) {
            const row = input.closest('.row');
            const serverId = rowCell(row, 'server_model_id');
            if (serverId.dataset.auto !== 'false') {
                serverId.value = input.value;
            }
            clearRing(row);
            saveDraft();
        }

        function handleServerIdInput(input) {
            input.dataset.auto = input.value ? 'false' : 'true';
            clearRing(input.closest('.row'));
            saveDraft();
        }

        function handleCellInput(input) {
            clearRing(input.closest('.row'));
            saveDraft();
        }

        function handleRowClientType(rowId) {
            const row = document.querySelector('#modelRows [data-row-id="' + rowId + '"]');
            if (!row) {
                return;
            }
            clearRing(row);
            saveDraft();
        }

        function applyKeyVisibility(input) {
            input.type = document.getElementById('keyVisibilityToggle').dataset.visible === 'true' ? 'text' : 'password';
        }

        function toggleKeyVisibility() {
            const toggle = document.getElementById('keyVisibilityToggle');
            const visible = toggle.dataset.visible !== 'true';
            toggle.dataset.visible = visible ? 'true' : 'false';
            toggle.setAttribute('aria-label', visible ? 'Hide keys' : 'Show keys');
            toggle.setAttribute('title', visible ? 'Hide keys' : 'Show keys');
            document.getElementById('keyVisibilityShowIcon').classList.toggle('hidden', !visible);
            document.getElementById('keyVisibilityHideIcon').classList.toggle('hidden', visible);
            document.querySelectorAll('input.key').forEach(applyKeyVisibility);
        }

        function rowCells(row) {
            return Object.fromEntries(COLUMNS.map((column) => [column, rowCell(row, column).value]));
        }

        // a row as it is saved: trimmed cells in COLUMNS order, an empty client type or base URL left out
        function normalizeRow(row) {
            const normalized = {};
            COLUMNS.forEach((column) => {
                const value = row && typeof row[column] === 'string' ? row[column].trim() : '';
                if (value || !OPTIONAL_COLUMNS.includes(column)) {
                    normalized[column] = value;
                }
            });
            return normalized;
        }

        // rows are told apart by content, not position: removing a row moves every index after it
        function rowKey(row) {
            return JSON.stringify(normalizeRow(row));
        }

        function configKey(config) {
            const value = config || {};
            return JSON.stringify({
                models: (Array.isArray(value.models) ? value.models : []).map(normalizeRow),
                api_keys: (Array.isArray(value.api_keys) ? value.api_keys : []).map((key) => (typeof key === 'string' ? key.trim() : '')),
                host: value.host,
                port: value.port
            });
        }

        // empty keys stay in, so the server can name them by index
        function collectConfig() {
            const port = document.getElementById('portInput').value.trim();
            return {
                models: modelRows().map((row) => normalizeRow(rowCells(row))),
                api_keys: keyInputs().map((input) => input.value.trim()),
                host: document.getElementById('hostInput').value.trim() || DEFAULT_HOST,
                port: port === '' ? DEFAULT_PORT : Number(port)
            };
        }

        function rowState(key, savedKeys, runningKeys) {
            if (runningKeys.has(key)) {
                return 'effect';
            }
            return savedKeys.has(key) ? 'saved' : 'unsaved';
        }

        function setState(element, state) {
            const label = STATE_LABELS[state];
            element.dataset.state = state;
            element.dataset.label = label;
            element.setAttribute('title', label);
            element.setAttribute('aria-label', label);
        }

        function isDirty() {
            const savedConfig = saved && saved.config;
            return !savedConfig || configKey(collectConfig()) !== configKey(savedConfig);
        }

        function renderStates() {
            const savedConfig = saved && saved.config;
            const runningConfig = status.running ? status.config : null;
            const rowKeys = (config) => new Set(config && Array.isArray(config.models) ? config.models.map(rowKey) : []);
            const apiKeys = (config) => new Set(config && Array.isArray(config.api_keys) ? config.api_keys.map((key) => (typeof key === 'string' ? key.trim() : '')) : []);
            const listenKeys = (config) => new Set(config ? [JSON.stringify([config.host, config.port])] : []);
            const savedRows = rowKeys(savedConfig);
            const runningRows = rowKeys(runningConfig);
            modelRows().forEach((row) => setState(row.querySelector('.state'), rowState(rowKey(rowCells(row)), savedRows, runningRows)));
            const savedKeys = apiKeys(savedConfig);
            const runningKeys = apiKeys(runningConfig);
            keyInputs().forEach((input) => setState(input.closest('.row').querySelector('.state'), rowState(input.value.trim(), savedKeys, runningKeys)));
            const current = collectConfig();
            setState(document.getElementById('listenState'), rowState(JSON.stringify([current.host, current.port]), listenKeys(savedConfig), listenKeys(runningConfig)));
            document.getElementById('saveButton').disabled = !isDirty();
            const pending = !!(status.running && savedConfig && runningConfig && configKey(savedConfig) !== configKey(runningConfig));
            document.getElementById('restartButton').classList.toggle('hidden', !pending);
        }

        // the draft is kept only while it differs from the saved file, so a reload after Save reads the file
        function saveDraft() {
            if (restoring) {
                return;
            }
            const draft = {
                models: modelRows().map(rowCells),
                api_keys: keyInputs().map((input) => input.value),
                host: document.getElementById('hostInput').value,
                port: document.getElementById('portInput').value
            };
            try {
                if (isDirty()) {
                    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                } else {
                    localStorage.removeItem(DRAFT_KEY);
                }
            } catch (error) {
                // a browser that refuses storage keeps the table for this page only
            }
            renderStates();
        }

        function restoreTable() {
            let draft = null;
            try {
                draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
            } catch (error) {
                draft = null;
            }
            if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
                draft = null;
            }
            const source = draft || (saved && saved.config) || null;
            restoring = true;
            try {
                const models = source && Array.isArray(source.models) ? source.models : [];
                if (models.length) {
                    models.forEach((row) => addRow(row && typeof row === 'object' ? row : {}));
                } else {
                    addRow();
                }
                (source && Array.isArray(source.api_keys) ? source.api_keys : []).forEach((key) => addKey(String(key)));
                if (source && typeof source.host === 'string') {
                    document.getElementById('hostInput').value = source.host;
                }
                if (source && (typeof source.port === 'string' || typeof source.port === 'number')) {
                    document.getElementById('portInput').value = String(source.port);
                }
            } finally {
                restoring = false;
            }
            renderStates();
        }

        async function sendJson(method, path, body) {
            const response = await fetch(API + path, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            let answer = {};
            try {
                answer = await response.json();
            } catch (error) {
                // a body that is not JSON leaves only the status to report
            }
            return { response, answer };
        }

        function postJson(path, body) {
            return sendJson('POST', path, body);
        }

        async function loadServerConfig() {
            try {
                const response = await fetch(API + '/config', { cache: 'no-store' });
                if (!response.ok) {
                    return;
                }
                const body = await response.json();
                saved = body;
                document.getElementById('configPath').textContent = body.path || '';
                if (body.error) {
                    showError(body.error);
                }
            } catch (error) {
                // the playground is out of reach: the page compares against what it last read
            }
        }

        async function saveServerConfig() {
            hideError();
            document.getElementById('saveButton').disabled = true;
            try {
                const { response, answer } = await sendJson('PUT', '/config', collectConfig());
                if (response.ok) {
                    saved = answer;
                    document.getElementById('configPath').textContent = answer.path || '';
                    if (answer.config) {
                        document.getElementById('hostInput').value = answer.config.host;
                        document.getElementById('portInput').value = String(answer.config.port);
                    }
                    saveDraft();
                } else {
                    const message = answer.error || ('HTTP ' + response.status);
                    showError(message);
                    markRow(message, 'page');
                }
            } catch (error) {
                showError(error.message);
            } finally {
                renderStates();
            }
        }

        async function refreshStatus() {
            try {
                const response = await fetch(API + '/status', { cache: 'no-store' });
                if (response.ok) {
                    renderStatus(await response.json());
                }
            } catch (error) {
                // the playground is out of reach: the view keeps what it last knew
            }
        }

        async function refreshAll() {
            await loadServerConfig();
            await refreshStatus();
        }

        function renderStatus(next) {
            status = next && typeof next === 'object' ? next : { running: false };
            const running = !!status.running;
            document.getElementById('statusDot').dataset.state = running ? 'running' : 'stopped';
            document.getElementById('statusText').textContent = running ? 'Running' : 'Stopped';
            const url = document.getElementById('statusUrl');
            const models = document.getElementById('statusModels');
            url.textContent = running ? status.base_url : '';
            models.textContent = running ? status.models.join(', ') + (status.open ? ' · open' : '') : '';
            url.classList.toggle('hidden', !running);
            models.classList.toggle('hidden', !running);
            const dashboard = document.getElementById('dashboardLink');
            dashboard.href = running && status.dashboard_url ? status.dashboard_url : '#';
            dashboard.classList.toggle('hidden', !(running && status.dashboard_url));
            const toggle = document.getElementById('serverToggle');
            toggle.dataset.state = running ? 'running' : 'stopped';
            document.getElementById('serverToggleLabel').textContent = running ? 'Stop' : 'Start';
            document.getElementById('serverToggleStart').classList.toggle('hidden', running);
            document.getElementById('serverToggleStop').classList.toggle('hidden', !running);
            renderStates();
        }

        function toggleServer() {
            return status.running ? stopServer() : startServer();
        }

        // Start and Restart run the saved file, so the body is empty and unsaved edits stay unsaved
        async function startServer() {
            const toggle = document.getElementById('serverToggle');
            hideError();
            toggle.disabled = true;
            try {
                const { response, answer } = await postJson('/start', {});
                if (response.ok) {
                    renderStatus(answer);
                } else {
                    const message = answer.error || ('HTTP ' + response.status);
                    showError(message);
                    markRow(message, 'saved');
                    // started from another tab: the button becomes Stop
                    if (response.status === 409) {
                        refreshAll();
                    }
                }
            } catch (error) {
                showError(error.message);
            } finally {
                toggle.disabled = false;
            }
        }

        // a refused table leaves the old server running; a failed bind leaves none, so the status is read again
        async function restartServer() {
            const restart = document.getElementById('restartButton');
            const toggle = document.getElementById('serverToggle');
            hideError();
            restart.disabled = true;
            toggle.disabled = true;
            try {
                const { response, answer } = await postJson('/restart', {});
                if (response.ok) {
                    renderStatus(answer);
                } else {
                    const message = answer.error || ('HTTP ' + response.status);
                    showError(message);
                    markRow(message, 'saved');
                    await refreshStatus();
                }
            } catch (error) {
                showError(error.message);
            } finally {
                restart.disabled = false;
                toggle.disabled = false;
            }
        }

        async function stopServer() {
            const toggle = document.getElementById('serverToggle');
            hideError();
            toggle.disabled = true;
            try {
                const { response, answer } = await postJson('/stop', {});
                if (response.ok) {
                    renderStatus({ running: false });
                } else {
                    showError(answer.error || ('HTTP ' + response.status));
                }
            } catch (error) {
                showError(error.message);
            } finally {
                toggle.disabled = false;
            }
        }

        function hideError() {
            const error = document.getElementById('serverError');
            error.textContent = '';
            error.classList.add('hidden');
            document.querySelectorAll('.invalid').forEach((item) => item.classList.remove('invalid'));
        }

        function showError(message) {
            const error = document.getElementById('serverError');
            error.textContent = message;
            error.classList.remove('hidden');
        }

        function clearRing(row) {
            row.classList.remove('invalid');
            row.querySelectorAll('.invalid').forEach((item) => item.classList.remove('invalid'));
        }

        // the server names a row by its index, and mostly the cell too: that cell is ringed, else the whole row.
        // A save names the index of the page's table; a start or restart the index of the saved file, which
        // the page finds again by content, as the table may have changed since
        function markRow(message, source) {
            const config = source === 'saved' && saved && saved.config ? saved.config : null;
            const key = /^api_keys\\[(\\d+)\\]/.exec(message);
            if (key) {
                const index = Number(key[1]);
                let input = null;
                if (source === 'saved') {
                    const wanted = config && Array.isArray(config.api_keys) ? config.api_keys[index] : undefined;
                    input = typeof wanted === 'string' ? keyInputs().find((item) => item.value.trim() === wanted.trim()) : null;
                } else {
                    input = keyInputs()[index];
                }
                if (input) {
                    input.classList.add('invalid');
                }
                return;
            }
            const model = /^models\\[(\\d+)\\](?:(?:: |\\.)(model_id|base_url|api_key|server_model_id|client_type)\\b)?/.exec(message);
            if (!model) {
                return;
            }
            const index = Number(model[1]);
            let row = null;
            if (source === 'saved') {
                const wanted = config && Array.isArray(config.models) ? config.models[index] : undefined;
                row = wanted && typeof wanted === 'object' ? modelRows().find((item) => rowKey(rowCells(item)) === rowKey(wanted)) : null;
            } else {
                row = modelRows()[index];
            }
            if (!row) {
                return;
            }
            if (!model[2]) {
                row.classList.add('invalid');
            } else if (model[2] === 'client_type') {
                row.querySelector('[data-combobox-button]').classList.add('invalid');
            } else {
                rowCell(row, model[2]).classList.add('invalid');
            }
        }

        (async () => {
            await loadServerConfig();
            restoreTable();
            await refreshStatus();
        })();
        updateThemeToggle();
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeToggle);
        document.fonts.ready.then(updateThemeToggle);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                refreshAll();
            }
        });
    </script>
</body>
</html>
"""
