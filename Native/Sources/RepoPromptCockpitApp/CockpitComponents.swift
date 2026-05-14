import RepoPromptCockpitCore
import SwiftUI

struct SectionHeader: View {
    var title: String
    var subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.headline)
            Text(subtitle)
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
}

struct TruthBadge: View {
    var badge: PresentationBadge

    var body: some View {
        Label(badge.label, systemImage: badge.systemImageName)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .foregroundStyle(badge.tone.foregroundStyle)
            .background(badge.tone.backgroundStyle, in: Capsule())
            .overlay(Capsule().stroke(badge.tone.foregroundStyle.opacity(0.25)))
            .accessibilityLabel(badge.label)
    }
}

struct TruthfulEmptyState: View {
    var text: String

    var body: some View {
        Text(text)
            .font(.callout)
            .foregroundStyle(.secondary)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(.quaternary))
    }
}

struct CountStrip: View {
    var counts: StatusCounts
    var compact: Bool
    /// Sidebar uses a 2-column grid so pill labels stay fully legible at narrow widths.
    var sidebar: Bool = false

    var body: some View {
        if sidebar {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                CountPill(label: "Sessions", value: counts.sessions)
                CountPill(label: "Running", value: counts.running, state: .running)
                CountPill(label: "Waiting", value: counts.waitingForInput, state: .waitingForInput)
                CountPill(label: "Failed", value: counts.failed, state: .failed)
            }
        } else if compact {
            HStack(spacing: 8) {
                CountPill(label: "Sessions", value: counts.sessions)
                CountPill(label: "Running", value: counts.running, state: .running)
                CountPill(label: "Waiting", value: counts.waitingForInput, state: .waitingForInput)
                CountPill(label: "Failed", value: counts.failed, state: .failed)
            }
        } else {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                CountPill(label: "Workspaces", value: counts.workspaces)
                CountPill(label: "Sessions", value: counts.sessions)
                CountPill(label: "Running", value: counts.running, state: .running)
                CountPill(label: "Waiting", value: counts.waitingForInput, state: .waitingForInput)
                CountPill(label: "Blocked", value: counts.blocked, state: .blocked)
                CountPill(label: "Completed", value: counts.completed, state: .completed)
                CountPill(label: "Failed", value: counts.failed, state: .failed)
                CountPill(label: "Idle/Unknown", value: counts.idle + counts.unknown, state: .unknown)
            }
        }
    }
}

struct CountPill: View {
    var label: String
    var value: Int
    var state: SessionState? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(value)")
                .font(.subheadline.weight(.semibold).monospacedDigit())
                .foregroundStyle(statusColor)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(statusColor.opacity(0.10), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).stroke(statusColor.opacity(0.16)))
    }

    private var statusColor: Color {
        statusCountColor(for: state)
    }
}

struct SidebarTabButton: View {
    var tab: DashboardTab
    var isSelected: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: iconName)
                    .accessibilityHidden(true)
                Text(title)
                Spacer()
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(isSelected ? Color.accentColor.opacity(0.15) : Color.clear, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
    }

    private var title: String { tab.label }

    private var iconName: String {
        switch tab {
        case .plan: return "checklist"
        case .activity: return "waveform.path.ecg"
        case .artifacts: return "shippingbox"
        case .logs: return "doc.text.magnifyingglass"
        case .results: return "checkmark.seal"
        }
    }
}

struct FilterChips: View {
    var selectedFilter: DashboardSessionFilter
    var filters: [DashboardSessionFilter] = [.all, .running, .waitingForInput, .blocked, .failed, .completed, .idle, .unknown]
    var counts: [DashboardSessionFilter: Int] = [:]
    var selectFilter: (DashboardSessionFilter) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(filters, id: \.self) { filter in
                    Button(action: { selectFilter(filter) }) {
                        Text(label(for: filter))
                            .font(.caption2.weight(selectedFilter == filter ? .semibold : .medium))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .foregroundStyle(selectedFilter == filter ? Color.accentColor : .secondary)
                            .background(selectedFilter == filter ? Color.accentColor.opacity(0.12) : Color(nsColor: .windowBackgroundColor), in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .accessibilityLabel("Session filter")
    }

    private func label(for filter: DashboardSessionFilter) -> String {
        if let count = counts[filter] {
            return "\(title(for: filter)) \(count)"
        }
        return title(for: filter)
    }

    private func title(for filter: DashboardSessionFilter) -> String {
        switch filter {
        case .all: return "All"
        case .running: return "Running"
        case .waitingForInput: return "Waiting"
        case .blocked: return "Blocked"
        case .completed: return "Completed"
        case .failed: return "Failed"
        case .idle: return "Idle"
        case .unknown: return "Unknown"
        }
    }
}

struct WindowRow: View {
    var window: RepoPromptWindow
    var isSelected: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(window.workspace)
                        .font(.callout.weight(.semibold))
                        .lineLimit(1)
                    Spacer()
                    TruthBadge(badge: observationBadge(window.observation))
                }
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(isSelected ? Color.accentColor.opacity(0.12) : Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(isSelected ? Color.accentColor.opacity(0.5) : Color.secondary.opacity(0.12)))
        }
        .buttonStyle(.plain)
    }

    private var subtitle: String {
        let activeTab = window.tabs.first { $0.active }?.name ?? "active tab unavailable"
        return "Window \(window.id) · \(activeTab) · \(window.repoPath ?? "repo path unavailable")"
    }
}

