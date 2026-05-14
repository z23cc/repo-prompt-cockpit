import Foundation

public enum ObservationKind: String, Codable, Equatable, Sendable {
    case observed
    case inferred
    case fixture
    case unavailable
}

public enum CapabilityStatus: String, Codable, Equatable, Sendable {
    case available
    case unavailable
    case error
    case unknown
}

public enum PrivacyClass: String, Codable, Equatable, Sendable {
    case metadata
    case logExcerpt = "log_excerpt"
    case transcript
    case localOnly = "local_only"
}

public enum SessionState: String, Codable, Equatable, Sendable {
    case running
    case waitingForInput = "waiting_for_input"
    case blocked
    case completed
    case failed
    case idle
    case unknown
}

public enum ProviderMode: String, Codable, Equatable, Sendable {
    case live
    case fixture
}

public enum WindowMode: String, Codable, Equatable, Sendable {
    case desktop
    case minimal
}

public enum ProviderIdentity: String, Codable, Equatable, Sendable {
    case rpCli = "rp-cli"
    case demoFixture = "demo-fixture"
}

public enum DiagnosticSeverity: String, Codable, Equatable, Sendable {
    case info
    case warning
    case error
}

public enum ParseFormat: String, Codable, Equatable, Sendable {
    case text
    case json
    case fixture
    case none
}

public enum AttentionState: String, Codable, Equatable, Sendable {
    case running
    case waitingForInput = "waiting_for_input"
    case blocked
    case completed
    case failed
    case idle
    case unknown
    case workspace
    case diagnostic
}

public enum MetadataValue: Codable, Equatable, Sendable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else {
            self = .string(try container.decode(String.self))
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}

public struct ProviderDiagnostic: Codable, Equatable, Sendable {
    public var code: String
    public var message: String
    public var severity: DiagnosticSeverity
    public var observedAt: String
    public var command: String?

    public init(code: String, message: String, severity: DiagnosticSeverity, observedAt: String, command: String? = nil) {
        self.code = code
        self.message = message
        self.severity = severity
        self.observedAt = observedAt
        self.command = command
    }
}

public struct CapabilityMatrixEntry: Codable, Equatable, Sendable {
    public var field: String
    public var source: String
    public var command: String?
    public var requiresBinding: Bool
    public var parseFormat: ParseFormat
    public var failureMode: String
    public var privacyClass: PrivacyClass
    public var observation: ObservationKind
    public var status: CapabilityStatus

    public init(field: String, source: String, command: String? = nil, requiresBinding: Bool, parseFormat: ParseFormat, failureMode: String, privacyClass: PrivacyClass, observation: ObservationKind, status: CapabilityStatus) {
        self.field = field
        self.source = source
        self.command = command
        self.requiresBinding = requiresBinding
        self.parseFormat = parseFormat
        self.failureMode = failureMode
        self.privacyClass = privacyClass
        self.observation = observation
        self.status = status
    }
}

public struct RepoPromptTab: Codable, Equatable, Sendable {
    public var name: String
    public var contextId: String?
    public var active: Bool
    public var observation: ObservationKind

    public init(name: String, contextId: String? = nil, active: Bool, observation: ObservationKind) {
        self.name = name
        self.contextId = contextId
        self.active = active
        self.observation = observation
    }
}

public struct RepoPromptWindow: Codable, Equatable, Sendable {
    public var id: Int
    public var workspace: String
    public var workspaceId: String?
    public var repoPath: String?
    public var repoPaths: [String]?
    public var activeContextId: String?
    public var tabs: [RepoPromptTab]
    public var observation: ObservationKind

    public init(id: Int, workspace: String, workspaceId: String? = nil, repoPath: String? = nil, repoPaths: [String]? = nil, activeContextId: String? = nil, tabs: [RepoPromptTab], observation: ObservationKind) {
        self.id = id
        self.workspace = workspace
        self.workspaceId = workspaceId
        self.repoPath = repoPath
        self.repoPaths = repoPaths
        self.activeContextId = activeContextId
        self.tabs = tabs
        self.observation = observation
    }
}

public struct AgentSession: Codable, Equatable, Sendable {
    public var id: String
    public var title: String
    public var workspace: String?
    public var state: SessionState
    public var model: String?
    public var progress: Double?
    public var updatedAt: String?
    public var observation: ObservationKind
    public var summary: String?
    public var parentSessionId: String?
    public var workflowId: String?
    public var metadata: [String: MetadataValue]?

    public init(id: String, title: String, workspace: String? = nil, state: SessionState, model: String? = nil, progress: Double? = nil, updatedAt: String? = nil, observation: ObservationKind, summary: String? = nil, parentSessionId: String? = nil, workflowId: String? = nil, metadata: [String: MetadataValue]? = nil) {
        self.id = id
        self.title = title
        self.workspace = workspace
        self.state = state
        self.model = model
        self.progress = progress
        self.updatedAt = updatedAt
        self.observation = observation
        self.summary = summary
        self.parentSessionId = parentSessionId
        self.workflowId = workflowId
        self.metadata = metadata
    }
}

public struct AttentionItem: Codable, Equatable, Sendable {
    public var id: String
    public var label: String
    public var detail: String
    public var priority: Int
    public var state: AttentionState
    public var observation: ObservationKind

    public init(id: String, label: String, detail: String, priority: Int, state: AttentionState, observation: ObservationKind) {
        self.id = id
        self.label = label
        self.detail = detail
        self.priority = priority
        self.state = state
        self.observation = observation
    }
}

public struct ControlPlaneSnapshot: Codable, Equatable, Sendable {
    public var generatedAt: String
    public var provider: ProviderIdentity
    public var windows: [RepoPromptWindow]
    public var sessions: [AgentSession]
    public var capabilities: [CapabilityMatrixEntry]
    public var diagnostics: [ProviderDiagnostic]
    public var summarySource: ObservationKind

    public init(generatedAt: String, provider: ProviderIdentity, windows: [RepoPromptWindow], sessions: [AgentSession], capabilities: [CapabilityMatrixEntry], diagnostics: [ProviderDiagnostic], summarySource: ObservationKind) {
        self.generatedAt = generatedAt
        self.provider = provider
        self.windows = windows
        self.sessions = sessions
        self.capabilities = capabilities
        self.diagnostics = diagnostics
        self.summarySource = summarySource
    }
}

public protocol RepoPromptProvider: Sendable {
    var name: ProviderIdentity { get }
    func collectSnapshot() async throws -> ControlPlaneSnapshot
}
