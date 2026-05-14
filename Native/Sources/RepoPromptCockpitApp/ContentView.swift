import AppKit
import RepoPromptCockpitCore
import SwiftUI

struct ContentView: View {
    @ObservedObject var store: DashboardStore
    var setWindowMode: (WindowMode) -> Void

    var body: some View {
        Group {
            switch store.windowMode {
            case .desktop:
                DesktopCockpitView(store: store, setWindowMode: setWindowMode)
            case .minimal:
                MinimalCockpitView(store: store, setWindowMode: setWindowMode)
            }
        }
    }
}

struct DesktopCockpitView: View {
    @ObservedObject var store: DashboardStore
    var setWindowMode: (WindowMode) -> Void

    @State private var columnVisibility: NavigationSplitViewVisibility = .all

    var body: some View {
        Group {
            if #available(macOS 14.0, *) {
                NavigationSplitView(columnVisibility: $columnVisibility) {
                    CockpitSidebarView(store: store, setWindowMode: setWindowMode, showsInlineControls: false)
                        .navigationSplitViewColumnWidth(min: 320, ideal: 340, max: 380)
                } detail: {
                    CockpitPrimaryContentView(store: store, setWindowMode: setWindowMode, showsInlineControls: false)
                        .frame(minWidth: 420, maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color(nsColor: .windowBackgroundColor))
                }
                .toolbar {
                    ToolbarItemGroup(placement: .automatic) {
                        Button("Refresh", systemImage: "arrow.clockwise", action: refresh)
                            .disabled(store.isRefreshing)
                            .help("Refresh metadata")
                        Button("Copy", systemImage: "doc.on.doc", action: copySummary)
                            .help("Copy cockpit summary")
                    }
                    ToolbarItemGroup(placement: .automatic) {
                        Button("Live", action: { switchProvider(.live) })
                            .tint(store.providerMode == .live ? .accentColor : .secondary)
                            .help("Use live provider")
                        Button("Fixture", action: { switchProvider(.fixture) })
                            .tint(store.providerMode == .fixture ? .accentColor : .secondary)
                            .help("Use fixture provider")
                        Button("Mini", systemImage: "pin", action: { setWindowMode(.minimal) })
                            .help("Switch to mini window")
                    }
                }
            } else {
                legacyDesktopShell
            }
        }
        .frame(minWidth: 1120, minHeight: 680)
    }

    private var legacyDesktopShell: some View {
        HStack(spacing: 12) {
            CockpitSidebarView(store: store, setWindowMode: setWindowMode, showsInlineControls: true)
                .frame(width: 300)

            CockpitPrimaryContentView(store: store, setWindowMode: setWindowMode, showsInlineControls: false)
                .frame(minWidth: 260, maxWidth: .infinity, maxHeight: .infinity)
        }
        .padding(12)
        .background(Color(nsColor: .underPageBackgroundColor))
    }


    private func refresh() {
        Task { await store.refresh(reason: .manual) }
    }

    private func copySummary() {
        copyToPasteboard(store.copySummaryText())
    }

    private func switchProvider(_ mode: ProviderMode) {
        Task { await store.setProviderMode(mode, refreshImmediately: true) }
    }
}

struct CockpitPrimaryContentView: View {
    @ObservedObject var store: DashboardStore
    var setWindowMode: (WindowMode) -> Void
    var showsInlineControls: Bool = true

