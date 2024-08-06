import * as core from '@actions/core';
import { parseTestOutput, formatResults, main } from './index';

// Mock the @actions/core module
jest.mock('@actions/core');

describe('OPA Rego Test Parser', () => {
  const sampleInput = `FAILURES
--------------------------------------------------------------------------------
data.spacelift_test.test_run_failed_with_deny: FAIL (310.458µs)
  query:1                                   Enter data.spacelift_test.test_run_failed_with_deny = _
  ./notification-failure_test.rego:9        | Enter data.spacelift_test.test_run_failed_with_deny
  ./notification-failure.rego:25            | | Enter data.spacelift.slack
  ./notification-failure.rego:30            | | | Fail not data.spacelift.any_deny_or_reject
  ./notification-failure_test.rego:20       | | Fail **local33** = 21
  query:1                                   | Fail data.spacelift_test.test_run_failed_with_deny = _
SUMMARY
--------------------------------------------------------------------------------
./enforce-password-length_test.rego:
data.spacelift.test_deny_creation_of_password_with_less_than_16_characters: PASS (2.61925ms)
data.spacelift.test_warn_creation_of_password_between_16_and_20_characters: PASS (148.958µs)
data.spacelift.test_allow_creation_of_password_longer_than_20_characters: PASS (134.625µs)
./nested-folder/do-not-delete-stateful-resources_test.rego:
data.spacelift.test_deny_s3_bucket_deletion: PASS (449.792µs)
data.spacelift.test_deny_db_instance_deletion: PASS (184.417µs)
data.spacelift.test_deny_efs_file_system_deletion: PASS (218.125µs)
data.spacelift.test_deny_dynamodb_table_deletion: PASS (164.708µs)
data.spacelift.test_allow_instance_deletion: PASS (134.542µs)
./notification-failure_test.rego:
data.spacelift_test.test_run_failed_with_deny: FAIL (310.458µs)
data.spacelift_test.test_run_failed_with_reject: PASS (243.208µs)
data.spacelift_test.test_run_failed_with_neither: PASS (448.334µs)
data.spacelift_test.test_run_not_failed: PASS (214.166µs)
--------------------------------------------------------------------------------
PASS: 11/12
FAIL: 1/12`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('parseTestOutput correctly parses the sample input', () => {
    const results = parseTestOutput(sampleInput);
    expect(results).toHaveLength(3);
    expect(results[0].file).toBe('./enforce-password-length_test.rego:');
    expect(results[0].status).toBe('PASS');
    expect(results[0].passed).toBe(3);
    expect(results[0].total).toBe(3);
    expect(results[1].file).toBe('./nested-folder/do-not-delete-stateful-resources_test.rego:');
    expect(results[1].status).toBe('PASS');
    expect(results[1].passed).toBe(5);
    expect(results[1].total).toBe(5);
    expect(results[2].file).toBe('./notification-failure_test.rego:');
    expect(results[2].status).toBe('FAIL');
    expect(results[2].passed).toBe(3);
    expect(results[2].total).toBe(4);
  });

  test('formatResults contains key information from parsed results', () => {
    const parsedResults = parseTestOutput(sampleInput);
    const formattedOutput = formatResults(parsedResults);

    // Check for table headers
    expect(formattedOutput).toContain('File');
    expect(formattedOutput).toContain('Status');
    expect(formattedOutput).toContain('Passed');
    expect(formattedOutput).toContain('Total');
    expect(formattedOutput).toContain('Details');

    // Check for file names and their results
    expect(formattedOutput).toContain('enforce-password-length_test.rego');
    expect(formattedOutput).toContain('PASS');
    expect(formattedOutput).toContain('3');

    expect(formattedOutput).toContain('nested-folder/do-not-delete-stateful-resources_test.rego');
    expect(formattedOutput).toContain('PASS');
    expect(formattedOutput).toContain('5');

    expect(formattedOutput).toContain('notification-failure_test.rego');
    expect(formattedOutput).toContain('FAIL');
    expect(formattedOutput).toContain('3');
    expect(formattedOutput).toContain('4');
  });

  test('main function sets the correct outputs', async () => {
    const setOutputMock = jest.spyOn(core, 'setOutput');
    const getInputMock = jest.spyOn(core, 'getInput');
    getInputMock.mockReturnValue(sampleInput);

    await main();

    expect(setOutputMock).toHaveBeenCalledWith('parsed_results', expect.any(String));
    expect(setOutputMock).toHaveBeenCalledWith('tests_failed', 'true');
  });
});
