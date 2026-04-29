import type { MenuItemConstructorOptions } from 'electron';
import { DemoFixtureProvider } from '../src/repoprompt/providers/index.js';
import { buildTrayTemplate, buildTrayTitle } from '../src/main/trayMenu.js';
import { createDeterministicSummary } from '../src/domain/summary.js';

const snapshot = await new DemoFixtureProvider(() => new Date('2026-04-28T00:00:00Z')).collectSnapshot();
const menu = buildTrayTemplate(snapshot, {
  refreshNow: () => undefined,
  copySummary: () => undefined,
  switchToFixtureMode: () => undefined,
  quit: () => undefined
});
const labels = menuLabels(menu);

const summary = createDeterministicSummary(snapshot);
if (!buildTrayTitle(snapshot).includes('RP demo')) throw new Error('Fixture tray title was not marked as demo.');
for (const heading of ['Focus next', 'Sessions', 'Workspaces', 'Capabilities', 'Diagnostics', 'Actions']) {
  if (!labels.includes(heading)) throw new Error(`${heading} menu section missing.`);
}
if (!labels.includes('Copy summary')) throw new Error('Copy summary menu item missing.');
if (!labels.some((label) => label.includes('[fixture]'))) throw new Error('Menu did not label fixture-backed rows.');
if (summary.length > 1200) throw new Error('Summary exceeded 1,200 characters.');
if (!summary.includes('fixture-backed')) throw new Error('Summary did not label fixture-backed data.');

console.log(summary);

function menuLabels(items: MenuItemConstructorOptions[]): string[] {
  return items.flatMap((item) => {
    const label = typeof item.label === 'string' ? [item.label] : [];
    const submenu = Array.isArray(item.submenu) ? menuLabels(item.submenu) : [];
    return [...label, ...submenu];
  });
}
