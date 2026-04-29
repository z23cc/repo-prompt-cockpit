import type { ControlPlaneDashboard, ImplementationPlanItem } from '../domain/dashboard.js';

/**
 * Pick the initial renderer selection from real observable rows only.
 *
 * Implementation-plan placeholders exist so the workspace column can explain
 * empty states, but they must never become the selected workflow. Prefer the
 * domain-provided session/focus selection, then a real session row, then a
 * meaningful focus row. Fully synthetic empty-state focus rows are left
 * unselected so the toolbar can honestly show "No workflow selected".
 */
export function selectDefaultSelectionId(dashboard: ControlPlaneDashboard): string | undefined {
  const domainSelection = dashboard.activityPanel.selectedItemId;
  if (domainSelection && isSelectableDefault(dashboard, domainSelection)) return domainSelection;

  const firstSession = dashboard.implementationPlan.items.find((item) => item.kind === 'session');
  if (firstSession) return firstSession.id;

  return dashboard.focusItems.find((item) => item.id !== 'no-actionable-data')?.id;
}

function isSelectableDefault(dashboard: ControlPlaneDashboard, id: string): boolean {
  const planItem = dashboard.implementationPlan.items.find((item) => item.id === id);
  if (planItem) return isRealPlanItem(planItem);
  return dashboard.focusItems.some((item) => item.id === id && item.id !== 'no-actionable-data');
}

function isRealPlanItem(item: ImplementationPlanItem): boolean {
  return item.kind === 'session';
}
