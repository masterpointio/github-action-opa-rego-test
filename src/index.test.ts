import { parseTestOutput, parseCoverageOutput, formatResults, TestResult, CoverageResult } from './index';

describe('parseTestOutput', () => {
  it('should correctly parse test output', () => {
    const testOutput = `
./policy/enforce-password-length.rego:
data.policy.enforce_password_length.test_valid_password: PASS (328.208µs)
data.policy.enforce_password_length.test_invalid_password: PASS (163.75µs)
./policy/enforce-password-complexity.rego:
data.policy.enforce_password_complexity.test_valid_password: PASS (379.25µs)
data.policy.enforce_password_complexity.test_invalid_password: FAIL (163.75µs)
    `;

    const result = parseTestOutput(testOutput);

    expect(result).toEqual([
      {
        file: './policy/enforce-password-length.rego:',
        status: 'PASS',
        passed: 2,
        total: 2,
        details: [
          '✅ data.policy.enforce_password_length.test_valid_password',
          '✅ data.policy.enforce_password_length.test_invalid_password'
        ]
      },
      {
        file: './policy/enforce-password-complexity.rego:',
        status: 'FAIL',
        passed: 1,
        total: 2,
        details: [
          '✅ data.policy.enforce_password_complexity.test_valid_password',
          '❌ data.policy.enforce_password_complexity.test_invalid_password'
        ]
      }
    ] as TestResult[]);
  });
});

describe('parseCoverageOutput', () => {
  it('should correctly parse coverage output', () => {
    const coverageOutput = `
{
"files": {
"enforce-password-length.rego": {
"coverage": 85.71428571428571,
"not_covered": [
{
"start": {
"row": 25
},
"end": {
"row": 25
}
},
{
"start": {
"row": 31
},
"end": {
"row": 31
}
}
]
}
}
}
    `;

    const result = parseCoverageOutput(coverageOutput);

    expect(result).toEqual([
      {
        file: 'enforce-password-length.rego',
        coverage: 85.71428571428571,
        notCoveredLines: '25, 31'
      }
    ] as CoverageResult[]);
  });
});

describe('formatResults', () => {
  it('should format results correctly with coverage', () => {
    const testResults: TestResult[] = [
      {
        file: './policy/enforce-password-length.rego:',
        status: 'PASS',
        passed: 2,
        total: 2,
        details: ['✅ test1', '✅ test2']
      }
    ];

    const coverageResults: CoverageResult[] = [
      {
        file: 'enforce-password-length.rego',
        coverage: 85.71,
        notCoveredLines: '25, 31'
      }
    ];

    const formattedOutput = formatResults(testResults, coverageResults, true);

    expect(formattedOutput).toContain('| ./policy/enforce-password-length.rego | ✅ PASS | 2 | 2 | 85.71% <details><summary>Uncovered Lines</summary>25, 31</details> |');
  });

  it('should format results correctly without coverage', () => {
    const testResults: TestResult[] = [
      {
        file: './policy/enforce-password-length.rego:',
        status: 'PASS',
        passed: 2,
        total: 2,
        details: ['✅ test1', '✅ test2']
      }
    ];

    const formattedOutput = formatResults(testResults, [], false);

    expect(formattedOutput).toContain('| ./policy/enforce-password-length.rego | ✅ PASS | 2 | 2 |');
  });
});
