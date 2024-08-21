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
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      file: "./examples/tests/failed_test.rego",
      status: "FAIL",
      passed: 2,
      total: 3,
      details: expect.arrayContaining([
        "✅ data.spacelift.test_1",
        "❌ data.spacelift.test_2",
        "✅ data.spacelift.test_3",
      ]),
    });
  });
});

describe("parseCoverageOutput", () => {
  it("should correctly parse coverage output", () => {
    const result = parseCoverageOutput(coverageOutput);
    expect(result).toHaveLength(16);
    expect(result[0]).toEqual({
      file: "./examples/tests/../ignore-changes-outside-root.rego",
      coverage: 92.85714285714286,
      notCoveredLines: "40",
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
});

describe("formatResults", () => {
  it("should correctly format results with coverage", () => {
    const testResults: TestResult[] = [
      {
        file: "./examples/impl_file_test.rego",
        status: "PASS",
        passed: 5,
        total: 5,
        details: ["✅ test1", "✅ test2", "✅ test3", "✅ test4", "✅ test5"],
      },
    ];
    const coverageResults: CoverageResult[] = [
      {
        file: "./examples/impl_file.rego",
        coverage: 90,
        notCoveredLines: "10-12",
      },
    ];
    const result = formatResults(testResults, coverageResults, true);
    expect(result).toContain("# 🧪 OPA Rego Policy Test Results");
    expect(result).toContain(
      "| File | Status | Passed | Total | Coverage | Details |",
    );
    expect(result).toContain(
      "| ./examples/impl_file_test.rego | ✅ PASS | 5 | 5 | 90.00% <details><summary>Uncovered Lines</summary>10-12</details>",
    );
    expect(result).toContain(
      "<details><summary>Show Details</summary>✅ test1<br>✅ test2<br>✅ test3<br>✅ test4<br>✅ test5</details>",
    );
  });

  it("should correctly format results without coverage", () => {
    const testResults: TestResult[] = [
      {
        file: "test_file.rego",
        status: "FAIL",
        passed: 4,
        total: 5,
        details: ["✅ test1", "✅ test2", "✅ test3", "✅ test4", "❌ test5"],
      },
    ];
    const result = formatResults(testResults, [], false);
    expect(result).toContain("# 🧪 OPA Rego Policy Test Results");
    expect(result).toContain("| File | Status | Passed | Total | Details |");
    expect(result).toContain(
      "| test_file.rego | ❌ FAIL | 4 | 5 | <details><summary>Show Details</summary>✅ test1<br>✅ test2<br>✅ test3<br>✅ test4<br>❌ test5</details> |",
    );
  });

  it("should handle 'NO TESTS' status", () => {
    const testResults: TestResult[] = [
      {
        file: "no_test_file.rego",
        status: "NO TESTS",
        passed: 0,
        total: 0,
        details: [],
      },
    ];
    const result = formatResults(testResults, [], false);
    expect(result).toContain(
      "| no_test_file.rego | ⚠️ NO TESTS | 0 | 0 | <details><summary>Show Details</summary>No test file found</details> |",
    );
  });
});
