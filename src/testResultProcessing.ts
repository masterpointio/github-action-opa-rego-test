import {
  ProcessedTestResult,
  OpaRawJsonTestResult,
  OpaRawJsonCoverageReport,
  ProcessedCoverageResult,
} from "./interfaces";

/**
 * Processes the raw JSON test results from OPA and formats them into a structure ready to be formatted into a GitHub Pull Request comment.
 * @param opaRawJsonTestResult - The raw JSON test results from OPA, obtained from `opa test --format=json`. This is done in the `opaCommands.ts` file.
 * @returns An array of processed test results. See the interface for structure.
 */
export function processTestResults(
  opaRawJsonTestResult: OpaRawJsonTestResult[],
): ProcessedTestResult[] {
  // Group by file
  const fileMap = new Map<string, OpaRawJsonTestResult[]>();

  // Group tests by file
  opaRawJsonTestResult.forEach((result) => {
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
      details: [],
    };

    // Count passed tests and collect details
    tests.forEach((test) => {
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
 * Processes the raw JSON coverage report from OPA and formats it into a structure ready to be formatted into a GitHub Pull Request comment.
 * @param opaRawJsonCoverageReport - The raw JSON coverage report from OPA, obtained from `opa test --format=json --coverage`. This is done in the `opaCommands.ts` file.
 * @returns An array of processed coverage results. See the interface for structure.
 */
export function processCoverageReport(
  opaRawJsonCoverageReport: OpaRawJsonCoverageReport,
): ProcessedCoverageResult[] {
  const coverageResults: ProcessedCoverageResult[] = [];

  // Iterate through each file in the report
  for (const [filePath, fileData] of Object.entries(
    opaRawJsonCoverageReport.files,
  )) {
    // Skip if there are no uncovered lines (100% coverage)
    if (!fileData.not_covered || fileData.not_covered.length === 0) {
      coverageResults.push({
        file: filePath,
        coverage: fileData.coverage,
        notCoveredLines: "", // No uncovered lines
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
        // Range of lines, e.g. "10-12"
        notCoveredRanges.push(`${startRow}-${endRow}`);
      }
    }

    // Sort numerically
    notCoveredRanges.sort((a, b) => {
      // Extract the first number from each range for comparison
      const aStart = parseInt(a.split("-")[0]);
      const bStart = parseInt(b.split("-")[0]);
      return aStart - bStart;
    });

    coverageResults.push({
      file: filePath,
      coverage: fileData.coverage,
      notCoveredLines: notCoveredRanges.join(", "),
    });
  }

  return coverageResults;
}
