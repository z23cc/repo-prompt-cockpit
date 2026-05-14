import AppKit
import Combine
import RPCodeCore
import SwiftUI

@main
struct RPCodeApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup("RP Code") {
            ContentView(store: appDelegate.store, setWindowMode: appDelegate.setWindowModeFromCockpit(_:))
        }
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    let store: DashboardStore

    private static let desktopWindowSize = NSSize(width: 1280, height: 780)
    private static let desktopMinimumSize = NSSize(width: 1120, height: 680)
    private static let minimalWindowSize = NSSize(width: 480, height: 500)
    private static let minimalMinimumSize = NSSize(width: 420, height: 420)
    private static let screenMargin: CGFloat = 24

    private var statusItem: NSStatusItem?
    private var storeCancellable: AnyCancellable?
    private var isTerminating = false
    private var appliedModesByWindow: [ObjectIdentifier: WindowMode] = [:]

    override init() {
        AppShellPreferences.migrateLayoutIfNeeded()
        let environment = ProcessInfo.processInfo.environment
        let providerMode: ProviderMode = environment["REPOPROMPT_COCKPIT_PROVIDER"] == "live" ? .live : .fixture
        self.store = DashboardStore(
            initialProviderMode: providerMode,
            initialWindowMode: AppShellPreferences.loadWindowMode()
        )
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        installStatusItem()
        observeStore()
        syncShellFromStore()
        Task {
            _ = await store.refresh(reason: .initial)
            syncShellFromStore()
        }
        store.startPolling(every: 30)
        DispatchQueue.main.async { [weak self] in
            self?.wireKnownWindows()
            self?.applyWindowModeToKnownWindows()
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        isTerminating = true
        saveKnownWindowFrames()
        store.stopPolling()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        wireKnownWindows()
        applyWindowModeToKnownWindows()
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        guard !isTerminating else { return true }
        AppShellPreferences.saveFrame(sender.frame, for: store.windowMode)
        sender.orderOut(nil)
        return false
    }

    func windowDidMove(_ notification: Notification) {
        saveWindowFromNotification(notification)
    }

    func windowDidEndLiveResize(_ notification: Notification) {
        saveWindowFromNotification(notification)
    }

    private func installStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.title = "RPC …"
        statusItem = item
        rebuildStatusMenu()
    }

    private func observeStore() {
        storeCancellable = store.objectWillChange.sink { [weak self] _ in
            Task { @MainActor in
                self?.syncShellFromStore()
            }
        }
    }

    private func syncShellFromStore() {
        rebuildStatusMenu()
        wireKnownWindows()
        applyWindowModeToKnownWindows()
    }

    private func rebuildStatusMenu() {
        let model = buildStatusMenuModel(
            snapshot: store.latestSnapshot,
            windowMode: store.windowMode,
            providerMode: store.providerMode
        )
        statusItem?.button?.title = model.statusTitle

        let menu = NSMenu()
        for item in model.items {
            switch item.role {
            case .separator:
                menu.addItem(.separator())
            case .header, .row, .action:
                let menuItem = NSMenuItem(
                    title: item.title,
                    action: item.action == nil ? nil : #selector(handleStatusMenuAction(_:)),
                    keyEquivalent: keyEquivalent(for: item.action)
                )
                menuItem.isEnabled = item.isEnabled
                menuItem.target = self
                menuItem.toolTip = item.subtitle
                menuItem.representedObject = item.action?.rawValue
                menu.addItem(menuItem)
            }
        }
        statusItem?.menu = menu
    }

    @objc private func handleStatusMenuAction(_ sender: NSMenuItem) {
        guard
            let rawValue = sender.representedObject as? String,
            let action = StatusMenuAction(rawValue: rawValue)
        else { return }

        switch action {
        case .openCockpit:
            openCockpit()
        case .toggleWindowMode:
            toggleWindowMode()
        case .refresh:
            Task {
                _ = await store.refresh(reason: .manual)
                syncShellFromStore()
            }
        case .copySummary:
            copySummaryToPasteboard()
        case .switchToFixture:
            Task {
                await store.setProviderMode(.fixture, refreshImmediately: true)
                syncShellFromStore()
            }
        case .switchToLive:
            Task {
                await store.setProviderMode(.live, refreshImmediately: true)
                syncShellFromStore()
            }
        case .quit:
            isTerminating = true
            NSApp.terminate(nil)
        }
    }

    private func openCockpit() {
        wireKnownWindows()
        let window = cockpitWindow()
        applyWindowMode(to: window)
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func setWindowModeFromCockpit(_ mode: WindowMode) {
        if let window = cockpitWindow() {
            AppShellPreferences.saveFrame(window.frame, for: store.windowMode)
        }
        store.setWindowMode(mode)
        AppShellPreferences.saveWindowMode(mode)
        appliedModesByWindow.removeAll()
        syncShellFromStore()
        openCockpit()
    }

    private func toggleWindowMode() {
        let nextMode: WindowMode = store.windowMode == .minimal ? .desktop : .minimal
        setWindowModeFromCockpit(nextMode)
    }

    private func copySummaryToPasteboard() {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(store.copySummaryText(), forType: .string)
    }

    private func wireKnownWindows() {
        for window in NSApp.windows where window.canBecomeKey {
            window.delegate = self
            window.isReleasedWhenClosed = false
            window.title = "RP Code"
        }
    }

    private func applyWindowModeToKnownWindows() {
        for window in NSApp.windows where window.canBecomeKey {
            applyWindowMode(to: window)
        }
    }

    private func applyWindowMode(to window: NSWindow?) {
        guard let window else { return }
        let identifier = ObjectIdentifier(window)
        let modeChanged = appliedModesByWindow[identifier] != store.windowMode

        switch store.windowMode {
        case .desktop:
            window.level = .normal
            window.collectionBehavior = [.managed, .fullScreenPrimary]
            window.minSize = Self.desktopMinimumSize
            window.titleVisibility = .visible
        case .minimal:
            window.level = .floating
            window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
            window.minSize = Self.minimalMinimumSize
            window.titleVisibility = .hidden
        }

        if modeChanged {
            let targetScreen = preferredScreen(for: store.windowMode, window: window)
            let nextFrame = AppShellPreferences.loadFrame(for: store.windowMode)
                ?? defaultFrame(for: store.windowMode, on: targetScreen)
            window.setFrame(clampedFrame(nextFrame, minimumSize: window.minSize, on: targetScreen), display: true)
            appliedModesByWindow[identifier] = store.windowMode
        }
    }

    private func preferredScreen(for mode: WindowMode, window: NSWindow) -> NSScreen? {
        switch mode {
        case .desktop:
            return NSScreen.main ?? window.screen
        case .minimal:
            return window.screen ?? NSScreen.main
        }
    }

    private func cockpitWindow() -> NSWindow? {
        NSApp.windows.first { $0.canBecomeKey && $0.contentView != nil }
    }

    private func saveKnownWindowFrames() {
        for window in NSApp.windows where window.canBecomeKey {
            AppShellPreferences.saveFrame(window.frame, for: store.windowMode)
        }
    }

    private func saveWindowFromNotification(_ notification: Notification) {
        guard let window = notification.object as? NSWindow else { return }
        AppShellPreferences.saveFrame(window.frame, for: store.windowMode)
    }

    private func defaultFrame(for mode: WindowMode, on screen: NSScreen?) -> NSRect {
        let visibleFrame = screen?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        switch mode {
        case .desktop:
            let size = fittedWindowSize(
                preferred: Self.desktopWindowSize,
                minimum: Self.desktopMinimumSize,
                in: visibleFrame
            )
            return NSRect(
                x: visibleFrame.midX - (size.width / 2),
                y: visibleFrame.midY - (size.height / 2),
                width: size.width,
                height: size.height
            )
        case .minimal:
            let size = fittedWindowSize(
                preferred: Self.minimalWindowSize,
                minimum: Self.minimalMinimumSize,
                in: visibleFrame
            )
            return NSRect(
                x: visibleFrame.maxX - size.width - Self.screenMargin,
                y: visibleFrame.maxY - size.height - Self.screenMargin,
                width: size.width,
                height: size.height
            )
        }
    }

    private func fittedWindowSize(preferred: NSSize, minimum: NSSize, in visibleFrame: NSRect) -> NSSize {
        let availableWidth = max(1, visibleFrame.width - (Self.screenMargin * 2))
        let availableHeight = max(1, visibleFrame.height - (Self.screenMargin * 2))
        return NSSize(
            width: min(max(preferred.width, minimum.width), availableWidth),
            height: min(max(preferred.height, minimum.height), availableHeight)
        )
    }

    private func clampedFrame(_ frame: NSRect, minimumSize: NSSize, on screen: NSScreen?) -> NSRect {
        let visibleFrame = screen?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let width = max(frame.width, minimumSize.width)
        let height = max(frame.height, minimumSize.height)
        let minX = visibleFrame.minX + Self.screenMargin
        let minY = visibleFrame.minY + Self.screenMargin
        let maxX = max(minX, visibleFrame.maxX - width - Self.screenMargin)
        let maxY = max(minY, visibleFrame.maxY - height - Self.screenMargin)

        return NSRect(
            x: min(max(frame.origin.x, minX), maxX),
            y: min(max(frame.origin.y, minY), maxY),
            width: width,
            height: height
        )
    }

    private func keyEquivalent(for action: StatusMenuAction?) -> String {
        switch action {
        case .quit: return "q"
        case .refresh: return "r"
        default: return ""
        }
    }
}

