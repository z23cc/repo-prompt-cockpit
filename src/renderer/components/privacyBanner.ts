import type { PrivacyBannerView } from '../../domain/dashboard.js';
import { el } from './dom.js';

export function privacyBanner(banner: PrivacyBannerView): HTMLElement {
  return el(
    'div',
    {
      class: `privacy-banner privacy-${banner.severity}`,
      attrs: { role: 'note', 'aria-label': 'Privacy posture' }
    },
    [
      el('span', { class: 'privacy-icon', attrs: { 'aria-hidden': 'true' } }, ['◆']),
      el('div', { class: 'privacy-text' }, [
        el('strong', { class: 'privacy-label' }, [banner.label]),
        el('span', { class: 'privacy-detail muted' }, [banner.detail])
      ])
    ]
  );
}