    var body: some View {
        VStack(spacing: 16) {
            FocusQueueContent(store: store, isProminent: true)

            VStack(spacing: 0) {
                WorkflowToolbarView(store: store, setWindowMode: setWindowMode, showsInlineControls: showsInlineControls)
                HairlineSeparator(opacity: 0.16)
                WorkflowActivityView(store: store)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .cockpitPanel(cornerRadius: 16)

            ComposerStatusControlsView(store: store, showsInlineControls: showsInlineControls)
        }
        .padding(14)
        .frame(minWidth: 260, maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct MinimalCockpitView: View {
    @ObservedObject var store: DashboardStore
    var setWindowMode: (WindowMode) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text("Repo Prompt")
                    .font(.headline.weight(.semibold))
                TruthBadge(badge: providerBadge(providerMode: store.providerMode, snapshotProvider: store.latestSnapshot?.provider))
                Spacer()
                if store.isRefreshing {
                    ProgressView()
                        .controlSize(.small)
                        .accessibilityLabel("Refreshing")
                }
            }

            CountStrip(counts: store.derivedState.statusCounts, compact: true)

            if let attention = store.derivedState.attentionItems.first {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Focus next")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text(attention.label)
                        .font(.callout.weight(.semibold))
                        .lineLimit(1)
                    Text("\(attention.detail) · \(attention.observation.rawValue)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            } else {
                TruthfulEmptyState(text: unavailableSummaryText(snapshot: store.latestSnapshot) ?? "No actionable session data available.")
            }

            HStack {
                Button("Refresh", systemImage: "arrow.clockwise", action: refresh)
                    .disabled(store.isRefreshing)
                Button("Copy", systemImage: "doc.on.doc", action: copySummary)
                Button("Full", systemImage: "rectangle.expand.vertical", action: { setWindowMode(.desktop) })
                Spacer()
            }
            .buttonStyle(.bordered)
            .labelStyle(.titleAndIcon)

            Text(snapshotSourceLine(snapshot: store.latestSnapshot, providerMode: store.providerMode))
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .lineLimit(2)
        }
        .padding(16)
        .frame(minWidth: 420, minHeight: 420)
        .background(Color(nsColor: .windowBackgroundColor))
    }

    private func refresh() {
        Task { await store.refresh(reason: .manual) }
    }

    private func copySummary() {
        copyToPasteboard(store.copySummaryText())
    }
}

struct CockpitSidebarView: View {
    @ObservedObject var store: DashboardStore
    var setWindowMode: (WindowMode) -> Void
    var showsInlineControls: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Repo Prompt")
                    .font(.title3.weight(.semibold))
                TruthBadge(badge: providerBadge(providerMode: store.providerMode, snapshotProvider: store.latestSnapshot?.provider))
                Text(snapshotSourceLine(snapshot: store.latestSnapshot, providerMode: store.providerMode))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            CountStrip(counts: store.derivedState.statusCounts, compact: true, sidebar: true)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 14) {
                    WorkspaceSessionListView(store: store, scrolls: false)
                    SidebarContextSectionsView(store: store)
                }
                .padding(.vertical, 2)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: "lock.shield")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .accessibilityHidden(true)
                    Text(store.isRefreshing ? "Refreshing metadata…" : "Read-only monitor")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                Text(store.derivedState.privacyBanner.detail)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .lineLimit(2)

                if showsInlineControls {
                    HStack(spacing: 8) {
                        Button("Refresh", systemImage: "arrow.clockwise", action: refresh)
                            .disabled(store.isRefreshing)
                        Button("Copy", systemImage: "doc.on.doc", action: copySummary)
                        Button(store.providerMode == .fixture ? "Use live" : "Use fixture", systemImage: "arrow.triangle.2.circlepath", action: switchProvider)
                        Button("Mini", systemImage: "pin", action: { setWindowMode(.minimal) })
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .labelStyle(.iconOnly)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(14)
        .background(CockpitSidebarSurface().ignoresSafeArea())
        .clipped()
    }

    private func refresh() {
        Task { await store.refresh(reason: .manual) }
    }

    private func copySummary() {
        copyToPasteboard(store.copySummaryText())
    }

    private func switchProvider() {
        let nextMode: ProviderMode = store.providerMode == .fixture ? .live : .fixture
        Task { await store.setProviderMode(nextMode, refreshImmediately: true) }
    }
}

struct WorkspaceSessionListView: View {
    @ObservedObject var store: DashboardStore
    var scrolls: Bool = true

