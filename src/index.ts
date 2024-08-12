import * as core from '@actions/core';

export interface TestResult {
  file: string;
  status: 'PASS' | 'FAIL' | 'NO TESTS';
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
  const lines = output.split('\n');
  const results: TestResult[] = [];
  let currentResult: TestResult | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('./') && line.endsWith('.rego:')) {
      if (currentResult) {
        results.push(currentResult);
      }
      currentResult = {
        file: line.replace('_test.rego:', '.rego:'),
        status: 'PASS',
        passed: 0,
        total: 0,
        details: [],
      };
    } else if (currentResult) {
      if (line.includes(': PASS')) {
        currentResult.passed++;
        currentResult.total++;
        currentResult.details.push(`✅ ${line.split(':')[0]}`);
      } else if (line.includes(': FAIL')) {
        currentResult.total++;
        currentResult.status = 'FAIL';
        currentResult.details.push(`❌ ${line.split(':')[0]}`);
      }
    }
  }

  if (currentResult) {
    results.push(currentResult);
  }

  return results;
}

export function parseCoverageOutput(output: string): CoverageResult[] {
  const lines = output.split('\n');
  const results: CoverageResult[] = [];
  let currentResult: CoverageResult | null = null;
  let inNotCovered = false;
  let notCoveredRanges: { start: number; end: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cleanLine = lines[i].trim();

    if (cleanLine.includes('.rego":')) {
      if (currentResult) {
        currentResult.notCoveredLines = notCoveredRanges
          .map(range => range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`)
          .join(', ');
        results.push(currentResult);
      }
      currentResult = {
        file: cleanLine.split('"')[1].replace('_test.rego', '.rego'),
        coverage: 0,
        notCoveredLines: '',
      };
      inNotCovered = false;
      notCoveredRanges = [];
    } else if (currentResult && cleanLine.includes('"coverage":')) {
      const match = cleanLine.match(/"coverage": ([\d.]+)/);
      if (match) {
        currentResult.coverage = parseFloat(match[1]);
      }
    } else if (cleanLine.includes('"not_covered":')) {
      inNotCovered = true;
    } else if (inNotCovered && cleanLine === '{') {
      // Start of a new not_covered range
      let startRow = -1;
      let endRow = -1;
      while (i < lines.length) {
        i++;
        const subLine = lines[i].trim();
        if (subLine.includes('"row":')) {
          const rowMatch = subLine.match(/"row": (\d+)/);
          if (rowMatch) {
            const row = parseInt(rowMatch[1]);
            if (startRow === -1) startRow = row;
            else endRow = row;
          }
        } else if (subLine === '}') {
          break;
        }
      }
      if (startRow !== -1 && endRow !== -1) {
        notCoveredRanges.push({ start: startRow, end: endRow });
      }
    } else if (cleanLine.includes('Coverage test failed for')) {
      const file = cleanLine.split('Coverage test failed for ')[1].replace('_test.rego', '.rego');
      results.push({
        file: file,
        coverage: 0,
        notCoveredLines: 'N/A',
      });
    }
  }

  if (currentResult) {
    currentResult.notCoveredLines = notCoveredRanges
      .map(range => range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`)
      .join(', ');
    results.push(currentResult);
  }

  // Remove duplicate entries, keeping the first occurrence
  const uniqueResults = results.filter((result, index, self) =>
    index === self.findIndex((t) => t.file === result.file)
  );

  return uniqueResults;
}

export function formatResults(results: TestResult[], coverageResults: CoverageResult[], showCoverage: boolean): string {
  let output = `## ${process.env.pr_comment_title || 'OPA Test and Coverage Results'}\n\n`;

  if (showCoverage) {
    output += '| File | Status | Passed | Total | Coverage | Details |\n';
    output += '|------|--------|--------|-------|----------|----------|\n';
  } else {
    output += '| File | Status | Passed | Total | Details |\n';
    output += '|------|--------|-------|----------|\n';
  }

  for (const result of results) {
    let statusEmoji, statusText;
    switch (result.status) {
      case 'PASS':
        statusEmoji = '✅';
        statusText = `${statusEmoji} PASS`;
        break;
      case 'FAIL':
        statusEmoji = '❌';
        statusText = `${statusEmoji} FAIL`;
        break;
      case 'NO TESTS':
        statusEmoji = '⚠️';
        statusText = `${statusEmoji} NO TESTS`;
        break;
    }

    const fileName = result.file.replace(':', '');
    // const baseFileName = fileName.split('/').pop() || fileName;

    let coverageInfo;
    if (showCoverage) {
      coverageInfo = coverageResults.find(cr => cr.file.includes(fileName));
      console.log("DEBUG coverageInfo: ", coverageInfo);
      console.log("DEBUG result: ", result);
      console.log("DEBUG fileName: ", fileName);
      // console.log("DEBUG baseFileName: ", baseFileName);
      console.log("DEBUG coverageResults: ", coverageResults);
    }

    const details = result.status === 'NO TESTS'
      ? 'No test file found'
      : result.details.join('<br>');

    const detailsColumn = `<details><summary>Show Details</summary>${details}</details>`;

    let row = `| ${fileName} | ${statusText} | ${result.passed} | ${result.total} `;

    if (showCoverage) {
      let coverageText = 'N/A';
      let uncoveredLinesDetails = '';
      if (coverageInfo) {
        coverageText = `${coverageInfo.coverage.toFixed(2)}%`;
        if (coverageInfo.notCoveredLines && coverageInfo.notCoveredLines !== 'N/A') {
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
    const reportNoTestFiles = process.env.report_untested_files === 'true';
    const noTestFiles = process.env.no_test_files;
    const runCoverageReport = process.env.run_coverage_report === 'true';

    if (!testResult) {
      throw new Error('test_result environment variable is not set.');
    }

    let parsedResults = parseTestOutput(testResult);
    let coverageResults: CoverageResult[] = [];

    if (coverageResult && runCoverageReport) {
      coverageResults = parseCoverageOutput(coverageResult);
    }

    if (noTestFiles && reportNoTestFiles) {
      const noTestFileResults: TestResult[] = noTestFiles.split('\n').map(file => ({
        file: file.trim().replace('_test.rego', '.rego'),
        status: 'NO TESTS',
        passed: 0,
        total: 0,
        details: [],
      }));
      parsedResults = [...parsedResults, ...noTestFileResults];
    }

    const formattedOutput = formatResults(parsedResults, coverageResults, runCoverageReport);

    core.setOutput('parsed_results', formattedOutput);

    const testsFailed = parsedResults.some(result => result.status === 'FAIL');
    core.setOutput('tests_failed', testsFailed.toString());

    if (testsFailed) {
      core.setFailed('One or more OPA tests failed');
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed with error: ${error.message}`);
    } else {
      core.setFailed('Action failed with an unknown error');
    }
  }
}

main();
