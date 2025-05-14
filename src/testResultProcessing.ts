import * as exec from "@actions/exec";
import * as core from "@actions/core";

import { executeOpaTestByPackage, runOpaTests } from "./opaCommands";

import { ProcessedTestResult, OpaRawJsonTestResult, OpaRawJsonCoverageReport, CoverageResult } from "./interfaces";


import { formatResults } from "./formatResults";

// Process OPA test results
export function processTestResults(jsonResults: OpaRawJsonTestResult[]): ProcessedTestResult[] {
  // Group by file
  const fileMap = new Map<string, OpaRawJsonTestResult[]>();

  // Group tests by file
  jsonResults.forEach(result => {
    const file = result.location.file;
    if (!fileMap.has(file)) {
      fileMap.set(file, []);
    }
    fileMap.get(file)!.push(result);
  });

  // Process each file's results
  const testResults: ProcessedTestResult[] = [];

  fileMap.forEach((tests, file) => {
    const result: ProcessedTestResult = {
      file,
      status: "PASS",
      passed: 0,
      total: tests.length,
      details: []
    };

    // Count passed tests and collect details
    tests.forEach(test => {
      const passed = !test.fail;

      if (passed) {
        result.passed++;
        result.details.push(`✅ ${test.name}`);
      } else {
        // If any test fails, the file status is FAIL
        result.status = "FAIL";
        result.details.push(`❌ ${test.name}`);
      }
    });

    testResults.push(result);
  });

  return testResults;
}


/**
 * Processes OPA coverage report into a more readable format
 * @param report The raw OPA coverage report
 * @returns Array of CoverageResult objects
 */
export function processCoverageReport(report: OpaRawJsonCoverageReport): CoverageResult[] {
  const results: CoverageResult[] = [];

  // Iterate through each file in the report
  for (const [filePath, fileData] of Object.entries(report.files)) {
    // Skip if there are no uncovered lines (100% coverage)
    if (!fileData.not_covered || fileData.not_covered.length === 0) {
      results.push({
        file: filePath,
        coverage: fileData.coverage,
        notCoveredLines: "" // No uncovered lines
      });
      continue;
    }

    // Process not_covered sections to create the formatted string
    const notCoveredRanges: string[] = [];

    for (const section of fileData.not_covered) {
      const startRow = section.start.row;
      const endRow = section.end.row;

      if (startRow === endRow) {
        // Single line
        notCoveredRanges.push(startRow.toString());
      } else {
        // Range of lines
        notCoveredRanges.push(`${startRow}-${endRow}`);
      }
    }

    // Sort numerically
    notCoveredRanges.sort((a, b) => {
      // Extract the first number from each range for comparison
      const aStart = parseInt(a.split('-')[0]);
      const bStart = parseInt(b.split('-')[0]);
      return aStart - bStart;
    });

    results.push({
      file: filePath,
      coverage: fileData.coverage,
      notCoveredLines: notCoveredRanges.join(', ')
    });
  }

  return results;
}


export async function main() {
  console.log("Starting OPA test execution...");

  let { output: opaOutput, error: opaError, exitCode: exitCode, coverageOutput: coverageOutput } = await executeOpaTestByPackage("spacelift_policies/push_package copy", true);

  let processedTestResults: ProcessedTestResult[] | undefined;
  if (opaOutput) {
    try {
      const parsedOpaOutput = JSON.parse(opaOutput) as OpaRawJsonTestResult[];
      processedTestResults = processTestResults(parsedOpaOutput);
    }
    catch (error) {
      console.error("Failed to parse OPA output:", error);
    }
  } else {
    console.error("OPA output is undefined.");
  }


  for (let i = 0; i < 5; i++) {
    console.log("*****************************************");
  }

  console.log(coverageOutput)

  for (let i = 0; i < 5; i++) {
    console.log("*****************************************");
  }

  let coverageReport: CoverageResult[] | undefined;

  if (coverageOutput) {
    try {
        const parsedCoverageOutput = JSON.parse(coverageOutput) as OpaRawJsonCoverageReport;
        coverageReport = processCoverageReport(parsedCoverageOutput);
    } catch (error) {
        console.error("Failed to parse coverage output:", error);
    }
  } else {
    console.error("Coverage output is undefined.");
  }

  console.log("processed coverage report");
  console.log(coverageReport);

  for (let i = 0; i < 5; i++) {
    console.log("*****************************************");
  }

  console.log("error");
  console.log(opaError);

  let finalComment = formatResults(processedTestResults || [], coverageReport || [], true);
  console.log("Final comment:");
  console.log(finalComment);


}

main();




// npx ts-node ./src/testResultProcessing.ts


// opa test --format=json .

//         run: opa test ./**/*.rego --v0-compatible --var-values --verbose
// opa test -v cancel_test.rego cancel.rego



// opa test cancel_test.rego cancel.rego
// failing because rego_unsafe_var_error: var main_stack is unsafe
// this is defined elsewhere in the package, not in that line, so you cannot test line by line

// opa test .
// will work by testing the package as a whole
// as long as the tests are postfixed with test_ and the individual test cases are prefixed with test_


// find . -type f -name "*.rego" ! -name "*_test.rego" -exec dirname {} \; | sort -u
//  to find all the directories with rego files but EXCLUDES the directories that only have test files because can't test test files

// find . -type f -name "*.rego" -exec dirname {} \; | sort -u
// that only finds directories with rego files


// so what i'm thinking is this:
// 1. file by file testing, test those files that don't have shared imports, abc_test against abc
// 2. package by package testing, test those files that do have shared imports, run against the entire directory
//       i don't worry about the how they structure it, i just run the test file against the entire directory
//       user provides it
