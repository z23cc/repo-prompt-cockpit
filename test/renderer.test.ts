import { describe, expect, it } from 'vitest';
import {
  capabilityStatusLabel,
  formatTimestamp,
  metaLine,
  observationLabel,
  pluralize,
  progressLabel,
  severityLabel,
  stateLabel
} from '../src/renderer/components/format.js';

describe('renderer format helpers', () => {
  it('returns explicit labels for each observation kind without inventing data', () => {
    expect(observationLabel('observed')).toBe('observed');
    expect(observationLabel('inferred')).toBe('inferred');
    expect(observationLabel('fixture')).toBe('fixture');
    expect(observationLabel('unavailable')).toBe('unavailable');
  });

  it('humanizes session states including the unavailable fallback', () => {
    expect(stateLabel('waiting_for_input')).toBe('waiting for input');
    expect(stateLabel('running')).toBe('running');
    expect(stateLabel('blocked')).toBe('blocked');
    expect(stateLabel('failed')).toBe('failed');
    expect(stateLabel('completed')).toBe('completed');
    expect(stateLabel('idle')).toBe('idle');
    expect(stateLabel('unknown')).toBe('unknown');
    expect(stateLabel('unavailable')).toBe('unavailable');
  });

  it('formats progress only when finite and undefined otherwise', () => {
    expect(progressLabel(0)).toBe('0%');
    expect(progressLabel(0.5)).toBe('50%');
    expect(progressLabel(1)).toBe('100%');
    expect(progressLabel(undefined)).toBeUndefined();
    expect(progressLabel(Number.NaN)).toBeUndefined();
    expect(progressLabel(Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it('joins meta lines with the middle dot separator and skips empties', () => {
    expect(metaLine(['a', undefined, 'b', ''])).toBe('a · b');
    expect(metaLine([undefined, undefined])).toBe('');
    expect(metaLine(['solo'])).toBe('solo');
  });

  it('passes severity and capability status labels through unchanged', () => {
    expect(severityLabel('warning')).toBe('warning');
    expect(severityLabel('error')).toBe('error');
    expect(capabilityStatusLabel('error')).toBe('error');
    expect(capabilityStatusLabel('available')).toBe('available');
  });

  it('pluralizes deterministically without inventing irregular forms', () => {
    expect(pluralize(0, 'session')).toBe('0 sessions');
    expect(pluralize(1, 'session')).toBe('1 session');
    expect(pluralize(3, 'entry', 'entries')).toBe('3 entries');
  });

  it('falls back to a stable label when timestamps are missing or unparseable', () => {
    expect(formatTimestamp(undefined)).toBe('unknown');
    expect(formatTimestamp('not-a-date')).toBe('not-a-date');
  });
});
