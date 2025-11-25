// Mock fetch
import mockFetch from "../mocks/fetch";

import {
    issueCredential,
    verifyCredential,
    signPresentation,
    verifyPresentation,
} from "../../src/vc";
import testingKeys from "../data/test-keys";

mockFetch();

// Performance tracking utilities
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
        const durationMs = Number(this.endTime - this.startTime) / 1_000_000; // Convert nanoseconds to milliseconds

        const memoryDelta = {
            rss: this.endMemory.rss - this.startMemory.rss,
            heapTotal: this.endMemory.heapTotal - this.startMemory.heapTotal,
            heapUsed: this.endMemory.heapUsed - this.startMemory.heapUsed,
            external: this.endMemory.external - this.startMemory.external,
        };

        return {
            name: this.name,
            duration: {
                ms: durationMs.toFixed(2),
                seconds: (durationMs / 1000).toFixed(3),
            },
            memory: {
                start: this.formatMemory(this.startMemory),
                end: this.formatMemory(this.endMemory),
                delta: this.formatMemory(memoryDelta),
            },
        };
    }

    formatMemory(mem) {
        return {
            rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            external: `${(mem.external / 1024 / 1024).toFixed(2)} MB`,
        };
    }

    printResults() {
        const results = this.getResults();
        console.log(`\n${"=".repeat(80)} `);
        console.log(`Performance Report: ${results.name} `);
        console.log(`${"=".repeat(80)} `);
        console.log(`⏱️  Duration: ${results.duration.ms} ms(${results.duration.seconds}s)`);
        console.log(`\n📊 Memory Usage: `);
        console.log(`   Start: `);
        console.log(`     - RSS:        ${results.memory.start.rss} `);
        console.log(`     - Heap Total: ${results.memory.start.heapTotal} `);
        console.log(`     - Heap Used:  ${results.memory.start.heapUsed} `);
        console.log(`     - External:   ${results.memory.start.external} `);
        console.log(`   End: `);
        console.log(`     - RSS:        ${results.memory.end.rss} `);
        console.log(`     - Heap Total: ${results.memory.end.heapTotal} `);
        console.log(`     - Heap Used:  ${results.memory.end.heapUsed} `);
        console.log(`     - External:   ${results.memory.end.external} `);
        console.log(`   Delta(Change): `);
        console.log(`     - RSS:        ${results.memory.delta.rss} `);
        console.log(`     - Heap Total: ${results.memory.delta.heapTotal} `);
        console.log(`     - Heap Used:  ${results.memory.delta.heapUsed} `);
        console.log(`     - External:   ${results.memory.delta.external} `);
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

// Performance test suite
describe("Proof Generation & Verification Performance Tests", () => {
    // Store results for summary
    const performanceResults = [];

    afterAll(() => {
        // Print summary of all tests
        console.log(`\n${"#".repeat(80)} `);
        console.log("PERFORMANCE TEST SUMMARY");
        console.log(`${"#".repeat(80)} \n`);

        performanceResults.forEach((result, index) => {
            console.log(`${index + 1}. ${result.name} `);
            console.log(`   Duration: ${result.duration.ms} ms`);
            console.log(`   Memory Delta(Heap Used): ${result.memory.delta.heapUsed} `);
            console.log("");
        });

        console.log(`${"#".repeat(80)} \n`);
    });

    testingKeys.forEach((testKey) => {
        const { sigType, keyDocument } = testKey;

        describe(`Performance Tests for ${keyDocument.type}(${sigType})`, () => {

            test("Measure credential issuance (proof generation) performance", async () => {
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

                // Verify the credential was actually created
                expect(credential.proof).toBeDefined();
                expect(credential.proof.type).toBe(sigType);
            }, 60000);

            test("Measure credential verification (proof verification) performance", async () => {
                // First, issue a credential
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

                // Verify the verification was successful
                expect(result.verified).toBe(true);
            }, 60000);

            // Test JWT format if not JsonWebKey (which can't use proofValue)
            if (keyDocument.type !== "JsonWebKey2020") {
                test("Measure credential issuance with proofValue format", async () => {
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

            test("Measure JWT credential issuance performance", async () => {
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

            test("Measure JWT credential verification performance", async () => {
                // First, issue a JWT credential
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

            test("Measure presentation signing performance", async () => {
                // First, create a credential
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

            test("Measure presentation verification performance", async () => {
                // First, create and sign a presentation
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

            test("Measure batch credential issuance performance (10 credentials)", async () => {
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

            test("Measure batch credential verification performance (10 credentials)", async () => {
                // First, create 10 credentials
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
