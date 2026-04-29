import type { MenuItemConstructorOptions } from 'electron';
import type { AgentSession, ControlPlaneSnapshot, ObservationKind, SessionState, WindowMode } from '../shared/types.js';
import { deriveAttentionItems } from '../domain/attention.js';
import { createDeterministicSummary } from '../domain/summary.js';

export interface TrayMenuActions {
  windowMode: WindowMode;
  openControlPlane(): void;
  toggleWindowMode(): void;
  refreshNow(): void;
  copySummary(): void;
  switchToFixtureMode(): void;
  switchToLiveMode(): void;
  quit(): void;
}

const SESSION_GROUPS: Array<{ state: SessionState; label: string }> = [
  { state: 'waiting_for_input', label: 'Waiting' },
  { state: 'blocked', label: 'Blocked' },
  { state: 'failed', label: 'Failed' },
  { state: 'running', label: 'Running' },
  { state: 'idle', label: 'Idle' },
  { state: 'completed', label: 'Completed' },
  { state: 'unknown', label: 'Unknown' }
];

const MAX_TRAY_SESSION_ROWS = 10;
const MAX_TRAY_WORKSPACE_ROWS = 6;

export function buildTrayTitle(snapshot: ControlPlaneSnapshot): string {
  const totalSessions = snapshot.sessions.length;
  const running = snapshot.sessions.filter((session) => session.state === 'running').length;
  const waiting = snapshot.sessions.filter((session) => session.state === 'waiting_for_input').length;
  const diagnosticErrors = snapshot.diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  if (snapshot.provider === 'demo-fixture') return `RPC demo ${totalSessions}s ${running}▶ ${waiting}?`;
  if (diagnosticErrors > 0) return `RPC ! ${diagnosticErrors}`;
  return `RPC ${totalSessions}s ${running}▶ ${waiting}?`;
}

export function buildTrayTemplate(snapshot: ControlPlaneSnapshot, actions: TrayMenuActions): MenuItemConstructorOptions[] {
  const attention = deriveAttentionItems(snapshot);
  const summary = createDeterministicSummary(snapshot);

  return compactMenu([
    disabledHeader(`${snapshot.provider === 'demo-fixture' ? 'Fixture demo' : 'Live'} status — ${snapshot.windows.length} workspace${snapshot.windows.length === 1 ? '' : 's'}`),
    disabledRow(`Updated ${new Date(snapshot.generatedAt).toLocaleTimeString()}`),
    separator(),
    disabledHeader('Focus next'),
    ...attention.slice(0, 5).map<MenuItemConstructorOptions>((item) => ({
      label: `${observationLabel(item.observation)} ${item.label}`,
      sublabel: item.detail,
      enabled: false
    })),
    separator(),
    disabledHeader('Sessions'),
    ...sessionRows(snapshot.sessions),
    separator(),
    disabledHeader('Workspaces'),
    ...workspaceRows(snapshot),
    separator(),
    disabledHeader('Capabilities'),
    ...snapshot.capabilities.map<MenuItemConstructorOptions>((entry) => ({
      label: `${observationLabel(entry.observation)} ${entry.status}: ${entry.field}`,
      sublabel: entry.failureMode,
      enabled: false
    })),
    snapshot.diagnostics.length > 0 ? separator() : undefined,
    snapshot.diagnostics.length > 0 ? disabledHeader('Diagnostics') : undefined,
    ...snapshot.diagnostics.map<MenuItemConstructorOptions>((diagnostic) => ({
      label: `${diagnosticObservationLabel(snapshot)} ${diagnostic.severity}: ${diagnostic.code}`,
      sublabel: diagnostic.message,
      enabled: false
    })),
    separator(),
    disabledHeader('Actions'),
    { label: truncateLabel(summary), enabled: false },
    { label: 'Open Cockpit', click: actions.openControlPlane },
    { label: actions.windowMode === 'minimal' ? 'Return to Desktop mode' : 'Enter Minimal mode', click: actions.toggleWindowMode },
    { label: 'Refresh now', click: actions.refreshNow },
    { label: 'Copy summary', click: actions.copySummary },
    { label: 'Use fixture demo mode', click: actions.switchToFixtureMode, visible: snapshot.provider !== 'demo-fixture' },
    { label: 'Use live rp-cli mode', click: actions.switchToLiveMode, visible: snapshot.provider === 'demo-fixture' },
    separator(),
    { label: 'Quit', click: actions.quit }
  ]);
}

