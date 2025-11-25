// Mock fetch
import mockFetch from "../mocks/fetch";
import fs from "fs";
import path from "path";

import {
    issueCredential,
    verifyCredential,
    signPresentation,
    verifyPresentation,
} from "../../src/vc";
import testingKeys from "../data/test-keys";

mockFetch();

// Performance tracking utilities with JSON export
class PerformanceTracker {
    constructor(name) {
        this.name = name;
        this.startTime = null;
        this.endTime = null;
        this.startMemory = null;
        this.endMemory = null;
    }

    start() {
        // Force garbage collection if available (run tests with --expose-gc flag)
        if (global.gc) {
            global.gc();
        }

        this.startMemory = process.memoryUsage();
        this.startTime = process.hrtime.bigint();
    }

    stop() {
        this.endTime = process.hrtime.bigint();
        this.endMemory = process.memoryUsage();
    }

    getResults() {
        const durationMs = Number(this.endTime - this.startTime) / 1_000_000;

        const memoryDelta = {
            rss: this.endMemory.rss - this.startMemory.rss,
            heapTotal: this.endMemory.heapTotal - this.startMemory.heapTotal,
            heapUsed: this.endMemory.heapUsed - this.startMemory.heapUsed,
            external: this.endMemory.external - this.startMemory.external,
        };

        return {
            name: this.name,
            timestamp: new Date().toISOString(),
            duration: {
                ms: parseFloat(durationMs.toFixed(2)),
                seconds: parseFloat((durationMs / 1000).toFixed(3)),
            },
            memory: {
                start: {
                    rss: this.startMemory.rss,
                    heapTotal: this.startMemory.heapTotal,
                    heapUsed: this.startMemory.heapUsed,
                    external: this.startMemory.external,
                },
                end: {
                    rss: this.endMemory.rss,
                    heapTotal: this.endMemory.heapTotal,
                    heapUsed: this.endMemory.heapUsed,
                    external: this.endMemory.external,
                },
                delta: {
                    rss: memoryDelta.rss,
                    heapTotal: memoryDelta.heapTotal,
                    heapUsed: memoryDelta.heapUsed,
                    external: memoryDelta.external,
                },
            },
        };
    }

