import {
  parseTestOutput,
  parseCoverageOutput,
  formatResults,
  TestResult,
  CoverageResult,
} from "../src/index";

import * as path from "path";
import * as fs from "fs";

const testOutput = fs.readFileSync(
  path.join(__dirname, "sample_test_output.txt"),
  "utf8",
);
const coverageOutput = fs.readFileSync(
  path.join(__dirname, "sample_coverage_output.txt"),
  "utf8",
);

const failedTestOutput = fs.readFileSync(
  path.join(__dirname, "sample_test_success_fail_mixed.txt"),
  "utf8",
);

const multipleUncoveredLinesOutput = fs.readFileSync(
  path.join(__dirname, "sample_coverage_multiple_uncovered_lines.txt"),
  "utf8",
);

describe("parseTestOutput", () => {
  it("should correctly parse test output", () => {
    const result = parseTestOutput(testOutput);
    expect(result).toHaveLength(8);

    expect(result[0]).toEqual({
      file: "./examples/tests/ignore-changes-outside-root_test.rego",
      status: "PASS",
      passed: 12,
      total: 12,
      details: expect.arrayContaining([
        "✅ data.spacelift.test_affected_no_files",
        "✅ data.spacelift.test_affected_tf_files",
      ]),
    });
  });

  it("should handle empty input", () => {
    const result = parseTestOutput("");
    expect(result).toEqual([]);
  });

  it("should handle input with no test results", () => {
    const result = parseTestOutput("Some random text without any test results");
    expect(result).toEqual([]);
  });

  it("should correctly parse failed tests", () => {
    const result = parseTestOutput(failedTestOutput);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      file: "./opa-policies-with-different-postfix/approval-outside-working-hours.test.rego",
      status: "FAIL",
      passed: 6,
      total: 7,
      details: [
        "✅ data.spacelift.test_automatic_approve_weekday_morning",
        "✅ data.spacelift.test_required_approval_weekday_evening",
        "❌ data.spacelift.test_missing_approval_weekday_evening",
        "✅ data.spacelift.test_required_approval_weekend",
        "✅ data.spacelift.test_missing_approval_weekend",
        "✅ data.spacelift.test_rejection_due_to_review",
        "✅ data.spacelift.test_no_rejection_when_no_review",
      ],
    });
  });

  it("should correctly parse mixed test results from different files", () => {
    const result = parseTestOutput(failedTestOutput);
    expect(result).toHaveLength(3);

    expect(result[0]).toEqual({
      file: "./opa-policies-with-different-postfix/approval-outside-working-hours.test.rego",
      status: "FAIL",
      passed: 6,
      total: 7,
      details: [
        "✅ data.spacelift.test_automatic_approve_weekday_morning",
        "✅ data.spacelift.test_required_approval_weekday_evening",
        "❌ data.spacelift.test_missing_approval_weekday_evening",
        "✅ data.spacelift.test_required_approval_weekend",
        "✅ data.spacelift.test_missing_approval_weekend",
        "✅ data.spacelift.test_rejection_due_to_review",
        "✅ data.spacelift.test_no_rejection_when_no_review",
      ],
    });

    expect(result[1]).toEqual({
      file: "./opa-policies-with-different-postfix/notification-failure.test.rego",
      status: "PASS",
      passed: 1,
      total: 1,
      details: ["✅ data.spacelift_test.test_run_failed_with_reject"],
    });

    expect(result[2]).toEqual({
      file: "./opa-policies-with-different-postfix/enforce-password-length.test.rego",
      status: "PASS",
      passed: 1,
      total: 1,
      details: [
        "✅ data.spacelift.test_allow_creation_of_password_longer_than_20_characters",
      ],
    });
  });
});

