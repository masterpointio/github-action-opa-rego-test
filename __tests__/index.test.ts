import {
  ProcessedTestResult,
  ProcessedCoverageResult,
} from "../src/interfaces";
import {
  mockProcessedTestResults,
  mockProcessedCoverageResults,
} from "./mockResults";
import {
  processTestResults,
  processCoverageReport,
} from "../src/testResultProcessing";
import { formatResults } from "../src/formatResults";

import * as path from "path";
import * as fs from "fs";

// Obtained by running `opa test ./spacelift_policies --format=json --v0-compatible`
export const testOutput = fs.readFileSync(
  path.join(__dirname, "sample_test_output.txt"),
  "utf8",
);

export const coverageOutput = fs.readFileSync(
  path.join(__dirname, "sample_coverage_output.txt"),
  "utf8",
);

export const multipleUncoveredLinesOutput = fs.readFileSync(
  path.join(__dirname, "sample_coverage_multiple_uncovered_lines.txt"),
  "utf8",
);

describe("processTestResults", () => {
  it("should correctly parse test output", () => {
    const result = processTestResults(JSON.parse(testOutput));
    expect(result).toHaveLength(8);

    expect(result[0]).toEqual({
      file: "tests/cancel-in-progress-runs_test.rego",
      status: "PASS",
      passed: 2,
      total: 2,
      details: expect.arrayContaining([
        "✅ test_cancel_runs_allowed",
        "✅ test_cancel_runs_denied",
      ]),
    });
  });

  it("should handle empty input", () => {
    const result = processTestResults([]);
    expect(result).toEqual([]);
  });

  it("should correctly parse failed tests", () => {
    const result = processTestResults(JSON.parse(testOutput));
    expect(result[2]).toEqual({
      file: "tests/enforce-module-use-policy_test.rego",
      status: "FAIL",
      passed: 3,
      total: 4,
      details: [
        "✅ test_deny_creation_of_controlled_resource_type",
        "✅ test_deny_update_of_controlled_resource_type",
        "❌ test_allow_deletion_of_controlled_resource_type",
        "✅ test_allow_creation_of_uncontrolled_resource_type",
      ],
    });
  });
});

describe("processCoverageReport", () => {
  const parsedCoverageResults = processCoverageReport(
    JSON.parse(coverageOutput),
  );

  it("should correctly parse coverage output - singular not covered lines", () => {
    const targetFile = "cancel-in-progress-runs.rego";
    const result = parsedCoverageResults.find(
      (item) => item.file === targetFile,
    );

    expect(result).toBeDefined();
    expect(result!.coverage).toBeCloseTo(83.33);
    expect(result!.notCoveredLines).toBe("16");
  });

  it("should correctly parse coverage output - multiple, hyphenated not covered lines", () => {
    const targetFile = "enforce-module-use-policy.rego";
    const result = parsedCoverageResults.find(
      (item) => item.file === targetFile,
    );

    expect(result).toBeDefined();
    expect(result!.coverage).toBeCloseTo(47.826);
    expect(result!.notCoveredLines).toBe(
      "37, 42, 46, 52, 54, 57, 60-61, 64, 68, 78, 80",
    );
  });

  it("should correctly parse coverage output - multiple, comma-separated not covered lines", () => {
    const targetFile = "readers-writers-admins-teams.rego";
    const result = parsedCoverageResults.find(
      (item) => item.file === targetFile,
    );

    expect(result).toBeDefined();
    expect(result!.coverage).toBeCloseTo(83.33);
    expect(result!.notCoveredLines).toBe("16, 24, 28");
  });

  it("should correctly parse coverage output - undefined coverage", () => {
    const targetFile = "drift-detection.rego";
    const result = parsedCoverageResults.find(
      (item) => item.file === targetFile,
    );

    expect(result).toBeDefined();
    expect(result!.coverage).toBeUndefined();
    expect(result!.notCoveredLines).toBe("3, 5, 8, 11");
  });

  it("should correctly parse coverage output - 100% coverage with empty not covered lines", () => {
    const targetFile = "tests/cancel-in-progress-runs_test.rego";
    const result = parsedCoverageResults.find(
      (item) => item.file === targetFile,
    );

    expect(result).toBeDefined();
    expect(result!.coverage).toBe(100);
    expect(result!.notCoveredLines).toBe("");
  });
});