    formatMemory(bytes) {
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

    printResults() {
        const results = this.getResults();
        console.log(`\n${"=".repeat(80)} `);
        console.log(`Performance Report: ${results.name} `);
        console.log(`${"=".repeat(80)} `);
        console.log(`⏱️  Duration: ${results.duration.ms} ms(${results.duration.seconds}s)`);
        console.log(`\n📊 Memory Usage: `);
        console.log(`   Start: `);
        console.log(`     - RSS:        ${this.formatMemory(results.memory.start.rss)} `);
        console.log(`     - Heap Total: ${this.formatMemory(results.memory.start.heapTotal)} `);
        console.log(`     - Heap Used:  ${this.formatMemory(results.memory.start.heapUsed)} `);
        console.log(`     - External:   ${this.formatMemory(results.memory.start.external)} `);
        console.log(`   End: `);
        console.log(`     - RSS:        ${this.formatMemory(results.memory.end.rss)} `);
        console.log(`     - Heap Total: ${this.formatMemory(results.memory.end.heapTotal)} `);
        console.log(`     - Heap Used:  ${this.formatMemory(results.memory.end.heapUsed)} `);
        console.log(`     - External:   ${this.formatMemory(results.memory.end.external)} `);
        console.log(`   Delta(Change): `);
        console.log(`     - RSS:        ${this.formatMemory(results.memory.delta.rss)} `);
        console.log(`     - Heap Total: ${this.formatMemory(results.memory.delta.heapTotal)} `);
        console.log(`     - Heap Used:  ${this.formatMemory(results.memory.delta.heapUsed)} `);
        console.log(`     - External:   ${this.formatMemory(results.memory.delta.external)} `);
        console.log(`${"=".repeat(80)} \n`);

        return results;
    }
}

// Test data
const issuanceDate = "2020-04-15T09:05:35Z";

function getSampleCredential() {
    return {
        "@context": [
            "https://www.w3.org/2018/credentials/v1",
            "https://www.w3.org/2018/credentials/examples/v1",
        ],
        id: "https://example.com/credentials/1872",
        type: ["VerifiableCredential", "AlumniCredential"],
        issuanceDate,
        credentialSubject: {
            id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
            alumniOf: "Example University",
        },
    };
}

function getSamplePresentation(credentials) {
    return {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiablePresentation"],
        verifiableCredential: credentials,
        id: "https://example.com/presentations/12345",
        holder: "https://example.com/holders/1234567890",
    };
}

// Performance test suite with JSON export
describe("Proof Performance Tests with JSON Export", () => {
    const performanceResults = [];
    const outputDir = path.join(process.cwd(), "performance-results");
    const outputFile = path.join(
        outputDir,
        `performance-${new Date().toISOString().replace(/:/g, "-")}.json`
    );

    beforeAll(() => {
        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    });

    afterAll(() => {
        // Print summary
        console.log(`\n${"#".repeat(80)} `);
        console.log("PERFORMANCE TEST SUMMARY");
        console.log(`${"#".repeat(80)} \n`);

        performanceResults.forEach((result, index) => {
            console.log(`${index + 1}. ${result.name} `);
            console.log(`   Duration: ${result.duration.ms} ms`);
            console.log(`   Memory Delta(Heap Used): ${(result.memory.delta.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log("");
        });

        console.log(`${"#".repeat(80)} \n`);

        // Export results to JSON
        const exportData = {
            metadata: {
                testDate: new Date().toISOString(),
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                totalTests: performanceResults.length,
            },
            results: performanceResults,
            summary: {
                totalDuration: performanceResults.reduce((sum, r) => sum + r.duration.ms, 0),
                averageDuration: performanceResults.reduce((sum, r) => sum + r.duration.ms, 0) / performanceResults.length,
                totalMemoryDelta: performanceResults.reduce((sum, r) => sum + r.memory.delta.heapUsed, 0),
                averageMemoryDelta: performanceResults.reduce((sum, r) => sum + r.memory.delta.heapUsed, 0) / performanceResults.length,
            },
        };

        fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
        console.log(`\n✅ Performance results exported to: ${outputFile} \n`);
    });

    testingKeys.forEach((testKey) => {
        const { sigType, keyDocument } = testKey;

        describe(`Performance Tests for ${keyDocument.type}(${sigType})`, () => {

            test("Credential issuance performance", async () => {
                const tracker = new PerformanceTracker(
                    `Credential Issuance - ${sigType} `
                );

                tracker.start();
                const credential = await issueCredential(
                    testKey.keyDocument,
                    getSampleCredential()
                );
                tracker.stop();

                const results = tracker.printResults();
                performanceResults.push(results);

                expect(credential.proof).toBeDefined();
                expect(credential.proof.type).toBe(sigType);
            }, 60000);

            test("Credential verification performance", async () => {
                const credential = await issueCredential(
                    testKey.keyDocument,
                    getSampleCredential()
                );

                const tracker = new PerformanceTracker(
                    `Credential Verification - ${sigType} `
                );

                tracker.start();
                const result = await verifyCredential(credential);
                tracker.stop();

                const perfResults = tracker.printResults();
                performanceResults.push(perfResults);

                expect(result.verified).toBe(true);
            }, 60000);

            if (keyDocument.type !== "JsonWebKey2020") {
                test("Credential issuance with proofValue", async () => {
                    const tracker = new PerformanceTracker(
                        `Credential Issuance(proofValue) - ${sigType} `
                    );

                    tracker.start();
                    const credential = await issueCredential(
                        testKey.keyDocument,
                        getSampleCredential(),
                        true,
                        null,
                        null,
                        null,
                        null,
                        false,
                        "proofValue"
                    );
                    tracker.stop();

                    const results = tracker.printResults();
                    performanceResults.push(results);

                    expect(credential.proof.proofValue).toBeDefined();
                }, 60000);
            }

            test("JWT credential issuance performance", async () => {
                const tracker = new PerformanceTracker(
                    `JWT Credential Issuance - ${sigType} `
                );

                tracker.start();
                const credential = await issueCredential(
                    testKey.keyDocument,
                    getSampleCredential(),
                    true,
                    null,
                    null,
                    null,
                    null,
                    false,
                    "jwt"
                );
                tracker.stop();

                const results = tracker.printResults();
                performanceResults.push(results);

                expect(typeof credential).toBe("string");
            }, 60000);

            test("JWT credential verification performance", async () => {
                const jwtCredential = await issueCredential(
                    testKey.keyDocument,
                    getSampleCredential(),
                    true,
                    null,
                    null,
                    null,
                    null,
                    false,
                    "jwt"
                );

                const tracker = new PerformanceTracker(
                    `JWT Credential Verification - ${sigType} `
                );

                tracker.start();
                const result = await verifyCredential(jwtCredential);
                tracker.stop();

                const perfResults = tracker.printResults();
                performanceResults.push(perfResults);

                expect(result.verified).toBe(true);
            }, 60000);

            test("Presentation signing performance", async () => {
                const credential = await issueCredential(
                    testKey.keyDocument,
                    getSampleCredential()
                );

                const presentation = getSamplePresentation([credential]);

                const tracker = new PerformanceTracker(
                    `Presentation Signing - ${sigType} `
                );

                tracker.start();
                const signedPresentation = await signPresentation(
                    presentation,
                    testKey.keyDocument,
                    "test_challenge_123",
                    "test_domain.com"
                );
                tracker.stop();

                const results = tracker.printResults();
                performanceResults.push(results);

                expect(signedPresentation.proof).toBeDefined();
                expect(signedPresentation.proof.type).toBe(sigType);
            }, 60000);

            test("Presentation verification performance", async () => {
                const credential = await issueCredential(
                    testKey.keyDocument,
                    getSampleCredential()
                );

                const signedPresentation = await signPresentation(
                    getSamplePresentation([credential]),
                    testKey.keyDocument,
                    "test_challenge_123",
                    "test_domain.com"
                );

                const tracker = new PerformanceTracker(
                    `Presentation Verification - ${sigType} `
                );

                tracker.start();
                const result = await verifyPresentation(signedPresentation, {
                    challenge: "test_challenge_123",
                    domain: "test_domain.com",
                });
                tracker.stop();

                const perfResults = tracker.printResults();
                performanceResults.push(perfResults);

                expect(result.verified).toBe(true);
                expect(result.presentationResult.verified).toBe(true);
            }, 60000);

            test("Batch credential issuance (10 credentials)", async () => {
                const tracker = new PerformanceTracker(
                    `Batch Issuance(10 credentials) - ${sigType} `
                );

                tracker.start();
                const credentials = await Promise.all(
                    Array.from({ length: 10 }, () =>
                        issueCredential(testKey.keyDocument, getSampleCredential())
                    )
                );
                tracker.stop();

                const results = tracker.printResults();
                performanceResults.push(results);

                expect(credentials).toHaveLength(10);
                credentials.forEach((cred) => {
                    expect(cred.proof).toBeDefined();
                });
            }, 120000);

            test("Batch credential verification (10 credentials)", async () => {
                const credentials = await Promise.all(
                    Array.from({ length: 10 }, () =>
                        issueCredential(testKey.keyDocument, getSampleCredential())
                    )
                );

                const tracker = new PerformanceTracker(
                    `Batch Verification(10 credentials) - ${sigType} `
                );

                tracker.start();
                const results = await Promise.all(
                    credentials.map((cred) => verifyCredential(cred))
                );
                tracker.stop();

                const perfResults = tracker.printResults();
                performanceResults.push(perfResults);

                expect(results).toHaveLength(10);
                results.forEach((result) => {
                    expect(result.verified).toBe(true);
                });
            }, 120000);
        });
    });
});