    private let filters: [DashboardSessionFilter] = [.all, .running, .blocked, .waitingForInput]
    private let maxVisibleCards = 10

    var body: some View {
        if scrolls {
            ScrollView(.vertical, showsIndicators: false) {
                listContent
                    .padding(.vertical, 2)
            }
        } else {
            listContent
        }
    }

    private var listContent: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Sub-agents", subtitle: sessionCountLabel)
            FilterChips(selectedFilter: store.sessionFilter, filters: filters, counts: filterCounts) { filter in
                store.setSessionFilter(filter)
            }

            if realSessionItems.isEmpty {
                TruthfulEmptyState(text: placeholderDetail)
            } else if filteredItems.isEmpty {
                TruthfulEmptyState(text: "No sessions match the current filter.")
            } else {
                ForEach(statusGroups) { group in
                    SessionStatusGroupSection(
                        group: group,
                        selectedSessionId: store.selectedSessionId,
                        generatedAt: store.latestSnapshot?.generatedAt,
                        selectItem: selectItem
                    )
                }
                if hiddenCount > 0 {
                    Text("Showing \(visibleItems.count) of \(filteredItems.count) sessions in this view.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var realSessionItems: [ImplementationPlanItem] {
        store.derivedState.implementationItems.filter { item in
            if case .session = item.kind { return true }
            return false
        }
    }

    private var filteredItems: [ImplementationPlanItem] {
        guard store.sessionFilter != .all else { return realSessionItems }
        return realSessionItems.filter { $0.state.map(store.sessionFilter.includesState) ?? false }
    }

    private var visibleItems: [ImplementationPlanItem] { Array(filteredItems.prefix(maxVisibleCards)) }
    private var hiddenCount: Int { max(0, filteredItems.count - visibleItems.count) }

    private var statusGroups: [SessionStatusGroup] {
        let groupedItems = Dictionary(grouping: visibleItems) { item in
            item.state ?? .unknown
        }
        return statusOrder.compactMap { state in
            guard let items = groupedItems[state], !items.isEmpty else { return nil }
            let totalCount = filteredItems.filter { ($0.state ?? .unknown) == state }.count
            return SessionStatusGroup(state: state, title: title(for: state), items: items, totalCount: totalCount)
        }
    }

    private var filterCounts: [DashboardSessionFilter: Int] {
        [
            .all: realSessionItems.count,
            .running: realSessionItems.filter { $0.state == .running }.count,
            .blocked: realSessionItems.filter { $0.state == .blocked }.count,
            .waitingForInput: realSessionItems.filter { $0.state == .waitingForInput }.count
        ]
    }

    private var sessionCountLabel: String {
        if realSessionItems.isEmpty { return "session state unavailable" }
        if hiddenCount > 0 { return "\(realSessionItems.count) sessions · showing \(visibleItems.count)" }
        return realSessionItems.count == 1 ? "1 session" : "\(realSessionItems.count) sessions"
    }

    private var placeholderDetail: String {
        store.derivedState.implementationItems.first { item in
            if case .placeholder = item.kind { return true }
            return false
        }?.detail ?? "No sessions in the current snapshot."
    }

    private var statusOrder: [SessionState] {
        [.running, .blocked, .waitingForInput, .failed, .completed, .idle, .unknown]
    }

    private func selectItem(_ item: ImplementationPlanItem) {
        store.selectSession(id: item.id)
        store.selectTab(.plan)
    }

    private func title(for state: SessionState) -> String {
        switch state {
        case .running: return "Running"
        case .blocked: return "Blocked"
        case .waitingForInput: return "Waiting"
        case .failed: return "Failed"
        case .completed: return "Completed"
        case .idle: return "Idle"
        case .unknown: return "Unknown"
        }
    }
}

private struct SessionStatusGroup: Identifiable {
    var state: SessionState
    var title: String
    var items: [ImplementationPlanItem]
    var totalCount: Int

    var id: String { state.rawValue }
    var color: Color { sessionStateColor(state) }
    var countLabel: String { items.count == totalCount ? "\(totalCount)" : "\(items.count)/\(totalCount)" }
}

private struct SessionStatusGroupSection: View {
    var group: SessionStatusGroup
    var selectedSessionId: String?
    var generatedAt: String?
    var selectItem: (ImplementationPlanItem) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Circle()
                    .fill(group.color)
                    .frame(width: 7, height: 7)
                    .accessibilityHidden(true)
                Text(group.title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(group.color)
                Text(group.countLabel)
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(.secondary)
                Spacer()
            }
            .accessibilityElement(children: .combine)

            ForEach(group.items) { item in
                ImplementationSessionCard(
                    item: item,
                    isSelected: selectedSessionId == item.id,
                    generatedAt: generatedAt
                ) {
                    selectItem(item)
                }
            }
        }
    }
}

struct WorkflowToolbarView: View {
    @ObservedObject var store: DashboardStore
    var setWindowMode: (WindowMode) -> Void
    var showsInlineControls: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(store.derivedState.dashboard?.providerLabel ?? store.providerMode.rawValue)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    Text(selectedItem?.title ?? "No workflow selected")
                        .font(.title2.weight(.semibold))
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                        .layoutPriority(1)
                    HStack(spacing: 8) {
                        if let workspace = selectedItem?.workspace {
                            SnapshotPill(label: workspace)
                        }
                        SnapshotPill(label: selectedItem?.model ?? "Model unavailable")
                        if let state = selectedItem?.state {
                            TruthBadge(badge: sessionStateBadge(state))
                        }
                    }
                }
                .layoutPriority(1)

