import type { ProviderDiagnostic } from '../../shared/types.js';
import { el } from './dom.js';
import { formatTimestamp } from './format.js';

export function diagnosticsPanel(diagnostics: ProviderDiagnostic[]): HTMLElement {
  const body = diagnostics.length === 0
    ? el('p', { class: 'muted panel-empty' }, ['No diagnostics reported by the current provider.'])
    : el(
        'ul',
        { class: 'diagnostics-list' },
        diagnostics.map((diagnostic) =>
          el('li', { class: `diagnostic-row severity-${diagnostic.severity}` }, [
            el('div', { class: 'diagnostic-row-head' }, [
              el('span', { class: `pill pill-severity pill-${diagnostic.severity}` }, [diagnostic.severity]),
              el('span', { class: 'diagnostic-code' }, [diagnostic.code]),
              el('span', { class: 'muted small' }, [formatTimestamp(diagnostic.observedAt)])
            ]),
            el('p', { class: 'diagnostic-message' }, [diagnostic.message]),
            diagnostic.command
              ? el('p', { class: 'muted small' }, [`command: ${diagnostic.command}`])
              : null
          ])
        )
      );

  return body;
}
