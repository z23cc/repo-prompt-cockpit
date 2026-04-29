import type { CapabilityStatus, ObservationKind, SessionState } from '../../shared/types.js';

export function observationLabel(observation: ObservationKind): string {
  switch (observation) {
    case 'observed':
      return 'observed';
    case 'inferred':
      return 'inferred';
    case 'fixture':
      return 'fixture';
    case 'unavailable':
      return 'unavailable';
  }
}

export function stateLabel(state: SessionState | 'unavailable'): string {
  switch (state) {
    case 'waiting_for_input':
      return 'waiting for input';
    case 'running':
      return 'running';
    case 'blocked':
      return 'blocked';
    case 'failed':
      return 'failed';
    case 'completed':
      return 'completed';
    case 'idle':
      return 'idle';
    case 'unknown':
      return 'unknown';
    case 'unavailable':
      return 'unavailable';
  }
}

export function progressLabel(progress: number | undefined): string | undefined {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return undefined;
  return `${Math.round(progress * 100)}%`;
}

export function metaLine(parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join(' · ');
}

export function severityLabel(severity: 'info' | 'warning' | 'error'): string {
  return severity;
}

export function capabilityStatusLabel(status: CapabilityStatus): string {
  return status;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : plural ?? `${singular}s`}`;
}

export function formatTimestamp(value: string | undefined): string {
  if (!value) return 'unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString();
}
