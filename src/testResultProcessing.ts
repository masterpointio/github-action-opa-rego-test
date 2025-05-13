import * as exec from "@actions/exec";
import * as core from "@actions/core";

import { executeOpaTestByPackage, runOpaTests } from "./opaCommands";

import { TestResult } from "./interfaces";

// Interface for individual OPA test result - this is what is returned from the OPA test command with --format=json
interface OpaTestResult {
  location: {
    file: string;
    row: number;
    col: number;
  };
  package: string;
  name: string;
  fail?: boolean;
  duration: number;
}

// Process OPA test results
export function processTestResults(jsonResults: OpaTestResult[]): TestResult[] {
  // Group by file
  const fileMap = new Map<string, OpaTestResult[]>();

  // Group tests by file
  jsonResults.forEach(result => {
    const file = result.location.file;
    if (!fileMap.has(file)) {
      fileMap.set(file, []);
    }
    fileMap.get(file)!.push(result);
  });

  // Process each file's results
  const testResults: TestResult[] = [];

  fileMap.forEach((tests, file) => {
    const result: TestResult = {
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


export async function main() {
  console.log("Starting OPA test execution...");

  let { output: opaOutput, error: opaError, exitCode: exitCode } = await executeOpaTestByPackage("spacelift_policies");

  console.log(opaOutput)



  console.log("OPA test command completed successfully");

  if (exitCode !== 0) {
    // core.setFailed(`OPA test command failed with exit code ${exitCode}: ${opaError}`);
    // don't fail / return, just error out  and log the error because we still want to comment
    console.log(`OPA test command failed with exit code ${exitCode}: ${opaError}`);
    // return;
  }

  console.log("OPA test command output:");
  console.log(opaOutput);
  // console log 5 new lines
  console.log("\n\n\n\n\n");

  try {
    // Parse output directly into a JSON object
    const jsonResults: OpaTestResult[] = JSON.parse(opaOutput);

    console.log(`OPA test completed with ${jsonResults?.length || 0} results`);

    // Process the results into the required format
    const testResults = processTestResults(jsonResults);

    // Set the output for GitHub Actions
    // core.setOutput("parsed_results", JSON.stringify(testResults));

    // log testResults by itself with new lies
    console.log("\n\n\n\n\n");
    console.log("Parsed Test Results:");
    console.log(testResults);

    // Log a summary of results
    console.log("Test Results Summary:");
    testResults.forEach(result => {
      console.log(`${result.file}: ${result.passed}/${result.total} tests passed - Status: ${result.status}`);
    });

    // Check if any file has failed tests
    const anyFailures = testResults.some(result => result.status === "FAIL");
    if (anyFailures) {
      core.setFailed("Some tests have failed. Check the details for more information.");
    }
  } catch (e) {
    core.setFailed(`Failed to parse JSON output: ${e}\nRaw output: ${opaOutput}`);
  }

  for (let i = 0; i < 20; i++) {
    console.log("\n");
    console.log("*****************************************");
  }
  let { output: opaOutput1, error: opaError1, exitCode: exitCode1 }  = await runOpaTests("examples", "_test")

  const testResults1 = processTestResults(JSON.parse(opaOutput1));
  console.log("Test Results:");
  console.log(testResults1);
}

// main();




// npx ts-node ./src/toolkit.ts


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
