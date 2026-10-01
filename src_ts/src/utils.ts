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

import { UsageMetadata } from "./types";

/**
 * Fix the usage metadata for OpenRouter.
 *
 * OpenRouter occasionally does not include the reasoning tokens to the completion tokens.
 *
 * @param usageMetadata - The usage metadata.
 * @param baseUrl - The API URL.
 * @returns The fixed usage metadata.
 */
export function fixOpenrouterUsageMetadata(
  usageMetadata: UsageMetadata,
  baseUrl: string,
): UsageMetadata {
  const fixedUsageMetadata = { ...usageMetadata };
  if (
    baseUrl.includes("openrouter.ai") &&
    fixedUsageMetadata.response_tokens !== null &&
    fixedUsageMetadata.response_tokens < 0
  ) {
    fixedUsageMetadata.response_tokens +=
      fixedUsageMetadata.thoughts_tokens || 0;
  }

  return fixedUsageMetadata;
}

/**
 * Whether MMSP_DEBUG asks the clients to fail loudly on output they do not recognize.
 *
 * Streaming clients skip an unrecognized event so that a gateway's own frames cannot
 * kill a long generation. The same silence hides a genuinely new provider event, so the
 * guards stay one environment variable away.
 *
 * @returns Whether debug mode is on.
 */
/**
 * The key and the endpoint of a client that reads the environment's OPENAI_API_KEY,
 * ANTHROPIC_API_KEY or GEMINI_API_KEY. A key passed in is used as it is. Without one, the environment's key goes
 * out only to the endpoint the environment names: a base URL passed in is another endpoint,
 * which that key was not given for, so it needs a key of its own.
 *
 * @param client - The client's class name, for the error
 * @param options - The key and the base URL passed to the client
 * @param env - The environment variables that hold the key and the base URL
 * @returns The key and the base URL to build the SDK client with, either of which may be undefined
 */
export function resolveCredentials(
  client: string,
  options: { apiKey?: string; baseUrl?: string | null },
  env: { key: string; baseUrl: string },
): { apiKey: string | undefined; baseUrl: string | undefined } {
  if (options.apiKey) {
    return {
      apiKey: options.apiKey,
      baseUrl: options.baseUrl || process.env[env.baseUrl] || undefined,
    };
  }
  if (options.baseUrl) {
    throw new Error(
      `apiKey is required for ${client} with a baseUrl: ${env.key} is not sent to another endpoint.`,
    );
  }
  return {
    apiKey: process.env[env.key] || undefined,
    baseUrl: process.env[env.baseUrl] || undefined,
  };
}

export function isDebugEnabled(): boolean {
  const flag = (process.env.MMSP_DEBUG || "").trim().toLowerCase();
  return !["", "0", "false", "no", "off"].includes(flag);
}

/** Pixel dimensions read from an image header. */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Read the pixel dimensions from the header of a PNG, JPEG, GIF or WebP image.
 *
 * Only the header is inspected, so the bytes may be a prefix of the file; a
 * prefix that ends before the dimensions are reached reads as unrecognized.
 *
 * @param bytes - The image bytes, or a prefix of them.
 * @returns The dimensions, or null when the bytes are not a recognized image.
 */
export function imageDimensions(bytes: Buffer): ImageDimensions | null {
  // PNG: an 8-byte signature, then the IHDR chunk with width and height
  if (
    bytes.length >= 24 &&
    bytes.toString("latin1", 0, 8) === "\x89PNG\r\n\x1a\n" &&
    bytes.toString("latin1", 12, 16) === "IHDR"
  ) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }

  // GIF: the logical screen size follows the 6-byte signature
  if (
    bytes.length >= 10 &&
    ["GIF87a", "GIF89a"].includes(bytes.toString("latin1", 0, 6))
  ) {
    return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  }

  // WebP: a RIFF container whose first chunk names the bitstream flavour
  if (
    bytes.length >= 30 &&
    bytes.toString("latin1", 0, 4) === "RIFF" &&
    bytes.toString("latin1", 8, 12) === "WEBP"
  ) {
    const chunk = bytes.toString("latin1", 12, 16);
    if (
      chunk === "VP8 " &&
      bytes[23] === 0x9d &&
      bytes[24] === 0x01 &&
      bytes[25] === 0x2a
    ) {
      // lossy: a 3-byte frame tag and the key frame start code precede the size,
      // whose top two bits are a scaling hint
      return {
        width: bytes.readUInt16LE(26) & 0x3fff,
        height: bytes.readUInt16LE(28) & 0x3fff,
      };
    }
    if (chunk === "VP8L" && bytes[20] === 0x2f) {
      // lossless: 14 bits of width minus one, then 14 bits of height minus one
      const bits = bytes.readUInt32LE(21);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
      };
    }
    if (chunk === "VP8X") {
      // extended: the canvas size minus one, 24 bits each, after the flags
      return {
        width: bytes.readUIntLE(24, 3) + 1,
        height: bytes.readUIntLE(27, 3) + 1,
      };
    }
    return null;
  }

  // JPEG: walk the marker segments to the first frame header (SOFn)
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        return null;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xff) {
        // fill byte ahead of a marker
        offset += 1;
        continue;
      }
      if (
        marker === 0x01 ||
        marker === 0xd8 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        // TEM, SOI and RSTn stand alone, without a length
        offset += 2;
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) {
        // end of image, or scan data before any frame header
        return null;
      }
      const frameHeader =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (frameHeader) {
        if (offset + 8 >= bytes.length) {
          return null;
        }
        // length, precision, then height before width
        return {
          width: bytes.readUInt16BE(offset + 7),
          height: bytes.readUInt16BE(offset + 5),
        };
      }
      offset += 2 + bytes.readUInt16BE(offset + 2);
    }
    return null;
  }

  return null;
}

