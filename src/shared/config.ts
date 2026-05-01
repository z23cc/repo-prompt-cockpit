import { existsSync } from 'node:fs';
import { delimiter, isAbsolute, join } from 'node:path';

import type { ControlPlaneConfig } from './types.js';

const DEFAULT_SUMMARY_MAX_CHARS = 1200;
const DEFAULT_DESKTOP_WINDOW_WIDTH = 1280;
const DEFAULT_DESKTOP_WINDOW_HEIGHT = 860;
const DEFAULT_MINIMAL_WINDOW_WIDTH = 540;
const DEFAULT_MINIMAL_WINDOW_HEIGHT = 620;
const DEFAULT_RP_CLI_PATHS = ['/opt/homebrew/bin/rp-cli', '/usr/local/bin/rp-cli'];

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ControlPlaneConfig {
  return {
    rpCliPath: resolveRpCliPath(env),
    pollingIntervalMs: parsePositiveInteger(env.RP_CONTROL_PLANE_POLL_MS, 15000),
    staleAfterMinutes: parsePositiveInteger(env.RP_CONTROL_PLANE_STALE_MINUTES, 30),
    enableLlmSummaries: env.RP_CONTROL_PLANE_ENABLE_LLM === '1',
    summaryMaxChars: parsePositiveInteger(env.RP_CONTROL_PLANE_SUMMARY_MAX_CHARS, DEFAULT_SUMMARY_MAX_CHARS),
    preferDemoProvider: env.RP_CONTROL_PLANE_DEMO === '1',
    openWindowOnStart: env.RP_CONTROL_PLANE_OPEN_WINDOW !== '0',
    desktopWindowWidth: parsePositiveInteger(env.RP_CONTROL_PLANE_WINDOW_WIDTH, DEFAULT_DESKTOP_WINDOW_WIDTH),
    desktopWindowHeight: parsePositiveInteger(env.RP_CONTROL_PLANE_WINDOW_HEIGHT, DEFAULT_DESKTOP_WINDOW_HEIGHT),
    minimalWindowWidth: parsePositiveInteger(env.RP_CONTROL_PLANE_MINIMAL_WINDOW_WIDTH, DEFAULT_MINIMAL_WINDOW_WIDTH),
    minimalWindowHeight: parsePositiveInteger(env.RP_CONTROL_PLANE_MINIMAL_WINDOW_HEIGHT, DEFAULT_MINIMAL_WINDOW_HEIGHT)
  };
}

export function resolveRpCliPath(
  env: Partial<Pick<NodeJS.ProcessEnv, 'PATH' | 'RP_CLI_PATH'>> = process.env,
  fallbackPaths: string[] = DEFAULT_RP_CLI_PATHS
): string {
  const explicitPath = env.RP_CLI_PATH?.trim();
  if (explicitPath) return explicitPath;

  for (const searchPath of splitAbsolutePathEntries(env.PATH)) {
    const candidate = join(searchPath, 'rp-cli');
    if (existsSync(candidate)) return candidate;
  }

  return fallbackPaths.find((candidate) => existsSync(candidate)) ?? 'rp-cli';
}

function splitAbsolutePathEntries(pathValue: string | undefined): string[] {
  return (pathValue ?? '')
    .split(delimiter)
    .filter((entry) => entry.length > 0 && isAbsolute(entry));
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export {
  DEFAULT_DESKTOP_WINDOW_HEIGHT,
  DEFAULT_DESKTOP_WINDOW_WIDTH,
  DEFAULT_MINIMAL_WINDOW_HEIGHT,
  DEFAULT_MINIMAL_WINDOW_WIDTH,
  DEFAULT_SUMMARY_MAX_CHARS
};
