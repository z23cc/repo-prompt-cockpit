import AppKit
import RepoPromptCockpitCore
import SwiftUI

struct OverviewActivityContent: View {
    @ObservedObject var store: DashboardStore

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            SelectedSessionDetails(session: selectedSession(in: store.derivedState.visibleSessions, selectedId: store.selectedSessionId))
            WorkflowItemsContent(store: store)
        }
    }
}

struct SessionActivityContent: View {
    @ObservedObject var store: DashboardStore

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            SelectedSessionDetails(session: selectedSession(in: store.derivedState.visibleSessions, selectedId: store.selectedSessionId))
            WorkflowItemsContent(store: store)
        }
    }
}

struct FocusQueueContent: View {
    @ObservedObject var store: DashboardStore
    var isProminent: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: isProminent ? 12 : 10) {
            HStack(alignment: .firstTextBaseline) {
                Text("Focus Queue")
                    .font(isProminent ? .title3.weight(.semibold) : .subheadline.weight(.semibold))
                Spacer()
                if isProminent {
                    Text(store.derivedState.attentionItems.isEmpty ? "none" : "\(store.derivedState.attentionItems.count) prioritized")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }

            if !store.derivedState.attentionItems.isEmpty {
                ForEach(visibleAttentionItems, id: \.id) { item in
                    AttentionRow(item: item) {
                        if store.derivedState.visibleSessions.contains(where: { $0.id == item.id }) {
                            store.selectSession(id: item.id)
                            store.selectTab(.plan)
                        }
                    }
                }
            } else {
                TruthfulEmptyState(text: "No actionable session or diagnostic attention items are available.")
            }

            if hiddenAttentionCount > 0 {
                Text("\(hiddenAttentionCount) more focus item\(hiddenAttentionCount == 1 ? "" : "s") available in this snapshot.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(isProminent ? 16 : 0)
        .background(isProminent ? Color(nsColor: .textBackgroundColor) : Color.clear, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(isProminent ? Color.secondary.opacity(0.10) : Color.clear))
    }

    private var visibleAttentionItems: [AttentionItem] {
        let limit = isProminent ? 4 : store.derivedState.attentionItems.count
        return Array(store.derivedState.attentionItems.prefix(limit))
    }

    private var hiddenAttentionCount: Int {
        max(0, store.derivedState.attentionItems.count - visibleAttentionItems.count)
    }
}

struct WorkflowItemsContent: View {
    @ObservedObject var store: DashboardStore

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Workflow activity")
                .font(.headline)
            ForEach(store.derivedState.implementationItems, id: \.id) { item in
                ImplementationItemRow(item: item) {
                    if case .session(let session) = item.kind {
                        store.selectSession(id: session.id)
                    }
                }
            }
        }
    }
}

struct AttentionRow: View {
    var item: AttentionItem
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 10) {
                TruthBadge(badge: observationBadge(item.observation))
                VStack(alignment: .leading, spacing: 3) {
                    Text(item.label)
                        .font(.callout.weight(.semibold))
                    Text(item.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                Spacer()
                Text("P\(item.priority)")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(.quaternary))
        }
        .buttonStyle(.plain)
    }
}

struct SelectedSessionDetails: View {
    var session: AgentSession?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Workflow details")
                .font(.subheadline.weight(.semibold))

            if let session {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top, spacing: 12) {
                        Text(session.summary ?? "Metadata summary unavailable.")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer()
                        VStack(alignment: .trailing, spacing: 6) {
                            TruthBadge(badge: sessionStateBadge(session.state))
                            TruthBadge(badge: observationBadge(session.observation))
                        }
                    }

                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), alignment: .leading)], alignment: .leading, spacing: 8) {
                        ForEach(sessionMetadataRows(session)) { row in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(row.key)
                                    .font(.caption2.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                Text(row.value)
                                    .font(.caption)
                                    .textSelection(.enabled)
                            }
                            .padding(8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color(nsColor: .controlBackgroundColor), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                        }
                    }

                    Text("Transcript, log body, and artifact content: unavailable by design in this read-only cockpit.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                TruthfulEmptyState(text: "[unavailable] Select a metadata-only session row to inspect workflow details.")
            }
        }
    }
}

