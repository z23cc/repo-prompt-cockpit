import Foundation

public enum RpCliCommandValidationError: Error, Equatable, CustomStringConvertible {
    case unsupportedCommand(String)
    case malformedAgentManagePayload
    case mutatingAgentManageOperation(String)
    case unsupportedListSessionsSelector(String)
    case unboundedLimit
    case invalidWorkingDirsSelector
    case invalidContextIDSelector
    case invalidWindowIDSelector
    case invalidHiddenWindowIDSelector

    public var description: String {
        switch self {
        case .unsupportedCommand(let command):
            return "Refusing unsupported rp-cli command: \(command)"
        case .malformedAgentManagePayload:
            return "Refusing malformed agent_manage payload."
        case .mutatingAgentManageOperation(let json):
            return "Refusing mutating agent_manage operation: \(json)"
        case .unsupportedListSessionsSelector(let key):
            return "Refusing unsupported list_sessions selector: \(key)"
        case .unboundedLimit:
            return "Refusing list_sessions payload without bounded integer limit."
        case .invalidWorkingDirsSelector:
            return "Refusing list_sessions payload with invalid working_dirs selector."
        case .invalidContextIDSelector:
            return "Refusing list_sessions payload with invalid context_id selector."
        case .invalidWindowIDSelector:
            return "Refusing list_sessions payload with invalid window_id selector."
        case .invalidHiddenWindowIDSelector:
            return "Refusing list_sessions payload with invalid _windowID selector."
        }
    }
}

public enum RpCliCommandValidator {
    public static func validate(args: [String]) throws {
        if args == ["--help"] { return }
        if args == ["-e", "windows"] { return }
        if args == ["-e", "windows", "--raw-json"] { return }

        if args.count == 4,
           args[0] == "-c",
           args[1] == "agent_manage",
           args[2] == "-j" {
            try validateAgentManagePayload(args[3])
            return
        }

        throw RpCliCommandValidationError.unsupportedCommand(args.joined(separator: " "))
    }

    private static func validateAgentManagePayload(_ json: String) throws {
        let payload: Any
        do {
            let data = Data(json.utf8)
            payload = try JSONSerialization.jsonObject(with: data)
        } catch {
            throw RpCliCommandValidationError.malformedAgentManagePayload
        }

        guard let object = payload as? [String: Any], object["op"] as? String == "list_sessions" else {
            throw RpCliCommandValidationError.mutatingAgentManageOperation(json)
        }

        let allowedKeys: Set<String> = ["op", "limit", "working_dirs", "context_id", "window_id", "_windowID"]
        for key in object.keys where !allowedKeys.contains(key) {
            throw RpCliCommandValidationError.unsupportedListSessionsSelector(key)
        }

        guard let limit = object["limit"], isInteger(limit), let limitValue = intValue(limit), (1...100).contains(limitValue) else {
            throw RpCliCommandValidationError.unboundedLimit
        }

        if let workingDirs = object["working_dirs"] {
            guard let values = workingDirs as? [Any], values.allSatisfy({ value in
                guard let string = value as? String else { return false }
                return !string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            }) else {
                throw RpCliCommandValidationError.invalidWorkingDirsSelector
            }
        }

        if let contextID = object["context_id"] {
            guard let value = contextID as? String, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw RpCliCommandValidationError.invalidContextIDSelector
            }
        }

        if let windowID = object["window_id"] {
            guard isPositiveInteger(windowID) else {
                throw RpCliCommandValidationError.invalidWindowIDSelector
            }
        }

        if let hiddenWindowID = object["_windowID"] {
            guard isPositiveInteger(hiddenWindowID) else {
                throw RpCliCommandValidationError.invalidHiddenWindowIDSelector
            }
        }
    }

    private static func isPositiveInteger(_ value: Any) -> Bool {
        guard isInteger(value), let int = intValue(value) else { return false }
        return int >= 1
    }

    private static func isInteger(_ value: Any) -> Bool {
        if value is Bool { return false }
        if value is Int { return true }
        guard let number = value as? NSNumber else { return false }
        return CFNumberIsFloatType(number) == false
    }

    private static func intValue(_ value: Any) -> Int? {
        if value is Bool { return nil }
        if let int = value as? Int { return int }
        guard let number = value as? NSNumber, CFNumberIsFloatType(number) == false else { return nil }
        return number.intValue
    }
}
