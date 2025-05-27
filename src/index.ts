import {
  processTestResults,
  processCoverageReport,
} from "./testResultProcessing";
import {
  executeIndividualOpaTests,
  executeOpaTestByDirectory,
} from "./opaCommands";
import { formatResults } from "./formatResults";

import { ProcessedTestResult, ProcessedCoverageResult } from "./interfaces";

import * as core from "@actions/core";

const errorString =
  "⛔️⛔️ An unknown error has occurred in generating the results, either from tests failing or an error running OPA or an issue with GItHub actions. View the logs for more information. ⛔️⛔️";

export async function main() {
  try {
    const test_mode = process.env.test_mode;
    const reportNoTestFiles = process.env.report_untested_files === "true";
    const noTestFiles = process.env.no_test_files;
    const runCoverageReport = process.env.run_coverage_report === "true";
    const path = process.env.path;
    const test_file_postfix = process.env.test_file_postfix;

    if (!path || !test_file_postfix) {
      throw new Error(
        "Both 'path' and 'test_file_postfix' environment variables must be set.",
      );
    }

    let opaOutput: string = "";
    let opaError: string = "";
    let exitCode: number = 0;
    let coverageOutput: string | undefined;

    if (test_mode === "directory") {
      ({
        output: opaOutput,
        error: opaError,
        exitCode: exitCode,
        coverageOutput: coverageOutput,
      } = await executeOpaTestByDirectory(path, true));
    } else {
      ({
        output: opaOutput,
        error: opaError,
        exitCode: exitCode,
        coverageOutput: coverageOutput,
      } = await executeIndividualOpaTests(path, test_file_postfix, true));
    }

    let parsedResults = processTestResults(JSON.parse(opaOutput));

    let coverageResults: ProcessedCoverageResult[] = [];
    if (runCoverageReport) {
      if (coverageOutput) {
        coverageResults = processCoverageReport(JSON.parse(coverageOutput));
      }
    }

    // At the end of the table, if the reportNoTestFile flag is on, add all the files that didn't have an associated test with it.
    if (noTestFiles && reportNoTestFiles) {
      const noTestFileResults: ProcessedTestResult[] = noTestFiles
        .split("\n")
        .map((file) => ({
          file: file.trim(),
          status: "NO TESTS",
          passed: 0,
          total: 0,
          details: [],
        }));
      parsedResults = [...parsedResults, ...noTestFileResults];
    }

    let formattedOutput = formatResults(
      parsedResults,
      coverageResults,
      runCoverageReport,
    );

    if (formattedOutput === "") {
      formattedOutput = errorString;
    }

    // This is the output that will be used in the GitHub Pull Request comment.
    core.setOutput("parsed_results", formattedOutput);

    const testsFailed = parsedResults.some(
      (result) => result.status === "FAIL",
    );
    core.setOutput("tests_failed", testsFailed.toString());

    if (testsFailed) {
      core.setFailed("One or more OPA tests failed");
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed with error: ${error.message}`);
    } else {
      core.setFailed("Action failed with an unknown error");
    }
  }
}

main();