struct ImplementationItemRow: View {
    var item: ImplementationPlanItem
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 10) {
                TruthBadge(badge: observationBadge(item.observation))
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.title)
                        .font(.callout.weight(.semibold))
                    Text(item.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                Spacer()
                if case .placeholder = item.kind {
                    Text("not counted")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(.quaternary))
        }
        .buttonStyle(.plain)
        .disabled(isPlaceholder)
    }

    private var isPlaceholder: Bool {
        if case .placeholder = item.kind { return true }
        return false
    }
}

struct WindowContextCard: View {
    var window: RepoPromptWindow?
    var selectedContextId: String?
    var selectContext: (String?) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Selected workspace")
                .font(.headline)

            if let window {
                Text(window.workspace)
                    .font(.callout.weight(.semibold))
                Text(window.repoPath ?? "Repo path unavailable")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
                TruthBadge(badge: observationBadge(window.observation))

                VStack(alignment: .leading, spacing: 6) {
                    Text("Tabs")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    ForEach(Array(window.tabs.enumerated()), id: \.offset) { _, tab in
                        Button(action: { selectContext(tab.contextId) }) {
                            HStack {
                                Image(systemName: tab.active ? "largecircle.fill.circle" : "circle")
                                    .accessibilityHidden(true)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(tab.name)
                                    Text(tab.contextId ?? "context unavailable")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                TruthBadge(badge: observationBadge(tab.observation))
                            }
                            .padding(8)
                            .background(isSelected(tab) ? Color.accentColor.opacity(0.12) : Color.clear, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            } else {
                TruthfulEmptyState(text: "[unavailable] No selected workspace context.")
            }
        }
        .padding(12)
        .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func isSelected(_ tab: RepoPromptTab) -> Bool {
        guard let contextId = tab.contextId else { return false }
        return contextId == selectedContextId
    }
}

struct StatusPreviewPanel: View {
    @ObservedObject var store: DashboardStore

    var body: some View {
        let counts = store.derivedState.statusCounts
        let total = counts.running + counts.waitingForInput + counts.blocked + counts.completed + counts.failed + counts.idle + counts.unknown
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Status preview")
                    .font(.headline)
                TruthBadge(badge: PresentationBadge(label: "snapshot only", systemImageName: "camera.metering.matrix", tone: .unavailable))
                Spacer()
                Text("total \(total)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 92), alignment: .leading)], alignment: .leading, spacing: 8) {
                PreviewCount(label: "Sessions", value: counts.sessions)
                PreviewCount(label: "Running", value: counts.running)
                PreviewCount(label: "Waiting", value: counts.waitingForInput)
                PreviewCount(label: "Blocked", value: counts.blocked)
                PreviewCount(label: "Completed", value: counts.completed)
                PreviewCount(label: "Failed", value: counts.failed)
                PreviewCount(label: "Idle", value: counts.idle)
                PreviewCount(label: "Unknown", value: counts.unknown)
            }
            Text(selectedLine)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("Deterministic preview. This view shows provider-reported session counts only.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(14)
        .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var selectedLine: String {
        guard let selected = selectedSession(in: store.derivedState.visibleSessions, selectedId: store.selectedSessionId) else {
            return "No session selected — counts reflect the full snapshot."
        }
        return "Selected session: \(selected.title)"
    }
}

struct PreviewCount: View {
    var label: String
    var value: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text("\(value)")
                .font(.headline.monospacedDigit())
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(nsColor: .controlBackgroundColor), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct UnavailableWorkflowTabPanel: View {
    var tab: DashboardTab
    var activityPanel: ActivityPanelView

    var body: some View {
        let descriptor = activityPanel.tabs.first { $0.key == tab.activityKey }
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("\(descriptor?.label ?? tab.label) · unavailable")
                    .font(.headline)
                TruthBadge(badge: observationBadge(.unavailable))
                Spacer()
            }
            Text(descriptor?.detail ?? "No data available for this view in the read-only provider snapshot.")
                .font(.callout)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private extension DashboardTab {
    var activityKey: ActivityPanelTabKey {
        switch self {
        case .plan: return .plan
        case .activity: return .activity
        case .artifacts: return .artifacts
        case .logs: return .logs
        case .results: return .results
        }
    }
}

private enum InspectorGroupID: String, Hashable {
    case contextFocus
    case tabsAndContexts
    case progress
}

/// Shared side-column surface used by both the leading sidebar and trailing inspector.
/// Keeping this explicit avoids the two sides drifting into different gray/tint recipes.
struct CockpitSidebarSurface: View {
    var roundedCorners: RectCornerSet = []
    var cornerRadius: CGFloat = 24

    var body: some View {
        ZStack {
            VisualEffectSidebarMaterial()
            Color(nsColor: .windowBackgroundColor).opacity(0.72)
            Color(nsColor: .controlBackgroundColor).opacity(0.22)
        }
        .clipShape(RoundedCornerShape(corners: roundedCorners, radius: cornerRadius))
    }
}

struct RectCornerSet: OptionSet {
    let rawValue: Int
    static let topLeft = RectCornerSet(rawValue: 1 << 0)
    static let topRight = RectCornerSet(rawValue: 1 << 1)
    static let bottomRight = RectCornerSet(rawValue: 1 << 2)
    static let bottomLeft = RectCornerSet(rawValue: 1 << 3)
}

struct RoundedCornerShape: Shape {
    var corners: RectCornerSet
    var radius: CGFloat

    func path(in rect: CGRect) -> Path {
        let r = max(0, min(radius, min(rect.width, rect.height) / 2))
        var path = Path()
        path.move(to: CGPoint(x: rect.minX + (corners.contains(.topLeft) ? r : 0), y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX - (corners.contains(.topRight) ? r : 0), y: rect.minY))
        if corners.contains(.topRight) {
            path.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY + r), control: CGPoint(x: rect.maxX, y: rect.minY))
        }
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - (corners.contains(.bottomRight) ? r : 0)))
        if corners.contains(.bottomRight) {
            path.addQuadCurve(to: CGPoint(x: rect.maxX - r, y: rect.maxY), control: CGPoint(x: rect.maxX, y: rect.maxY))
        }
        path.addLine(to: CGPoint(x: rect.minX + (corners.contains(.bottomLeft) ? r : 0), y: rect.maxY))
        if corners.contains(.bottomLeft) {
            path.addQuadCurve(to: CGPoint(x: rect.minX, y: rect.maxY - r), control: CGPoint(x: rect.minX, y: rect.maxY))
        }
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + (corners.contains(.topLeft) ? r : 0)))
        if corners.contains(.topLeft) {
            path.addQuadCurve(to: CGPoint(x: rect.minX + r, y: rect.minY), control: CGPoint(x: rect.minX, y: rect.minY))
        }
        path.closeSubpath()
        return path
    }
}

private struct VisualEffectSidebarMaterial: NSViewRepresentable {
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        configure(view)
        return view
    }

    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {
        configure(nsView)
    }

