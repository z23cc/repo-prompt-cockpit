// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RepoPromptCockpitNative",
    platforms: [.macOS(.v13)],
    products: [
        .library(name: "RepoPromptCockpitCore", targets: ["RepoPromptCockpitCore"]),
        .executable(name: "RepoPromptCockpitApp", targets: ["RepoPromptCockpitApp"])
    ],
    targets: [
        .target(name: "RepoPromptCockpitCore"),
        .executableTarget(
            name: "RepoPromptCockpitApp",
            dependencies: ["RepoPromptCockpitCore"]
        ),
        .executableTarget(
            name: "RepoPromptCockpitChecks",
            dependencies: ["RepoPromptCockpitCore"],
            path: "Tests/RepoPromptCockpitChecks"
        )
    ]
)
