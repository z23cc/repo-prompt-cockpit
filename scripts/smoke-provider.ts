import { readFile } from 'node:fs/promises';
import { loadConfig } from '../src/shared/config.js';
import { RpCliProvider } from '../src/repoprompt/providers/index.js';
import type { CommandRunner } from '../src/shared/types.js';

const mode = process.argv[2];
const controlPlaneWindowId = 12;

const socketDeniedRunner: CommandRunner = async (_executable, args) => {
  if (args.includes('--help')) return { stdout: 'RepoPrompt MCP CLI', stderr: '', exitCode: 0 };
  if (args.includes('windows')) return { stdout: '', stderr: 'Failed to connect: permission denied (errno 1)', exitCode: 1 };
  return { stdout: '', stderr: 'Multiple RepoPrompt windows detected. Bind your connection to route tool calls.', exitCode: 1 };
};

async function createBindingTargetRunner(): Promise<{ runner: CommandRunner; attempts: Array<{ payload: unknown; exitCode: number }> }> {
  const windowsOutput = await readFile(new URL('../test/fixtures/rp-windows.txt', import.meta.url), 'utf8');
  const attempts: Array<{ payload: unknown; exitCode: number }> = [];
  const runner: CommandRunner = async (_executable, args) => {
    if (args.includes('--help')) return { stdout: 'RepoPrompt MCP CLI', stderr: '', exitCode: 0 };
    if (args.includes('windows')) return { stdout: windowsOutput, stderr: '', exitCode: 0 };

    const payload = JSON.parse(args[3] ?? '{}') as Record<string, unknown>;
    if (payload._windowID === controlPlaneWindowId) {
      attempts.push({ payload, exitCode: 0 });
      return {
        stdout: '- Smoke live session · `smoke-live-session` · running · codexExec',
        stderr: '',
        exitCode: 0
      };
    }
    attempts.push({ payload, exitCode: 1 });
    return { stdout: '', stderr: 'Multiple RepoPrompt windows detected. Bind your connection to route tool calls.', exitCode: 1 };
  };
  return { runner, attempts };
}

const bindingTarget = mode === 'binding-target' ? await createBindingTargetRunner() : undefined;
const provider = mode === 'socket-denied'
  ? new RpCliProvider(loadConfig(), socketDeniedRunner)
  : mode === 'binding-target' && bindingTarget
    ? new RpCliProvider(loadConfig(), bindingTarget.runner)
    : new RpCliProvider(loadConfig());

const snapshot = await provider.collectSnapshot();

if (mode === 'missing-rp-cli' && !snapshot.diagnostics.some((diagnostic) => diagnostic.code === 'rp_cli_unavailable')) {
  throw new Error('Missing rp-cli diagnostic was not emitted.');
}

if (mode === 'socket-denied' && !snapshot.diagnostics.some((diagnostic) => diagnostic.code.includes('permission_denied') || diagnostic.message.includes('permission denied'))) {
  throw new Error('Socket permission diagnostic was not emitted.');
}

if (mode === 'binding-target') {
  if (snapshot.sessions.length === 0) throw new Error('Binding-target smoke did not render session rows.');
  if (snapshot.capabilities.find((entry) => entry.field === 'agentSessionStates')?.status !== 'available') {
    throw new Error('Binding-target smoke did not mark agent sessions available.');
  }
  if (snapshot.diagnostics.some((diagnostic) => diagnostic.code === 'session_status_requires_binding')) {
    throw new Error('Binding-target smoke retained a retryable binding warning after recovery.');
  }
  if (!bindingTarget?.attempts.some((attempt) => JSON.stringify(attempt.payload).includes('"_windowID":12'))) {
    throw new Error('Binding-target smoke did not attempt the hidden _windowID selector.');
  }
  if (!snapshot.sessions.some((session) => session.model === 'codexExec' && session.state === 'running')) {
    throw new Error('Binding-target smoke did not parse markdown session output.');
  }
}

console.log(JSON.stringify({
  diagnostics: snapshot.diagnostics,
  capabilities: snapshot.capabilities,
  sessions: snapshot.sessions,
  attemptedPayloads: bindingTarget?.attempts.map((attempt) => attempt.payload) ?? [],
  succeededPayloads: bindingTarget?.attempts.filter((attempt) => attempt.exitCode === 0).map((attempt) => attempt.payload) ?? []
}, null, 2));
