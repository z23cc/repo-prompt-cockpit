import type { AttentionItem } from '../../shared/types.js';
import { classNames, el } from './dom.js';
import { observationLabel } from './format.js';

export interface FocusQueueHandlers {
  onSelect(id: string): void;
}

export function focusQueue(
  items: AttentionItem[],
  selectedId: string | undefined,
  handlers: FocusQueueHandlers
): HTMLElement {
  const visible = items.slice(0, 6);

  const body = visible.length === 0
    ? el('p', { class: 'muted panel-empty' }, ['No actionable focus items derived from the current snapshot.'])
    : el(
        'ul',
        { class: 'focus-list' },
        visible.map((item) => {
          const isSelected = item.id === selectedId;
          const li = el(
            'li',
            { class: classNames('focus-row', isSelected && 'is-selected'), attrs: { tabindex: '0' } },
            [
              el('div', { class: 'focus-row-head' }, [
                el('span', { class: `badge badge-${item.observation}` }, [observationLabel(item.observation)]),
                el('span', { class: 'focus-row-label' }, [item.label]),
                el('span', { class: `pill pill-state pill-${item.state}` }, [item.state.replaceAll('_', ' ')])
              ]),
              el('p', { class: 'focus-row-detail muted' }, [item.detail])
            ]
          );
          li.addEventListener('click', () => handlers.onSelect(item.id));
          li.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handlers.onSelect(item.id);
            }
          });
          return li;
        })
      );

  return el('section', { class: 'panel focus-queue' }, [
    el('header', { class: 'panel-head' }, [
      el('h2', { class: 'panel-title' }, ['Focus next']),
      el('span', { class: 'panel-sub muted' }, [
        items.length === 0
          ? 'no actionable items'
          : `${visible.length} of ${items.length} prioritized`
      ])
    ]),
    body
  ]);
}
