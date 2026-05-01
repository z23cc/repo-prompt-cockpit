import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveRpCliPath } from '../src/shared/config.js';

describe('resolveRpCliPath', () => {
  it('preserves explicit RP_CLI_PATH overrides', () => {
    expect(resolveRpCliPath({ RP_CLI_PATH: '/custom/bin/rp-cli', PATH: '' }, [])).toBe('/custom/bin/rp-cli');
  });

  it('resolves rp-cli from absolute PATH entries for GUI app launches', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'rp-cli-path-'));
    try {
      const executable = join(tempDir, 'rp-cli');
      writeFileSync(executable, '#!/bin/sh\n');

      expect(resolveRpCliPath({ PATH: `${tempDir}${delimiter}/missing` }, [])).toBe(executable);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to known install paths when PATH is unavailable', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'rp-cli-fallback-'));
    try {
      const executable = join(tempDir, 'rp-cli');
      writeFileSync(executable, '#!/bin/sh\n');

      expect(resolveRpCliPath({ PATH: '' }, [executable])).toBe(executable);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps the command name when no installed rp-cli can be found', () => {
    expect(resolveRpCliPath({ PATH: '' }, [])).toBe('rp-cli');
  });
});
