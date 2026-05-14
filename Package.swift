// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RPCode",
    platforms: [.macOS(.v13)],
    products: [
        .library(name: "RPCodeCore", targets: ["RPCodeCore"]),
        .executable(name: "rp-code", targets: ["RPCodeApp"])
    ],
    targets: [
        .target(name: "RPCodeCore"),
        .executableTarget(
            name: "RPCodeApp",
            dependencies: ["RPCodeCore"]
        ),
        .executableTarget(
            name: "RPCodeChecks",
            dependencies: ["RPCodeCore"],
            path: "Tests/RPCodeChecks"
        )
    ]
)