function sessionRows(sessions: AgentSession[]): MenuItemConstructorOptions[] {
  if (sessions.length === 0) {
    return [disabledRow('[unavailable] No live session rows available')];
  }

  const grouped = SESSION_GROUPS.flatMap(({ state, label }) => {
    const groupSessions = sessions.filter((session) => session.state === state);
    if (groupSessions.length === 0) return [];
    return [
      disabledRow(`${label} (${groupSessions.length})`),
      ...groupSessions.map<MenuItemConstructorOptions>((session) => ({
        label: `${observationLabel(session.observation)} ${session.title}`,
        sublabel: sessionSublabel(session),
        enabled: false
      }))
    ];
  });

  if (grouped.length <= MAX_TRAY_SESSION_ROWS + SESSION_GROUPS.length) return grouped;
  const visibleRows = grouped.slice(0, MAX_TRAY_SESSION_ROWS + 2);
  visibleRows.push(disabledRow(`… ${sessions.length - Math.min(sessions.length, MAX_TRAY_SESSION_ROWS)} more session rows hidden`));
  return visibleRows;
}

function workspaceRows(snapshot: ControlPlaneSnapshot): MenuItemConstructorOptions[] {
  if (snapshot.windows.length === 0) {
    return [disabledRow('[unavailable] No RepoPrompt workspaces observed')];
  }

  const visible = snapshot.windows.slice(0, MAX_TRAY_WORKSPACE_ROWS).map<MenuItemConstructorOptions>((window) => {
    const activeTab = window.tabs.find((tab) => tab.active);
    return {
      label: `${observationLabel(window.observation)} ${window.workspace}`,
      sublabel: [window.repoPath, activeTab ? `active: ${activeTab.name}${activeTab.contextId ? ` · ${activeTab.contextId}` : ''}` : undefined]
        .filter(Boolean)
        .join(' — '),
      enabled: false
    };
  });

  if (snapshot.windows.length > MAX_TRAY_WORKSPACE_ROWS) {
    visible.push(disabledRow(`… ${snapshot.windows.length - MAX_TRAY_WORKSPACE_ROWS} more workspaces hidden`));
  }

  return visible;
}

function sessionSublabel(session: AgentSession): string {
  const parts = [
    session.state.replaceAll('_', ' '),
    typeof session.progress === 'number' ? `${Math.round(session.progress * 100)}%` : undefined,
    session.workspace,
    session.model
  ].filter(Boolean);
  return parts.join(' · ');
}

function diagnosticObservationLabel(snapshot: ControlPlaneSnapshot): string {
  return observationLabel(snapshot.provider === 'demo-fixture' ? 'fixture' : 'observed');
}

function observationLabel(observation: ObservationKind): string {
  switch (observation) {
    case 'observed':
      return '[observed]';
    case 'fixture':
      return '[fixture]';
    case 'inferred':
      return '[inferred]';
    case 'unavailable':
      return '[unavailable]';
  }
}

function disabledHeader(label: string): MenuItemConstructorOptions {
  return { label, enabled: false };
}

function disabledRow(label: string): MenuItemConstructorOptions {
  return { label, enabled: false };
}

function separator(): MenuItemConstructorOptions {
  return { type: 'separator' };
}

function compactMenu(items: Array<MenuItemConstructorOptions | undefined>): MenuItemConstructorOptions[] {
  return items.filter((item): item is MenuItemConstructorOptions => Boolean(item));
}

function truncateLabel(summary: string): string {
  const firstLine = summary.split('\n')[0] ?? 'Summary unavailable';
  return firstLine.length > 72 ? `${firstLine.slice(0, 71)}…` : firstLine;
}