describe("formatResults", () => {
  const parsedTestResults = mockProcessedTestResults;
  const parsedCoverageResults = mockProcessedCoverageResults;

  it("should correctly format results with coverage", () => {
    const testResults: ProcessedTestResult[] = [
      {
        file: "./examples/tests/ignore-changes-outside-root_test.rego",
        status: "PASS",
        passed: 12,
        total: 12,
        details: ["✅ test1", "✅ test2", "✅ test3"],
      },
    ];
    const specificCoverageResult = parsedCoverageResults.filter(
      (res) => res.file === "tests/ignore-changes-outside-root.rego",
    );

    const result = formatResults(testResults, specificCoverageResult, true);
    expect(result).toContain("# 🧪 OPA Rego Policy Test Results");
    expect(result).toContain(
      "| File | Status | Passed | Total | Coverage | Details |",
    );
    expect(result).toContain(
      "| ./examples/tests/ignore-changes-outside-root_test.rego | ✅ PASS | 12 | 12 | 97.44% | <details><summary>Show Details</summary>✅ test1<br>✅ test2<br>✅ test3</details> |",
    );
    expect(result).toContain(
      "<details><summary>Show Details</summary>✅ test1<br>✅ test2<br>✅ test3</details>",
    );
  });

  it("should correctly format results without coverage and failed", () => {
    const testResults: ProcessedTestResult[] = [
      {
        file: "./examples/tests/ignore-changes-outside-root_test.rego",
        status: "FAIL",
        passed: 11,
        total: 12,
        details: ["✅ test1", "✅ test2", "❌ test3"],
      },
    ];
    const result = formatResults(testResults, [], false);
    expect(result).toContain("# 🧪 OPA Rego Policy Test Results");
    expect(result).toContain("| File | Status | Passed | Total | Details |");
    expect(result).toContain(
      "| ./examples/tests/ignore-changes-outside-root_test.rego | ❌ FAIL | 11 | 12 | <details><summary>Show Details</summary>✅ test1<br>✅ test2<br>❌ test3</details> |",
    );
  });

  it("should handle all test statuses and coverage scenarios from parsed results", () => {
    const result = formatResults(
      mockProcessedTestResults,
      mockProcessedCoverageResults,
      true,
    );

    expect(result).toContain(
      "| tests/ignore-changes-outside-root_test.rego | ✅ PASS | 12 | 12 | 97.44% | <details><summary>Show Details</summary>✅ test1<br>✅ test2<br>✅ test3<br>✅ test4<br>✅ test5<br>✅ test6<br>✅ test7<br>✅ test8<br>✅ test9<br>✅ test10<br>✅ test11<br>✅ test12</details> |",
    );

    expect(result).toContain(
      "| tests/track-using-labels_test.rego | ✅ PASS | 8 | 8 | 76.47% | <details><summary>Show Details</summary>✅ test_label_match<br>✅ test_label_no_match<br>✅ test_no_labels_on_resource<br>✅ test_no_labels_on_constraint<br>✅ test_empty_labels_on_resource<br>✅ test_empty_labels_on_constraint<br>✅ test_multiple_labels_match<br>✅ test_multiple_labels_no_match</details> |",
    );

    expect(result).toContain(
      "| tests/readers-writers-admins-teams_test.rego | ✅ PASS | 6 | 6 | 83.33% <details><summary>Uncovered Lines</summary>16, 24, 28</details> | <details><summary>Show Details</summary>✅ test_reader_access<br>✅ test_writer_access<br>✅ test_admin_access<br>✅ test_no_access<br>✅ test_multiple_roles<br>✅ test_nested_teams</details> |",
    );

    expect(result).toContain(
      "| tests/cancel-in-progress-runs_test.rego | ✅ PASS | 2 | 2 | 83.33% <details><summary>Uncovered Lines</summary>16</details> | <details><summary>Show Details</summary>✅ test_cancel_successful<br>✅ test_cancel_failure</details> |",
    );

    const fileNames = [
      "ignore-changes-outside-root_test.rego",
      "track-using-labels_test.rego",
      "enforce-password-length_test.rego",
      "notification-stack-failure-origins_test.rego",
      "enforce-module-use-policy_test.rego",
      "readers-writers-admins-teams_test.rego",
      "cancel-in-progress-runs_test.rego",
      "do-not-delete-stateful-resources_test.rego",
    ];

    fileNames.forEach((fileName) => {
      expect(result).toContain(`tests/${fileName}`);
    });

    const resultRows = result
      .split("\n")
      .filter((line) => line.startsWith("|") && line.includes("PASS"));
    expect(resultRows.length).toBe(
      parsedTestResults.filter((r) => r.status === "PASS").length,
    );
  });

  it("should format results without coverage when showCoverage is false", () => {
    const result = formatResults(
      parsedTestResults,
      parsedCoverageResults,
      false,
    );
    expect(result).not.toContain("Coverage");
    expect(result).toContain("| File | Status | Passed | Total | Details |");
    expect(result).toContain(
      "| tests/ignore-changes-outside-root_test.rego | ✅ PASS | 12 | 12 |",
    );
  });

  it("should handle 'NO TESTS' status", () => {
    const testResults: ProcessedTestResult[] = [
      {
        file: "./examples/no_test_file.rego",
        status: "NO TESTS",
        passed: 0,
        total: 0,
        details: [],
      },
    ];
    const result = formatResults(testResults, [], false);
    expect(result).toContain(
      "| ./examples/no_test_file.rego | ⚠️ NO TESTS | 0 | 0 | <details><summary>Show Details</summary>No test file found</details> |",
    );
  });

  it("should correctly match coverage info with test file", () => {
    const testResults: ProcessedTestResult[] = [
      {
        file: "./examples/tests/ignore-changes-outside-root_test.rego",
        status: "PASS",
        passed: 12,
        total: 12,
        details: ["✅ test1", "✅ test2", "✅ test3"],
      },
    ];
    const specificCoverageResult = parsedCoverageResults.filter(
      (res) => res.file === "tests/ignore-changes-outside-root.rego",
    );
    const result = formatResults(testResults, specificCoverageResult, true);
    expect(result).toContain(
      "| ./examples/tests/ignore-changes-outside-root_test.rego | ✅ PASS | 12 | 12 | 97.44% | <details><summary>Show Details</summary>✅ test1<br>✅ test2<br>✅ test3</details> |",
    );
  });

  it("should handle cases where coverage info is not found", () => {
    const testResults: ProcessedTestResult[] = [
      {
        file: "./examples/tests/non-existent-file_test.rego",
        status: "PASS",
        passed: 1,
        total: 1,
        details: ["✅ test1"],
      },
    ];
    const result = formatResults(testResults, parsedCoverageResults, true);
    expect(result).toContain(
      "| ./examples/tests/non-existent-file_test.rego | ✅ PASS | 1 | 1 | N/A | <details><summary>Show Details</summary>✅ test1</details> |",
    );
  });
});