private enum AppShellPreferences {
    private static let modeKey = "RPCode.windowMode"
    private static let desktopFrameKey = "RPCode.windowFrame.desktop"
    private static let minimalFrameKey = "RPCode.windowFrame.minimal"
    private static let layoutVersionKey = "RPCode.windowLayoutVersion"
    private static let currentLayoutVersion = 7

    static func migrateLayoutIfNeeded() {
        let storedVersion = UserDefaults.standard.integer(forKey: layoutVersionKey)
        guard storedVersion < currentLayoutVersion else { return }
        UserDefaults.standard.removeObject(forKey: desktopFrameKey)
        UserDefaults.standard.removeObject(forKey: minimalFrameKey)
        UserDefaults.standard.set(currentLayoutVersion, forKey: layoutVersionKey)
    }

    static func loadWindowMode(default defaultMode: WindowMode = .desktop) -> WindowMode {
        guard
            let rawValue = UserDefaults.standard.string(forKey: modeKey),
            let mode = WindowMode(rawValue: rawValue)
        else { return defaultMode }
        return mode
    }

    static func saveWindowMode(_ mode: WindowMode) {
        UserDefaults.standard.set(mode.rawValue, forKey: modeKey)
    }

    static func loadFrame(for mode: WindowMode) -> NSRect? {
        guard let value = UserDefaults.standard.string(forKey: frameKey(for: mode)) else { return nil }
        let frame = NSRectFromString(value)
        guard frame.width >= 240, frame.height >= 140 else { return nil }
        return frame
    }

    static func saveFrame(_ frame: NSRect, for mode: WindowMode) {
        guard frame.width >= 240, frame.height >= 140 else { return }
        UserDefaults.standard.set(NSStringFromRect(frame), forKey: frameKey(for: mode))
    }

    private static func frameKey(for mode: WindowMode) -> String {
        switch mode {
        case .desktop: return desktopFrameKey
        case .minimal: return minimalFrameKey
        }
    }
}
