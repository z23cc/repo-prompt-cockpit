import type { ControlPlaneConfig } from './types.js';

const DEFAULT_SUMMARY_MAX_CHARS = 1200;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ControlPlaneConfig {
  return {
    rpCliPath: env.RP_CLI_PATH?.trim() || 'rp-cli',
    pollingIntervalMs: Number.parseInt(env.RP_CONTROL_PLANE_POLL_MS || '15000', 10),
    staleAfterMinutes: Number.parseInt(env.RP_CONTROL_PLANE_STALE_MINUTES || '30', 10),
    enableLlmSummaries: env.RP_CONTROL_PLANE_ENABLE_LLM === '1',
    summaryMaxChars: Number.parseInt(env.RP_CONTROL_PLANE_SUMMARY_MAX_CHARS || String(DEFAULT_SUMMARY_MAX_CHARS), 10),
    preferDemoProvider: env.RP_CONTROL_PLANE_DEMO === '1'
  };
}

export { DEFAULT_SUMMARY_MAX_CHARS };
