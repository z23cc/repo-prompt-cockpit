import type { SessionGroupView } from '../../domain/dashboard.js';
import { classNames, el } from './dom.js';
import { metaLine, observationLabel, pluralize, progressLabel, stateLabel } from './format.js';

export interface SessionGroupsHandlers {
  onSelect(id: string): void;
}

export function sessionGroups(
  groups: SessionGroupView[],
  selectedId: string | undefined,
  handlers: SessionGroupsHandlers
): HTMLElement {
  if (groups.length === 0) {
    return el('section', { class: 'panel session-groups-panel' }, [
      el('header', { class: 'panel-head' }, [
        el('h2', { class: 'panel-title' }, ['Sessions by workspace']),
        el('span', { class: 'panel-sub muted' }, ['0 groups'])
      ]),
      el('p', { class: 'muted panel-empty' }, ['No session rows available from the read-only snapshot.'])
    ]);
  }

  return el('section', { class: 'panel session-groups-panel' }, [
    el('header', { class: 'panel-head' }, [
      el('h2', { class: 'panel-title' }, ['Sessions by workspace']),
      el('span', { class: 'panel-sub muted' }, [pluralize(groups.length, 'group')])
    ]),
    ...groups.map((group) =>
      el('div', { class: 'session-group' }, [
        el('div', { class: 'session-group-head' }, [
          el('h3', { class: 'session-group-title' }, [group.workspace]),
          el('span', { class: 'session-group-count muted' }, [pluralize(group.sessions.length, 'session')])
        ]),
        el(
          'ul',
          { class: 'session-list' },
          group.sessions.map((session) => {
            const isSelected = session.id === selectedId;
            const li = el(
              'li',
              {
                class: classNames('session-card', isSelected && 'is-selected'),
                attrs: { tabindex: '0', role: 'button' }
              },
              [
                el('div', { class: 'session-card-head' }, [
                  el('span', { class: `badge badge-${session.observation}` }, [
                    observationLabel(session.observation)
                  ]),
                  el('span', { class: 'session-card-title' }, [session.title])
                ]),
                el('p', { class: 'session-card-meta muted' }, [
                  metaLine([stateLabel(session.state), progressLabel(session.progress), session.model])
                ]),
                session.summary
                  ? el('p', { class: 'session-card-summary' }, [session.summary])
                  : el('p', { class: 'session-card-summary muted' }, [
                      'No session summary available from read-only snapshot.'
                    ])
              ]
            );
            li.addEventListener('click', () => handlers.onSelect(session.id));
            li.addEventListener('keydown', (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handlers.onSelect(session.id);
              }
            });
            return li;
          })
        )
      ])
    )
  ]);
}