    private func configure(_ view: NSVisualEffectView) {
        view.material = .sidebar
        view.blendingMode = .withinWindow
        view.state = .followsWindowActiveState
    }
}

struct CockpitInspectorView: View {
    @ObservedObject var store: DashboardStore
    var closeInspector: (() -> Void)? = nil
    @State private var expandedGroups: Set<InspectorGroupID> = [.contextFocus, .tabsAndContexts, .progress]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top, spacing: 8) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Inspector")
                            .font(.headline)
                        Text("Metadata-only context for the selected workflow.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 8)
                    if let closeInspector {
                        Button(action: closeInspector) {
                            Image(systemName: "sidebar.trailing")
                                .font(.caption.weight(.semibold))
                        }
                        .buttonStyle(.borderless)
                        .controlSize(.small)
                        .help("Hide Inspector")
                        .accessibilityLabel("Hide Inspector")
                    }
                }
                .padding(.bottom, 2)
                .frame(maxWidth: .infinity, alignment: .leading)

                InspectorGroup(title: "Context Focus", subtitle: store.derivedState.attentionItems.isEmpty ? "none" : "\(store.derivedState.attentionItems.count) item\(store.derivedState.attentionItems.count == 1 ? "" : "s")", isExpanded: binding(for: .contextFocus)) {
                    FocusRailSection(items: store.derivedState.attentionItems, selectedId: store.selectedSessionId) { id in
                        store.selectSession(id: id)
                        store.selectTab(.plan)
                    }
                }
                InspectorGroup(title: "Tabs & Contexts", subtitle: "\(store.derivedState.workspaces.count) workspace\(store.derivedState.workspaces.count == 1 ? "" : "s")", isExpanded: binding(for: .tabsAndContexts)) {
                    WorkspaceContextRailSection(workspaces: store.derivedState.workspaces)
                }
                InspectorGroup(title: "Snapshot Progress", subtitle: "\(store.derivedState.statusCounts.sessions) session\(store.derivedState.statusCounts.sessions == 1 ? "" : "s")", isExpanded: binding(for: .progress)) {
                    SnapshotProgressRailSection(counts: store.derivedState.statusCounts)
                }
            }
            .padding(.horizontal, 22)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(CockpitSidebarSurface().ignoresSafeArea())
    }

    private func binding(for id: InspectorGroupID) -> Binding<Bool> {
        Binding(
            get: { expandedGroups.contains(id) },
            set: { isExpanded in
                if isExpanded { expandedGroups.insert(id) } else { expandedGroups.remove(id) }
            }
        )
    }
}