struct SessionRow: View {
    var session: AgentSession
    var isSelected: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 7) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(session.title)
                            .font(.callout.weight(.semibold))
                            .lineLimit(2)
                        Text(sessionSubtitle(session))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                    Spacer()
                    TruthBadge(badge: sessionStateBadge(session.state))
                }
                if let progress = session.progress {
                    ProgressView(value: max(0, min(progress, 1)))
                        .accessibilityLabel("Progress")
                        .accessibilityValue(progressLabel(progress) ?? "unavailable")
                }
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(isSelected ? Color.accentColor.opacity(0.12) : Color(nsColor: .textBackgroundColor), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(isSelected ? Color.accentColor.opacity(0.5) : Color.secondary.opacity(0.12)))
        }
        .buttonStyle(.plain)
    }
}

struct WorkflowTabButton: View {
    var tab: DashboardTab
    var isSelected: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(tab.label)
                if !tab.isBodyAvailableInCockpit {
                    Text("unavailable")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.tertiary)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color.secondary.opacity(0.10), in: Capsule())
                }
            }
            .font(.callout.weight(isSelected ? .semibold : .regular))
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(isSelected ? Color.accentColor.opacity(0.14) : Color.clear, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(tab.label)
    }
}

struct SnapshotPill: View {
    var label: String

    var body: some View {
        Text(label)
            .font(.caption2.weight(.medium))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color(nsColor: .controlBackgroundColor), in: Capsule())
    }
}

struct ImplementationSessionCard: View {
    var item: ImplementationPlanItem
    var isSelected: Bool
    var generatedAt: String?
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline) {
                    Text(item.title)
                        .font(.callout.weight(.semibold))
                        .lineLimit(2)
                    Spacer()
                    if let age = ageLabel(updatedAt: item.updatedAt, generatedAt: generatedAt) {
                        Text(age)
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(spacing: 6) {
                    if let state = item.state {
                        TruthBadge(badge: sessionStateBadge(state))
                    } else {
                        TruthBadge(badge: observationBadge(.unavailable))
                    }
                    if let workspace = item.workspace {
                        Text(workspace)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }

                Text(item.detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)

                HStack(spacing: 8) {
                    Text(avatarInitials(item.model))
                        .font(.caption.weight(.bold))
                        .frame(width: 24, height: 24)
                        .background(statusColor.opacity(0.14), in: Circle())
                    Text(item.model ?? "Agent unavailable")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(progressLabel(item.progress) ?? "progress unavailable")
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(.secondary)
                }

                ProgressView(value: item.progress.map { max(0, min($0, 1)) } ?? 1)
                    .tint(statusColor)
                    .opacity(item.progress == nil ? 0.35 : 1)
                    .accessibilityLabel("Progress")
                    .accessibilityValue(progressLabel(item.progress) ?? "progress unavailable")
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(isSelected ? Color.accentColor.opacity(0.10) : Color(nsColor: .windowBackgroundColor), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(isSelected ? Color.accentColor.opacity(0.35) : Color.secondary.opacity(0.10)))
            .shadow(color: Color.black.opacity(isSelected ? 0.06 : 0.025), radius: isSelected ? 8 : 3, y: 1)
        }
        .buttonStyle(.plain)
        .disabled(isPlaceholder)
    }

    private var isPlaceholder: Bool {
        if case .placeholder = item.kind { return true }
        return false
    }

    private var statusColor: Color {
        item.state.map(sessionStateColor) ?? statusCountColor(for: nil)
    }
}

private func avatarInitials(_ model: String?) -> String {
    guard let model else { return "·" }
    let cleaned = model.map { $0.isLetter || $0.isNumber || $0 == " " ? $0 : " " }
    let tokens = String(cleaned).split(separator: " ").map(String.init)
    let letterTokens = tokens.filter { $0.first?.isLetter == true }
    if letterTokens.count >= 2 { return String(letterTokens[0].prefix(1) + letterTokens[1].prefix(1)).uppercased() }
    if let token = letterTokens.first ?? tokens.first { return String(token.prefix(2)).uppercased() }
    return "·"
}

private func ageLabel(updatedAt: String?, generatedAt: String?) -> String? {
    guard let updatedAt, let generatedAt else { return nil }
    let formatter = ISO8601DateFormatter()
    guard let updated = formatter.date(from: updatedAt), let generated = formatter.date(from: generatedAt) else { return nil }
    let diff = max(0, Int(generated.timeIntervalSince(updated)))
    if diff < 60 { return "\(diff)s" }
    let minutes = diff / 60
    if minutes < 60 { return "\(minutes)m" }
    let hours = minutes / 60
    if hours < 24 { return "\(hours)h" }
    return "\(hours / 24)d"
}

extension PresentationTone {
    var foregroundStyle: Color {
        switch self {
        case .accent: return .accentColor
        case .neutral: return .secondary
        case .success: return .green
        case .warning: return .orange
        case .danger: return .red
        case .unavailable: return .secondary
        }
    }

    var backgroundStyle: Color {
        foregroundStyle.opacity(0.12)
    }
}
