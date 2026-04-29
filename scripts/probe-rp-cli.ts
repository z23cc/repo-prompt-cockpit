import { loadConfig } from '../src/shared/config.js';
import { RpCliProvider } from '../src/repoprompt/providers/index.js';
import { createDeterministicSummary } from '../src/domain/summary.js';

const provider = new RpCliProvider(loadConfig());
const snapshot = await provider.collectSnapshot();

console.log(JSON.stringify({
  generatedAt: snapshot.generatedAt,
  provider: snapshot.provider,
  windows: snapshot.windows.map((window) => ({ id: window.id, workspace: window.workspace, repoPath: window.repoPath })),
  sessions: snapshot.sessions.map((session) => ({ id: session.id, title: session.title, state: session.state, workspace: session.workspace })),
  capabilities: snapshot.capabilities,
  diagnostics: snapshot.diagnostics,
  summary: createDeterministicSummary(snapshot)
}, null, 2));
