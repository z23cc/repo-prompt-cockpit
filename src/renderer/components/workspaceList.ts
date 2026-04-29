import type { WorkspaceView } from '../../domain/dashboard.js';
import { el } from './dom.js';
import { observationLabel, pluralize } from './format.js';

export function workspaceList(workspaces: WorkspaceView[]): HTMLElement {
  const body = workspaces.length === 0
    ? el('p', { class: 'muted panel-empty' }, [
        'No RepoPrompt workspaces observed in the current snapshot.'
      ])
    : el(
        'ul',
        { class: 'workspace-list' },
        workspaces.map((workspace) =>
          el('li', { class: 'workspace-row' }, [
            el('div', { class: 'workspace-row-head' }, [
              el('span', { class: `badge badge-${workspace.observation}` }, [
                observationLabel(workspace.observation)
              ]),
              el('span', { class: 'workspace-name' }, [workspace.workspace])
            ]),
            workspace.repoPath ? el('p', { class: 'muted small' }, [workspace.repoPath]) : null,
            el('p', { class: 'muted small' }, [
              `${pluralize(workspace.windowIds.length, 'window')} · ${pluralize(workspace.tabCount, 'tab')}${
                workspace.activeTabCount > 0 ? ` · ${workspace.activeTabCount} active` : ''
              }`
            ])
          ])
        )
      );

  return el('section', { class: 'panel workspace-panel', attrs: { id: 'workspaces' } }, [
    el('header', { class: 'panel-head' }, [
      el('h2', { class: 'panel-title' }, ['Workspaces']),
      el('span', { class: 'panel-sub muted' }, [pluralize(workspaces.length, 'workspace')])
    ]),
    body
  ]);
}