struct SidebarContextSectionsView: View {
    @ObservedObject var store: DashboardStore
    @State private var expandedGroups: Set<InspectorGroupID> = [.tabsAndContexts]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Context", subtitle: "\(store.derivedState.workspaces.count) workspace\(store.derivedState.workspaces.count == 1 ? "" : "s")")

            InspectorGroup(title: "Tabs & Contexts", subtitle: "\(store.derivedState.workspaces.count) workspace\(store.derivedState.workspaces.count == 1 ? "" : "s")", isExpanded: binding(for: .tabsAndContexts)) {
                WorkspaceContextRailSection(workspaces: store.derivedState.workspaces)
            }
            InspectorGroup(title: "Context Focus", subtitle: store.derivedState.attentionItems.isEmpty ? "none" : "\(store.derivedState.attentionItems.count) item\(store.derivedState.attentionItems.count == 1 ? "" : "s")", isExpanded: binding(for: .contextFocus)) {
                FocusRailSection(items: store.derivedState.attentionItems, selectedId: store.selectedSessionId) { id in
                    store.selectSession(id: id)
                    store.selectTab(.plan)
                }
            }
            InspectorGroup(title: "Snapshot Progress", subtitle: "\(store.derivedState.statusCounts.sessions) session\(store.derivedState.statusCounts.sessions == 1 ? "" : "s")", isExpanded: binding(for: .progress)) {
                SnapshotProgressRailSection(counts: store.derivedState.statusCounts)
            }
        }
    }

    private func binding(for id: InspectorGroupID) -> Binding<Bool> {
        Binding(
            get: { expandedGroups.contains(id) },
            set: { isExpanded in
                if isExpanded { expandedGroups.insert(id) } else { expandedGroups.remove(id) }
            }
        )
    }
}

