import type { CapabilityRowView } from '../../domain/dashboard.js';
import { el } from './dom.js';
import { observationLabel } from './format.js';

export function capabilityMatrix(rows: CapabilityRowView[]): HTMLElement {
  const body = rows.length === 0
    ? el('p', { class: 'muted panel-empty' }, [
        'No capability metadata reported by the current provider.'
      ])
    : el('div', { class: 'capability-table', attrs: { role: 'table' } }, [
        el('div', { class: 'capability-row capability-row-header', attrs: { role: 'row' } }, [
          el('span', { attrs: { role: 'columnheader' } }, ['Field']),
          el('span', { attrs: { role: 'columnheader' } }, ['Status']),
          el('span', { attrs: { role: 'columnheader' } }, ['Source']),
          el('span', { attrs: { role: 'columnheader' } }, ['Observation'])
        ]),
        ...rows.map((row) =>
          el('div', { class: 'capability-row', attrs: { role: 'row' } }, [
            el('span', { class: 'capability-field', attrs: { role: 'cell' } }, [row.field]),
            el('span', { class: `pill pill-status pill-${row.status}`, attrs: { role: 'cell' } }, [row.status]),
            el('span', { class: 'muted small', attrs: { role: 'cell' } }, [row.source]),
            el('span', { class: `badge badge-${row.observation}`, attrs: { role: 'cell' } }, [
              observationLabel(row.observation)
            ])
          ])
        )
      ]);

  return body;
}