/**
 * The patch count above which the OpenAI vision API rejects an image instead
 * of resizing it (Images and vision guide, "Choose an image detail level":
 * https://developers.openai.com/api/docs/guides/images-vision).
 */
const OPENAI_PATCH_LIMIT = 30000;

/**
 * The longest side the OpenAI vision API keeps at `original` detail; a larger
 * image is scaled down to fit it before the patches are counted (the same
 * guide, model sizing table).
 */
const OPENAI_ORIGINAL_MAX_SIDE = 65535;

/**
 * Base64 characters decoded first: 48 bytes, enough for any PNG, GIF or WebP
 * header. A JPEG's frame header may sit behind metadata segments, so its
 * window grows by the factor below until the header is found or the payload
 * runs out.
 */
const HEADER_PROBE_CHARS = 64;
const HEADER_WINDOW_GROWTH = 4;

/**
 * Locate the payload of a base64 data URL.
 *
 * @param dataUrl - The URL.
 * @returns The index of the payload's first character, or -1 when the URL is
 *   not a base64 data URL.
 */
function base64PayloadStart(dataUrl: string): number {
  if (!dataUrl.startsWith("data:")) {
    return -1;
  }
  const comma = dataUrl.indexOf(",");
  if (comma < 0) {
    return -1;
  }
  // the token is case-insensitive and may follow a space, as a browser reads it
  const params = dataUrl
    .slice(5, comma)
    .split(";")
    .map((param) => param.trim().toLowerCase());
  return params.includes("base64") ? comma + 1 : -1;
}

/**
 * Whether the OpenAI vision API would reject an image at `original` detail.
 *
 * The API covers an image with 32-pixel patches and rejects one that needs
 * more than 30,000 of them after its own resizing; at `original` detail the
 * only resizing is the 65,535-pixel cap on either side. Only a base64 data URL
 * can be measured here: an HTTP(S) URL answers false. The Responses clients
 * pass such a URL through for the API to fetch; the Chat client fetches it
 * into a data URL first, so it measures the fetched bytes.
 *
 * @param imageUrl - The image URL.
 * @returns Whether the API would reject the image.
 */
export function exceedsOpenaiPatchLimit(imageUrl: string): boolean {
  const start = base64PayloadStart(imageUrl);
  if (start < 0) {
    return false;
  }
  // Decode a growing prefix rather than the whole payload. Node's decoder
  // skips whitespace, accepts the URL-safe alphabet and yields the bytes that
  // are complete at a cut, so the window is sliced by character count alone.
  let size: ImageDimensions | null = null;
  for (let chars = HEADER_PROBE_CHARS; ; chars *= HEADER_WINDOW_GROWTH) {
    const bytes = Buffer.from(imageUrl.slice(start, start + chars), "base64");
    size = imageDimensions(bytes);
    if (
      size !== null ||
      bytes[0] !== 0xff ||
      bytes[1] !== 0xd8 ||
      start + chars >= imageUrl.length
    ) {
      break;
    }
  }
  if (size === null) {
    return false;
  }

  let { width, height } = size;
  const longest = Math.max(width, height);
  if (longest > OPENAI_ORIGINAL_MAX_SIDE) {
    width = Math.round((width * OPENAI_ORIGINAL_MAX_SIDE) / longest);
    height = Math.round((height * OPENAI_ORIGINAL_MAX_SIDE) / longest);
  }
  return Math.ceil(width / 32) * Math.ceil(height / 32) > OPENAI_PATCH_LIMIT;
}

/**
 * The `detail` an OpenAI image part needs so that the API reads the image.
 *
 * GPT-5.6 reads the default `auto` detail as `original`, which keeps the
 * image's own dimensions and rejects one over 30,000 patches instead of
 * resizing it; `high` has the API fit it into 2,500 patches, so the image is
 * read instead of refused. Every other model keeps a patch budget at every
 * detail level, so no other model gets the field.
 *
 * @param model - The model id the request is sent with.
 * @param imageUrl - The image URL as it goes on the wire.
 * @returns `"high"` when the image needs it, otherwise undefined.
 */
export function openaiImageDetail(
  model: string,
  imageUrl: string,
): "high" | undefined {
  return model.toLowerCase().includes("gpt-5.6") &&
    exceedsOpenaiPatchLimit(imageUrl)
    ? "high"
    : undefined;
}

/**
 * Split a two-speaker TTS script into turns, for the TTS models that take each turn's speaker
 * as metadata rather than as a label in the text.
 *
 * A line that starts with a configured speaker's name and a colon ("Joe: How's it going?")
 * begins that speaker's turn; any other line continues the turn before it.
 *
 * @param text - The script, one "Name: line" per turn
 * @param speakers - The speaker names the request configures
 * @returns [speaker, text] per turn, in order
 * @throws Error when the script does not begin with a speaker's label
 */
export function speakerTurns(
  text: string,
  speakers: string[],
): [string, string][] {
  const turns: [string, string[]][] = [];
  for (const line of text.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    const name = colon === -1 ? "" : line.slice(0, colon).trim();
    if (colon !== -1 && speakers.includes(name)) {
      turns.push([name, [line.slice(colon + 1).trim()]]);
    } else if (turns.length > 0) {
      turns[turns.length - 1][1].push(line);
    } else if (line.trim()) {
      throw new Error(
        `A two-speaker script must start each turn with a speaker's name and a colon, one of ${JSON.stringify(speakers)}.`,
      );
    }
  }
  return turns.map(([speaker, lines]) => [speaker, lines.join("\n").trim()]);
}