                Spacer(minLength: 12)

                if showsInlineControls {
                    HStack(spacing: 8) {
                        Button("Live") { switchProvider(.live) }
                            .buttonStyle(.bordered)
                            .tint(store.providerMode == .live ? .accentColor : .secondary)
                        Button("Fixture") { switchProvider(.fixture) }
                            .buttonStyle(.bordered)
                            .tint(store.providerMode == .fixture ? .accentColor : .secondary)
                        Button(store.windowMode == .minimal ? "Full" : "Mini") {
                            setWindowMode(store.windowMode == .minimal ? .desktop : .minimal)
                        }
                        .buttonStyle(.bordered)
                    }
                    .controlSize(.small)
                }
            }

            HStack(spacing: 8) {
                SnapshotPill(label: "\(store.derivedState.workspaces.count) workspace\(store.derivedState.workspaces.count == 1 ? "" : "s")")
                SnapshotPill(label: "\(store.derivedState.statusCounts.sessions) session\(store.derivedState.statusCounts.sessions == 1 ? "" : "s")")
                SnapshotPill(label: "\(activeCount) active")
                SnapshotPill(label: "\(contextCount) context tab\(contextCount == 1 ? "" : "s")")
            }

            HStack(spacing: 4) {
                ForEach(DashboardTab.allCases, id: \.self) { tab in
                    WorkflowTabButton(tab: tab, isSelected: store.selectedTab == tab) {
                        store.selectTab(tab)
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(Color(nsColor: .windowBackgroundColor))
    }

    private var selectedItem: ImplementationPlanItem? {
        if let selected = store.selectedSessionId, let item = store.derivedState.implementationItems.first(where: { $0.id == selected }) {
            return item
        }
        return store.derivedState.implementationItems.first { item in
            if case .session = item.kind { return true }
            return false
        }
    }

    private var activeCount: Int {
        store.derivedState.statusCounts.running + store.derivedState.statusCounts.waitingForInput + store.derivedState.statusCounts.blocked
    }

    private var contextCount: Int {
        store.derivedState.workspaces.reduce(0) { $0 + $1.contextTabs.count }
    }

    private func switchProvider(_ mode: ProviderMode) {
        Task { await store.setProviderMode(mode, refreshImmediately: true) }
    }
}

struct WorkflowActivityView: View {
    @ObservedObject var store: DashboardStore

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 20) {
                switch store.selectedTab {
                case .plan:
                    OverviewActivityContent(store: store)
                case .activity:
                    StatusPreviewPanel(store: store)
                    SelectedSessionDetails(session: selectedSession(in: store.derivedState.visibleSessions, selectedId: store.selectedSessionId))
                    WorkflowItemsContent(store: store)
                case .artifacts, .logs, .results:
                    UnavailableWorkflowTabPanel(tab: store.selectedTab, activityPanel: store.derivedState.activityPanel)
                }
            }
            .padding(20)
        }
        .background(Color(nsColor: .windowBackgroundColor))
    }
}