describe("parseCoverageOutput", () => {
  it("should correctly parse coverage output", () => {
    const result = parseCoverageOutput(coverageOutput);

    // Test for ignore-changes-outside-root.rego
    expect(result[0]).toEqual({
      file: "./examples/tests/../ignore-changes-outside-root.rego",
      coverage: 92.85714285714286,
      notCoveredLines: "40",
    });

    // Test for ignore-changes-outside-root_test.rego
    // THIS IS NOT THE OUTPUT USED!
    expect(result[1]).toEqual({
      file: "./examples/tests/ignore-changes-outside-root_test.rego",
      coverage: 97.43589743589743,
      notCoveredLines: "",
    });

    // Test for track-using-labels.rego
    expect(result[2]).toEqual({
      file: "./examples/tests/../track-using-labels.rego",
      coverage: 45.45454545454545,
      notCoveredLines: "3, 5, 12-13, 23-26, 35, 37-38, 41",
    });

    // Test for track-using-labels_test.rego
    // THIS IS NOT THE OUTPUT USED!
    expect(result[3]).toEqual({
      file: "./examples/tests/track-using-labels_test.rego",
      coverage: 76.47058823529412,
      notCoveredLines: "",
    });

    // Test for enforce-password-length.rego
    expect(result[4]).toEqual({
      file: "./examples/tests/../enforce-password-length.rego",
      coverage: 90.9090909090909,
      notCoveredLines: "29",
    });

    // Test for enforce-password-length_test.rego
    // THIS IS NOT THE OUTPUT USED!
    expect(result[5]).toEqual({
      file: "./examples/tests/enforce-password-length_test.rego",
      coverage: 94.11764705882354,
      notCoveredLines: "",
    });

    // Test for notification-stack-failure-origins.rego
    expect(result[6]).toEqual({
      file: "./examples/tests/../notification-stack-failure-origins.rego",
      coverage: 96.66666666666667,
      notCoveredLines: "80",
    });

    // Test for notification-stack-failure-origins_test.rego
    // THIS IS NOT THE OUTPUT USED!
    expect(result[7]).toEqual({
      file: "./examples/tests/notification-stack-failure-origins_test.rego",
      coverage: 98.46153846153847,
      notCoveredLines: "",
    });
  });

  it("should handle empty input", () => {
    const result = parseCoverageOutput("");
    expect(result).toEqual([]);
  });

  it("should handle input with no coverage data", () => {
    const result = parseCoverageOutput('{"files":{}}');
    expect(result).toEqual([]);
  });

  it("should correctly parse multiple not covered ranges", () => {
    const result = parseCoverageOutput(multipleUncoveredLinesOutput);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      file: "./examples/test.rego",
      coverage: 80,
      notCoveredLines: "10-12, 15",
    });
  });

  it("should correctly handle files with a single uncovered line", () => {
    const result = parseCoverageOutput(coverageOutput);
    const singleUncoveredLineFile = result.find(
      (r) => r.file === "./examples/tests/../cancel-in-progress-runs.rego",
    );
    expect(singleUncoveredLineFile).toBeDefined();
    expect(singleUncoveredLineFile?.notCoveredLines).toBe("16");
  });

  it("should correctly handle files with multiple uncovered single line ranges", () => {
    const result = parseCoverageOutput(coverageOutput);
    const multipleUncoveredRangesFile = result.find(
      (r) => r.file === "./examples/tests/../readers-writers-admins-teams.rego",
    );
    expect(multipleUncoveredRangesFile).toBeDefined();
    expect(multipleUncoveredRangesFile?.notCoveredLines).toBe("16, 24, 28");
  });

  it("should handle files with 'Coverage test failed' message", () => {
    const failedCoverageOutput = `
      Coverage test failed for ./examples/failed_coverage_test.rego
      {
        "files": {}
      }
    `;
    const result = parseCoverageOutput(failedCoverageOutput);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      file: "./examples/failed_coverage_test.rego",
      coverage: 0,
      notCoveredLines: "N/A",
    });
  });
});

describe("formatResults", () => {
  const parsedTestResults = parseTestOutput(testOutput);
  const parsedCoverageResults = parseCoverageOutput(coverageOutput);

  it("should correctly format results with coverage", () => {
    const testResults: TestResult[] = [
      {
        file: "./examples/tests/ignore-changes-outside-root_test.rego",
        status: "PASS",
        passed: 12,
        total: 12,
        details: ["✅ test1", "✅ test2", "✅ test3"],
      },
    ];
    const result = formatResults(testResults, parsedCoverageResults, true);
    expect(result).toContain("# 🧪 OPA Rego Policy Test Results");
    expect(result).toContain(
      "| File | Status | Passed | Total | Coverage | Details |",
    );
    expect(result).toContain(
      "| ./examples/tests/ignore-changes-outside-root_test.rego | ✅ PASS | 12 | 12 | 92.86% <details><summary>Uncovered Lines</summary>40</details>",
    );
    expect(result).toContain(
      "<details><summary>Show Details</summary>✅ test1<br>✅ test2<br>✅ test3</details>",
    );
  });

  it("should correctly format results without coverage and failed", () => {
    const testResults: TestResult[] = [
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
      parsedTestResults,
      parsedCoverageResults,
      true,
    );

    expect(result).toContain(
      "| ./examples/tests/ignore-changes-outside-root_test.rego | ✅ PASS | 12 | 12 | 92.86% <details><summary>Uncovered Lines</summary>40</details>",
    );

    expect(result).toContain(
      "| ./examples/tests/track-using-labels_test.rego | ✅ PASS | 8 | 8 | 45.45% <details><summary>Uncovered Lines</summary>3, 5, 12-13, 23-26, 35, 37-38, 41</details>",
    );

    // Test for a file with multiple uncovered line ranges
    expect(result).toContain(
      "| ./examples/tests/readers-writers-admins-teams_test.rego | ✅ PASS | 6 | 6 | 83.33% <details><summary>Uncovered Lines</summary>16, 24, 28</details>",
    );

    // Test for a file with a single uncovered line
    expect(result).toContain(
      "| ./examples/tests/cancel-in-progress-runs_test.rego | ✅ PASS | 2 | 2 | 83.33% <details><summary>Uncovered Lines</summary>16</details>",
    );

    // Verify all files from the test output are present
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
      expect(result).toContain(fileName);
    });

    // Verify the total number of result rows matches the number of parsed test results
    const resultRows = result
      .split("\n")
      .filter((line) => line.startsWith("|") && line.includes("PASS"));
    expect(resultRows.length).toBe(parsedTestResults.length);
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
      "| ./examples/tests/ignore-changes-outside-root_test.rego | ✅ PASS | 12 | 12 |",
    );
  });

  it("should handle 'NO TESTS' status", () => {
    const testResults: TestResult[] = [
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
    const testResults: TestResult[] = [
      {
        file: "./examples/tests/ignore-changes-outside-root_test.rego",
        status: "PASS",
        passed: 12,
        total: 12,
        details: ["✅ test1", "✅ test2", "✅ test3"],
      },
    ];
    const result = formatResults(testResults, parsedCoverageResults, true);
    expect(result).toContain(
      "| ./examples/tests/ignore-changes-outside-root_test.rego | ✅ PASS | 12 | 12 | 92.86% <details><summary>Uncovered Lines</summary>40</details>",
    );
  });

  it("should handle cases where coverage info is not found", () => {
    const testResults: TestResult[] = [
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
      "| ./examples/tests/non-existent-file_test.rego | ✅ PASS | 1 | 1 | N/A ",
    );
  });
});
