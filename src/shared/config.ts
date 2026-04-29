import type { ControlPlaneConfig } from './types.js';

const DEFAULT_SUMMARY_MAX_CHARS = 1200;
const DEFAULT_DESKTOP_WINDOW_WIDTH = 1280;
const DEFAULT_DESKTOP_WINDOW_HEIGHT = 860;
const DEFAULT_MINIMAL_WINDOW_WIDTH = 540;
const DEFAULT_MINIMAL_WINDOW_HEIGHT = 620;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ControlPlaneConfig {
  return {
    rpCliPath: env.RP_CLI_PATH?.trim() || 'rp-cli',
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
