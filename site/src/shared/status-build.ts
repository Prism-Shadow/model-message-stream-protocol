// The status probe's files as the site is built: from MMSP_STATUS_DIR (pages.yml checks the
// status-data branch out there), else from the branch on raw.githubusercontent.com, else none.

import { readFile } from "node:fs/promises";
import { STATUS_DATA_URL, type History, type Latest, type Monthly } from "./status";

export interface StatusAtBuild {
  latest: Latest | null;
  history: History | null;
  monthly: Monthly | null;
}

let loading: Promise<StatusAtBuild> | undefined;

export function statusAtBuild(): Promise<StatusAtBuild> {
  loading ??= (async () => {
    const dir = process.env.MMSP_STATUS_DIR;
    const read = async <T>(name: string): Promise<T | null> => {
      try {
        if (dir) return JSON.parse(await readFile(`${dir}/${name}`, "utf8")) as T;
        const response = await fetch(STATUS_DATA_URL + name, { signal: AbortSignal.timeout(10_000) });
        return response.ok ? ((await response.json()) as T) : null;
      } catch {
        return null;
      }
    };
    const [latest, history, monthly] = await Promise.all([
      read<Latest>("latest.json"),
      read<History>("history.json"),
      read<Monthly>("monthly.json"),
    ]);
    if (!latest) {
      console.warn(
        `[status] built without probe data (${dir ? `MMSP_STATUS_DIR=${dir}` : "raw.githubusercontent.com not reachable"})`,
      );
    }
    return { latest, history, monthly };
  })();
  return loading;
}
