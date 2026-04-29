import { createControlPlaneDashboard } from '../src/domain/dashboard.js';
import { DemoFixtureProvider } from '../src/repoprompt/providers/index.js';
import { workflowTabsFromActivityTabs } from '../src/renderer/components/workflowToolbar.js';
import { filterCounts, filterItems } from '../src/renderer/components/workspaceColumn.js';

const snapshot = await new DemoFixtureProvider(() => new Date('2026-04-28T00:00:00Z')).collectSnapshot();
const dashboard = createControlPlaneDashboard(snapshot);

if (!dashboard.isFixture) throw new Error('Fixture dashboard was not marked as fixture.');
if (dashboard.statusCounts.sessions <= 0) throw new Error('Expected fixture sessions in dashboard status counts.');
if (dashboard.implementationPlan.items.length <= 0) throw new Error('Expected implementation plan items.');
if (!dashboard.privacyBanner.detail.includes('not loaded or uploaded by default')) {
  throw new Error('Privacy banner is missing default no-transcript/log policy text.');
}
if (dashboard.activityPanel.tabs.some((tab) => tab.key === 'logs' && tab.available)) {
  throw new Error('Logs tab should be unavailable by default.');
}
const fixtureWorkspace = dashboard.workspaces.find((workspace) => workspace.workspace === 'RepoPrompt-control-plane');
if (!fixtureWorkspace) {
  throw new Error('Expected fixture workspace metadata in dashboard.');
}
if (!fixtureWorkspace.contextTabs.some((tab) => tab.contextId === 'fixture-context-control-plane' && tab.active)) {
  throw new Error('Expected active fixture context tab metadata in workspace view.');
}
if (!fixtureWorkspace.contextTabs.some((tab) => tab.contextId === 'fixture-context-publish-plan' && !tab.active)) {
  throw new Error('Expected inactive fixture context tab metadata in workspace view.');
}
if (!dashboard.focusItems.some((item) => item.observation === 'fixture')) {
  throw new Error('Expected fixture observations in focus items.');
}
if (dashboard.sessionTree.mode !== 'observed') {
  throw new Error(`Expected observed tree mode, got ${dashboard.sessionTree.mode}.`);
}
const parent = dashboard.sessionTree.roots.find((node) => node.id === 'fixture-orchestrator-parent');
if (!parent || parent.children.length < 2) {
  throw new Error('Expected fixture parent run with at least two sub-agent children in session tree.');
}
if (parent.children.some((child) => child.relationshipLabel !== 'relationship observed')) {
  throw new Error('Expected observed relationship labels for fixture child runs.');
}

// Cockpit redesign contracts
const counts = filterCounts(dashboard.implementationPlan.items);
if (counts.running !== dashboard.statusCounts.running) {
  throw new Error('Workspace column running count drifted from dashboard status counts.');
}
if (counts.waiting !== dashboard.statusCounts.waiting) {
  throw new Error('Workspace column waiting count drifted from dashboard status counts.');
}
if (counts.blocked !== dashboard.statusCounts.blocked) {
  throw new Error('Workspace column blocked count drifted from dashboard status counts.');
}
const blockedItems = filterItems(dashboard.implementationPlan.items, 'blocked');
if (!blockedItems.every((item) => item.state === 'blocked')) {
  throw new Error('Blocked filter must return only blocked items.');
}

const tabs = workflowTabsFromActivityTabs(dashboard.activityPanel.tabs);
const expectedKeys = ['plan', 'activity'];
if (tabs.map((tab) => tab.key).join(',') !== expectedKeys.join(',')) {
  throw new Error('Workflow tabs must expose only Plan and Activity in the primary toolbar.');
}
if (tabs.some((tab) => !tab.available)) {
  throw new Error('Primary workflow tabs must all be available. Unsupported tabs should be parked outside the primary toolbar.');
}

const orchestrator = dashboard.implementationPlan.items.find(
  (item) => item.id === 'fixture-orchestrator-parent'
);
if (!orchestrator?.updatedAt) {
  throw new Error('Implementation plan items must propagate updatedAt for age labels in the cockpit.');
}
if (orchestrator.kind !== 'session') {
  throw new Error('Real provider sessions must have kind="session".');
}

// Visible nested tree contract: the rail must be able to render the observed
// fixture parent → child structure (not flatten/truncate it).
const fixtureParent = dashboard.sessionTree.roots.find(
  (node) => node.id === 'fixture-orchestrator-parent'
);
if (!fixtureParent || fixtureParent.children.length < 2) {
  throw new Error('Fixture session tree must expose nested children for the cockpit rail to render.');
}
if (!fixtureParent.children.some((child) => child.id === 'fixture-child-dashboard-tree')) {
  throw new Error('Fixture observed children must remain reachable from the parent in the tree view.');
}

console.log(
  `Dashboard smoke passed for ${dashboard.providerLabel} with ${dashboard.statusCounts.sessions} sessions, ` +
    `tree mode ${dashboard.sessionTree.mode}, and ${tabs.length} primary workflow tabs.`
);
