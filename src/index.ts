import * as core from "@actions/core";

const errorString =
  "⛔️⛔️ An unknown error has occured in generating the results, either from tests failing or an error running OPA or an issue with GItHub actions. View the logs for more information. ⛔️⛔️";

export interface TestResult {
  file: string;
  status: "PASS" | "FAIL" | "NO TESTS";
  passed: number;
  total: number;
  details: string[];
}

export interface CoverageResult {
  file: string;
  coverage: number;
  notCoveredLines: string;
}

export function parseTestOutput(output: string): TestResult[] {
  // View sample test output at __tests__/sample_test_output.txt
  const lines = output.split("\n");
  const results: TestResult[] = [];
  let currentResult: TestResult | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // This begins a new test result
    if (line.startsWith("./") && line.endsWith(".rego:")) {
      if (currentResult) {
        results.push(currentResult);
      }
      currentResult = {
        file: line.replace(/:/g, ""), // Remove all colons from the string
        status: "PASS",
        passed: 0,
        total: 0,
        details: [],
      };
    } else if (currentResult) {
      if (line.includes(": PASS")) {
        currentResult.passed++;
        currentResult.total++;
        currentResult.details.push(`✅ ${line.split(":")[0]}`);
      } else if (line.includes(": FAIL")) {
        currentResult.total++;
        currentResult.status = "FAIL";
        currentResult.details.push(`❌ ${line.split(":")[0]}`);
      }
    }
  }

  if (currentResult) {
    results.push(currentResult);
  }

  return results;
}

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

export function formatResults(
  results: TestResult[],
  coverageResults: CoverageResult[],
  showCoverage: boolean,
): string {
  let output = `# ${process.env.pr_comment_title || "🧪 OPA Rego Policy Test Results"}\n\n`;

  if (showCoverage) {
    output += "| File | Status | Passed | Total | Coverage | Details |\n";
    output += "|------|--------|--------|-------|----------|----------|\n";
  } else {
    output += "| File | Status | Passed | Total | Details |\n";
    output += "|------|--------|--------|-------|----------|\n";
  }

  for (const result of results) {
    let statusEmoji, statusText;
    switch (result.status) {
      case "PASS":
        statusEmoji = "✅";
        statusText = `${statusEmoji} PASS`;
        break;
      case "FAIL":
        statusEmoji = "❌";
        statusText = `${statusEmoji} FAIL`;
        break;
      case "NO TESTS":
        statusEmoji = "⚠️";
        statusText = `${statusEmoji} NO TESTS`;
        break;
    }

    const testFileName = result.file;

    let coverageInfo;
    // Find the corresponding coverage test information for the test result we're on
    if (showCoverage) {
      coverageInfo = coverageResults.find((cr) => {
        const lastSlashIndex = cr.file.lastIndexOf("/");
        const dotRegoIndex = cr.file.lastIndexOf(".rego");

        // Check if the file paths are valid
        if (lastSlashIndex === -1 || dotRegoIndex === -1) return false;

        // Extract the base file name without extension from the coverage report
        const fileNameWithoutExtension = cr.file.slice(
          lastSlashIndex + 1,
          dotRegoIndex,
        );

        // Match the test file with its corresponding implementation file in the coverage results
        // Test files typically have names like 'abc_test.rego', while coverage is reported for 'abc.rego' because the test file is testing the implementation file, and the coverage is on how much the implementation file is covered.
        // We want to associate the coverage data from 'abc.rego' with the test results from 'abc_test.rego'
        return (
          testFileName.includes(fileNameWithoutExtension) &&
          !cr.file.includes(testFileName)
        );
      });
    }

    const details =
      result.status === "NO TESTS"
        ? "No test file found"
        : result.details.join("<br>");

    const detailsColumn = `<details><summary>Show Details</summary>${details}</details>`;

    let row = `| ${testFileName} | ${statusText} | ${result.passed} | ${result.total} `;

    if (showCoverage) {
      let coverageText = "N/A";
      let uncoveredLinesDetails = "";
      if (coverageInfo) {
        coverageText = `${coverageInfo.coverage.toFixed(2)}%`;
        if (
          coverageInfo.notCoveredLines &&
          coverageInfo.notCoveredLines !== "N/A"
        ) {
          uncoveredLinesDetails = `<details><summary>Uncovered Lines</summary>${coverageInfo.notCoveredLines}</details>`;
        }
      }
      row += `| ${coverageText} ${uncoveredLinesDetails} `;
    }

    row += `| ${detailsColumn} |\n`;
    output += row;
  }

  return output;
}

export async function main() {
  try {
    const testResult = process.env.test_result;
    const coverageResult = process.env.coverage_result;
    const reportNoTestFiles = process.env.report_untested_files === "true";
    const noTestFiles = process.env.no_test_files;
    const runCoverageReport = process.env.run_coverage_report === "true";

    if (!testResult) {
      core.setOutput("parsed_results", errorString);
      core.setOutput("tests_failed", true);
      throw new Error("test_result environment variable is not set.");
    }

    let parsedResults = parseTestOutput(testResult);
    let coverageResults: CoverageResult[] = [];

    if (coverageResult && runCoverageReport) {
      coverageResults = parseCoverageOutput(coverageResult);
    }

    // At the end of the table, if the reportNoTestFile flag is on, add all the files that didn't have an associated test with it.
    if (noTestFiles && reportNoTestFiles) {
      const noTestFileResults: TestResult[] = noTestFiles
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
