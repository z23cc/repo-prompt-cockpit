import type { PrivacyBannerView } from '../../domain/dashboard.js';
import { classNames, el } from './dom.js';

export type ComposerStatusKind = 'idle' | 'refreshing' | 'error';

export interface ComposerHandlers {
  refresh(): void;
  copySummary(): void;
}

export interface ComposerOptions {
  privacy: PrivacyBannerView;
  status: ComposerStatusKind;
  message: string;
  refreshDisabled: boolean;
  copyDisabled: boolean;
}

export function composerBar(options: ComposerOptions, handlers: ComposerHandlers): HTMLElement {
  return el('footer', { class: 'composer', attrs: { 'aria-label': 'Status bar' } }, [
    el(
      'div',
      {
        class: classNames('composer-privacy', options.privacy.severity === 'warning' && 'is-warning'),
        attrs: { role: 'note', 'aria-label': 'Privacy posture' }
      },
      [
        el('span', { class: 'composer-privacy-dot', attrs: { 'aria-hidden': 'true' } }, []),
        el('div', { class: 'composer-privacy-text' }, [
          el('strong', undefined, [options.privacy.label]),
          el('span', undefined, [options.privacy.detail])
        ])
      ]
    ),
    el(
      'div',
      { class: classNames('composer-status', options.status === 'refreshing' && 'is-refreshing', options.status === 'error' && 'is-error') },
      [
        el('span', { class: 'composer-status-dot', attrs: { 'aria-hidden': 'true' } }, []),
        el('span', { class: 'composer-status-text', title: options.message }, [options.message])
      ]
    ),
    el('div', { class: 'composer-actions' }, [
      actionButton('Copy summary', () => handlers.copySummary(), options.copyDisabled, false),
      actionButton(
        options.status === 'refreshing' ? 'Refreshing…' : 'Refresh',
        () => handlers.refresh(),
        options.refreshDisabled,
        true
      )
    ])
  ]);
}

function actionButton(
  label: string,
  onClick: () => void,
  disabled: boolean,
  primary: boolean
): HTMLButtonElement {
  const node = el('button', { class: classNames('btn', primary && 'btn-primary') }, [label]);
  node.disabled = disabled;
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}