struct ContextRailView: View {
    @ObservedObject var store: DashboardStore
    var closeInspector: (() -> Void)? = nil

    var body: some View {
        CockpitInspectorView(store: store, closeInspector: closeInspector)
    }
}

struct ComposerStatusControlsView: View {
    @ObservedObject var store: DashboardStore
    var showsInlineControls: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Status")
                        .font(.subheadline.weight(.semibold))
                    Text(store.derivedState.privacyBanner.detail)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                Spacer()
                if showsInlineControls {
                    Button("Refresh", systemImage: "arrow.clockwise", action: refresh)
                        .disabled(store.isRefreshing)
                    Button("Copy", systemImage: "doc.on.doc", action: copySummary)
                }
            }
            .buttonStyle(.bordered)
            .controlSize(.small)

            Text(store.copySummaryText())
                .font(.caption2.monospaced())
                .foregroundStyle(.secondary)
                .lineLimit(2)
                .textSelection(.enabled)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .cockpitPanel(cornerRadius: 14)
    }

    private func refresh() {
        Task { await store.refresh(reason: .manual) }
    }

    private func copySummary() {
        copyToPasteboard(store.copySummaryText())
    }
}

private extension DashboardSessionFilter {
    func includesState(_ state: SessionState) -> Bool {
        switch self {
        case .all: return true
        case .running: return state == .running
        case .waitingForInput: return state == .waitingForInput
        case .blocked: return state == .blocked
        case .completed: return state == .completed
        case .failed: return state == .failed
        case .idle: return state == .idle
        case .unknown: return state == .unknown
        }
    }
}

struct HairlineSeparator: View {
    var opacity: Double = 0.22

    var body: some View {
        Rectangle()
            .fill(Color.secondary.opacity(opacity))
            .frame(height: 0.5)
    }
}

private enum CockpitPanelStyle {
    case primary
    case secondary
    case recessed

    var background: Color {
        switch self {
        case .primary:
            return Color(nsColor: .textBackgroundColor)
        case .secondary:
            return Color(nsColor: .controlBackgroundColor).opacity(0.72)
        case .recessed:
            return Color(nsColor: .underPageBackgroundColor).opacity(0.42)
        }
    }

    var strokeOpacity: Double {
        switch self {
        case .primary: return 0.10
        case .secondary: return 0.07
        case .recessed: return 0.04
        }
    }

    var shadowOpacity: Double {
        switch self {
        case .primary: return 0.045
        case .secondary: return 0.018
        case .recessed: return 0
        }
    }
}

private extension View {
    func cockpitPanel(cornerRadius: CGFloat = 18, style: CockpitPanelStyle = .primary, shadow: Bool = true) -> some View {
        self
            .background(style.background)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.secondary.opacity(style.strokeOpacity), lineWidth: 0.5)
            )
            .shadow(color: Color.black.opacity(shadow ? style.shadowOpacity : 0), radius: shadow ? 10 : 0, y: shadow ? 2 : 0)
    }
}

private func copyToPasteboard(_ value: String) {
    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()
    pasteboard.setString(value, forType: .string)
}