struct InspectorGroup<Content: View>: View {
    var title: String
    var subtitle: String?
    @Binding var isExpanded: Bool
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button(action: { isExpanded.toggle() }) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .accessibilityHidden(true)
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    if let subtitle {
                        Text(subtitle)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(title)
            .accessibilityValue(isExpanded ? "expanded" : "collapsed")

            if isExpanded {
                content
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(nsColor: .windowBackgroundColor), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Color.secondary.opacity(0.10)))
    }
}

struct WorkspaceContextRailSection: View {
    var workspaces: [WorkspaceView]
    private let maxWorkspaces = 4
    private let maxTabs = 3

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if workspaces.isEmpty {
                TruthfulEmptyState(text: "No workspace or tab/context metadata in this snapshot.")
            } else {
                ForEach(visibleWorkspaces) { workspace in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(workspace.workspace)
                                .font(.callout.weight(.semibold))
                                .lineLimit(1)
                            TruthBadge(badge: observationBadge(workspace.observation))
                        }
                        Text(workspace.repoPath ?? "\(workspace.windowIds.count) window(s) · \(workspace.tabCount) tab(s)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                        ForEach(Array(workspace.contextTabs.prefix(maxTabs))) { tab in
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(tab.active ? "●" : "○") \(tab.tabName)")
                                    .font(.caption.weight(.medium))
                                Text("window \(tab.windowId) · \(tab.contextId.map(shortContextId) ?? "context id unavailable") · \(tab.observation.rawValue)")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                        }
                        if workspace.contextTabs.count > maxTabs {
                            Text("\(workspace.contextTabs.count - maxTabs) more context tabs hidden.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(10)
                    .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                if workspaces.count > maxWorkspaces {
                    Text("\(workspaces.count - maxWorkspaces) more workspaces hidden for readability.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var visibleWorkspaces: [WorkspaceView] { Array(workspaces.prefix(maxWorkspaces)) }
    private var visibleContextCount: Int { visibleWorkspaces.reduce(0) { $0 + min($1.contextTabs.count, maxTabs) } }
}

struct FocusRailSection: View {
    var items: [AttentionItem]
    var selectedId: String?
    var select: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if items.isEmpty {
                TruthfulEmptyState(text: "No actionable focus items in this snapshot.")
            } else {
                ForEach(items.prefix(5), id: \.id) { item in
                    Button(action: { select(item.id) }) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.label)
                                .font(.callout.weight(.semibold))
                            Text(item.detail)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(item.id == selectedId ? Color.accentColor.opacity(0.12) : Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

struct SnapshotProgressRailSection: View {
    var counts: StatusCounts

    var body: some View {
        let total = counts.running + counts.waitingForInput + counts.blocked + counts.completed + counts.failed + counts.idle + counts.unknown
        let completion = total == 0 ? 0 : Int(((Double(counts.completed) / Double(total)) * 100).rounded())
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 8) {
                HStack { Text("Completion"); Spacer(); Text("\(completion)%") }
                ProgressView(value: Double(completion), total: 100)
                HStack { Text("Sessions"); Spacer(); Text("\(total)") }
                HStack { Text("Active"); Spacer(); Text("\(counts.running + counts.waitingForInput + counts.blocked)") }
            }
            .font(.caption)
            .padding(10)
            .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

struct AgentsTreeRailSection: View {
    var tree: SessionTreeView
    var selectedId: String?
    var select: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            RailHeader(title: "Agents involved", subtitle: tree.modeLabel)
            if tree.roots.isEmpty {
                TruthfulEmptyState(text: "No agents reported by the provider.")
            } else {
                ForEach(tree.roots) { node in
                    AgentTreeNodeRow(node: node, selectedId: selectedId, depth: 0, select: select)
                }
            }
        }
    }
}

struct AgentTreeNodeRow: View {
    var node: SessionTreeNodeView
    var selectedId: String?
    var depth: Int
    var select: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button(action: { select(node.id) }) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(depth == 0 ? "◇" : "↳")
                        Text(node.title)
                            .lineLimit(1)
                        Spacer()
                        TruthBadge(badge: sessionStateBadge(node.state))
                    }
                    Text([node.model, node.role, node.relationshipLabel].compactMap { $0 }.joined(separator: " · "))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                .padding(8)
                .padding(.leading, CGFloat(min(depth, 3)) * 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(node.id == selectedId ? Color.accentColor.opacity(0.12) : Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)
            ForEach(node.children) { child in
                AgentTreeNodeRow(node: child, selectedId: selectedId, depth: depth + 1, select: select)
            }
        }
    }
}

struct BodyAccessHelpSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            RailHeader(title: "Where to inspect bodies", subtitle: "Repo Prompt is the source of truth")
            VStack(alignment: .leading, spacing: 8) {
                Text("This cockpit intentionally keeps transcript, log, artifact, and result bodies out of the desktop UI by default.")
                Text("1. Use tabs and contexts above to identify the matching workspace.")
                Text("2. Switch to that session inside Repo Prompt itself.")
                Text("3. Inspect Logs / Results / Artifacts there when needed.")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding(10)
            .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

struct RelatedWorkflowsRailSection: View {
    var items: [ImplementationPlanItem]
    var selectedId: String?
    var select: (String) -> Void

    var body: some View {
        let related = items.filter { item in
            if case .session = item.kind { return item.id != selectedId }
            return false
        }.prefix(5)
        VStack(alignment: .leading, spacing: 10) {
            RailHeader(title: "Related workflows", subtitle: "\(related.count) workflow\(related.count == 1 ? "" : "s")")
            if related.isEmpty {
                TruthfulEmptyState(text: "No related workflows in this snapshot.")
            } else {
                ForEach(Array(related)) { item in
                    Button(action: { select(item.id) }) {
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(item.title)
                                    .font(.callout.weight(.semibold))
                                    .lineLimit(1)
                                Text(item.workspace ?? item.detail)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                            Spacer()
                            if let state = item.state { TruthBadge(badge: sessionStateBadge(state)) }
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

struct RailHeader: View {
    var title: String
    var subtitle: String?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.subheadline.weight(.semibold))
            Spacer()
            if let subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private func shortContextId(_ contextId: String) -> String {
    contextId.count <= 8 ? contextId : String(contextId.prefix(8))
}

struct CapabilityList: View {
    var capabilities: [CapabilityMatrixEntry]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Capabilities")
                .font(.headline)
            if capabilities.isEmpty {
                TruthfulEmptyState(text: "[unavailable] Provider capability metadata unavailable.")
            } else {
                ForEach(capabilities, id: \.field) { capability in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(alignment: .top) {
                            Text(capability.field)
                                .font(.callout.weight(.semibold))
                            Spacer()
                            TruthBadge(badge: capabilityStatusBadge(capability.status))
                        }
                        Text(capabilityPrivacyLine(capability))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(capability.failureMode)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(10)
                    .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
        }
    }
}

struct DiagnosticList: View {
    var snapshot: ControlPlaneSnapshot?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Diagnostics")
                .font(.headline)
            if let diagnostics = snapshot?.diagnostics, !diagnostics.isEmpty {
                ForEach(diagnostics, id: \.code) { diagnostic in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(alignment: .top) {
                            Text(diagnostic.code)
                                .font(.callout.weight(.semibold))
                            Spacer()
                            TruthBadge(badge: diagnosticSeverityBadge(diagnostic.severity))
                        }
                        Text(diagnostic.message)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(diagnostic.observedAt)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(10)
                    .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            } else {
                TruthfulEmptyState(text: "No provider diagnostics reported.")
            }
        }
    }
}
