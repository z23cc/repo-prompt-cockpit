import { execFile } from 'node:child_process';
import type { CommandResult, CommandRunner } from '../shared/types.js';

export const execFileRunner: CommandRunner = (executable, args, timeoutMs) => {
  return new Promise<CommandResult>((resolve) => {
    execFile(
      executable,
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({ stdout, stderr, exitCode: 0 });
          return;
        }

        const maybeError = error as NodeJS.ErrnoException & { code?: string | number };
        const exitCode = typeof maybeError.code === 'number' ? maybeError.code : 1;
        const errorMessage = maybeError.message ? `${maybeError.message}\n` : '';
        resolve({
          stdout,
          stderr: stderr || errorMessage,
          exitCode
        });
      }
    );
  });
};
