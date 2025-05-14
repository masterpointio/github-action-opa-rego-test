import { processTestResults, processCoverageReport } from "./testResultProcessing";
import { runOpaTests } from "./opaCommands";
import { formatResults } from "./formatResults";

import { ProcessedTestResult, CoverageResult } from "./interfaces"

import * as core from "@actions/core";

const errorString =
  "⛔️⛔️ An unknown error has occurred in generating the results, either from tests failing or an error running OPA or an issue with GItHub actions. View the logs for more information. ⛔️⛔️";


export function parseCoverageOutput(output: string): CoverageResult[] {
  // View sample coverage output at __tests__/sample_coverage_output.txt
  // Since the output looks to be in JSON format, why isn't this processed as a JSON?
  // Even though it is JSON, the output is funky and it can't consistently be parsed with JSON.parse without errors. There is a lot of edge cases, so going through it line by line became simpler. After reading through this loop while referencing the sample output, you can easily see that it correlates straightforwardly.
  const lines = output.split("\n");
  const results: CoverageResult[] = [];
  let currentResult: CoverageResult | null = null;
  let inNotCovered = false;
  let notCoveredRanges: {
    start: number;
    end: number;
  }[] = [];

  // Iterate through all the lines of the results, and per each file, parse and set the coverage and uncovered lines associated with it
  for (let i = 0; i < lines.length; i++) {
    const cleanLine = lines[i].trim();

    // Check if we're starting a new file coverage section
    if (cleanLine.includes('.rego":')) {
      // If we're already in a coverage section already, it means we're at the end of it. Now, finalize it and add it to the results with the line ranges.
      if (currentResult) {
        currentResult.notCoveredLines = notCoveredRanges
          .map((range) =>
            range.start === range.end
              ? `${range.start}`
              : `${range.start}-${range.end}`,
          )
          .join(", ");
        results.push(currentResult);
      }
      // Initialize a new coverage section now that we starting the new .rego file
      currentResult = {
        file: cleanLine.split('"')[1],
        coverage: 0,
        notCoveredLines: "",
      };
      inNotCovered = false;
      notCoveredRanges = [];
    } else if (currentResult && cleanLine.includes('"coverage":')) {
      // Extract the coverage percentage for the current file
      const match = cleanLine.match(/"coverage": ([\d.]+)/);
      if (match) {
        currentResult.coverage = parseFloat(match[1]);
      }
    } else if (cleanLine.includes('"not_covered":')) {
      // Mark that now we're entering in the not_covered section
      inNotCovered = true;
    } else if (inNotCovered && cleanLine === "{") {
      // Now that we're in the not_covered section, process each not_covered range
      let startRow = -1;
      let endRow = -1;
      while (i < lines.length) {
        i++;
        const subLine = lines[i].trim();
        if (subLine.includes('"row":')) {
          // We've found a line specifying row number
          const rowMatch = subLine.match(/"row": (\d+)/);
          if (rowMatch) {
            const row = parseInt(rowMatch[1]);
            // If startRow is not set, this is the first row number, meaning the start
            if (startRow === -1) startRow = row;
            // If startRow is already set, this must be the end row
            else endRow = row;
          }
        } else if (subLine === "}") {
          // We've reached the end of the not_covered block
          break;
        }
      }
      // Now we have this section's uncovered lines, so add it to the list
      if (startRow !== -1 && endRow !== -1) {
        notCoveredRanges.push({
          start: startRow,
          end: endRow,
        });
      }
    } else if (cleanLine.includes("Coverage test failed for")) {
      const file = cleanLine.split("Coverage test failed for ")[1];
      results.push({
        file: file,
        coverage: 0,
        notCoveredLines: "N/A",
      });
    }
  }

  // This is to handle the ultimate last file in the output, which doesn't have a new line after it to handle it
  if (currentResult) {
    currentResult.notCoveredLines = notCoveredRanges
      .map((range) =>
        range.start === range.end
          ? `${range.start}`
          : `${range.start}-${range.end}`,
      )
      .join(", ");
    results.push(currentResult);
  }

  // Remove duplicate entries, keeping the first occurrence
  const uniqueResults = results.filter(
    (result, index, self) =>
      index === self.findIndex((t) => t.file === result.file),
  );

  return uniqueResults;
}

export async function main() {
  try {
    // const testResult = process.env.test_result;
    // const coverageResult = process.env.coverage_result;
    const reportNoTestFiles = process.env.report_untested_files === "true";
    const noTestFiles = process.env.no_test_files;
    const runCoverageReport = process.env.run_coverage_report === "true";
    const path = process.env.path;
    const test_file_postfix = process.env.test_file_postfix || "_test";

    // if (!testResult) {
    //   core.setOutput("parsed_results", errorString);
    //   core.setOutput("tests_failed", true);
    //   throw new Error("test_result environment variable is not set.");
    // }

    if (!path || !test_file_postfix) {
      throw new Error("Both 'path' and 'test_file_postfix' environment variables must be set.");
    }

    let { output: opaOutput1, error: opaError1, exitCode: exitCode1, coverageOutput: coverageOutput }  = await runOpaTests(path, test_file_postfix, true);
    let parsedResults = processTestResults(JSON.parse(opaOutput1));
    let coverageResult = coverageOutput;

    // let parsedResults = parseTestOutput(testResult);
    let coverageResults: CoverageResult[] = [];

    if (coverageResult && runCoverageReport) {
      // coverageResults = parseCoverageOutput(coverageResult);
      coverageResults = processCoverageReport(JSON.parse(coverageResult));
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
