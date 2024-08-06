import * as core from '@actions/core';

interface TestResult {
  file: string;
  status: 'PASS' | 'FAIL' | 'NO TESTS';
  passed: number;
  total: number;
  details: string[];
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
        file: line,
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

export function formatResults(results: TestResult[]): string {
  let output = '## OPA Test Results\n\n';
  output += '| File | Status | Passed | Total | Details |\n';
  output += '|------|--------|--------|-------|----------|\n';

  for (const result of results) {
    let statusEmoji, statusText;
    switch (result.status) {
      case 'PASS':
        statusEmoji = '✅';
        statusText = `${statusEmoji} PASS ${statusEmoji}`;
        break;
      case 'FAIL':
        statusEmoji = '❌';
        statusText = `${statusEmoji} FAIL ${statusEmoji}`;
        break;
      case 'NO TESTS':
        statusEmoji = '⚠️';
        statusText = `${statusEmoji} NO TESTS ${statusEmoji}`;
        break;
    }

    const details = result.status === 'NO TESTS' ? 'No test file found' : result.details.join('<br>');
    const row = `| ${result.file} | ${statusText} | ${result.passed} | ${result.total} | <details><summary>Show Details</summary>${details}</details> |\n`;
    output += row;
  }

  return output;
}

export async function main() {
  try {
    const testResult = core.getInput('test_result', { required: true });
    const noTestFiles = core.getInput('no_test_files');

    let parsedResults = parseTestOutput(testResult);

    if (noTestFiles) {
      const noTestFileResults: TestResult[] = noTestFiles.split('\n').map(file => ({
        file: file.trim(),
        status: 'NO TESTS',
        passed: 0,
        total: 0,
        details: [],
      }));
      parsedResults = [...parsedResults, ...noTestFileResults];
    }

    const formattedOutput = formatResults(parsedResults);

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
