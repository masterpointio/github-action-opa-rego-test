import {
  ProcessedTestResult,
  ProcessedCoverageResult,
} from "../src/interfaces";

export const mockProcessedTestResults: ProcessedTestResult[] = [
  {
    file: "tests/ignore-changes-outside-root_test.rego",
    status: "PASS",
    passed: 12,
    total: 12,
    details: [
      "✅ test1",
      "✅ test2",
      "✅ test3",
      "✅ test4",
      "✅ test5",
      "✅ test6",
      "✅ test7",
      "✅ test8",
      "✅ test9",
      "✅ test10",
      "✅ test11",
      "✅ test12",
    ],
  },
  {
    file: "tests/track-using-labels_test.rego",
    status: "PASS",
    passed: 8,
    total: 8,
    details: [
      "✅ test_label_match",
      "✅ test_label_no_match",
      "✅ test_no_labels_on_resource",
      "✅ test_no_labels_on_constraint",
      "✅ test_empty_labels_on_resource",
      "✅ test_empty_labels_on_constraint",
      "✅ test_multiple_labels_match",
      "✅ test_multiple_labels_no_match",
    ],
  },
  {
    file: "tests/enforce-password-length_test.rego",
    status: "PASS",
    passed: 3,
    total: 3,
    details: [
      "✅ test_password_too_short",
      "✅ test_password_just_right",
      "✅ test_password_too_long",
    ],
  },
  {
    file: "tests/notification-stack-failure-origins_test.rego",
    status: "PASS",
    passed: 5,
    total: 5,
    details: [
      "✅ test_stack_failure_origin_ami",
      "✅ test_stack_failure_origin_instance",
      "✅ test_stack_failure_origin_security_group",
      "✅ test_stack_failure_origin_vpc",
      "✅ test_stack_failure_origin_unknown",
    ],
  },
  {
    file: "tests/enforce-module-use-policy_test.rego",
    status: "PASS",
    passed: 4,
    total: 4,
    details: [
      "✅ test_valid_module_use",
      "✅ test_invalid_module_use",
      "✅ test_no_module_imports",
      "✅ test_mixed_module_use",
    ],
  },
  {
    file: "tests/readers-writers-admins-teams_test.rego",
    status: "PASS",
    passed: 6,
    total: 6,
    details: [
      "✅ test_reader_access",
      "✅ test_writer_access",
      "✅ test_admin_access",
      "✅ test_no_access",
      "✅ test_multiple_roles",
      "✅ test_nested_teams",
    ],
  },
  {
    file: "tests/cancel-in-progress-runs_test.rego",
    status: "PASS",
    passed: 2,
    total: 2,
    details: ["✅ test_cancel_successful", "✅ test_cancel_failure"],
  },
  {
    file: "tests/do-not-delete-stateful-resources_test.rego",
    status: "PASS",
    passed: 1,
    total: 1,
    details: ["✅ test_delete_stateful_resource"],
  },
  {
    file: "./examples/no_test_file.rego",
    status: "NO TESTS",
    passed: 0,
    total: 0,
    details: ["No test file found"],
  },
  {
    file: "./examples/tests/non-existent-file_test.rego",
    status: "PASS",
    passed: 1,
    total: 1,
    details: ["✅ test1"],
  },
];

export const mockProcessedCoverageResults: ProcessedCoverageResult[] = [
  {
    file: "tests/ignore-changes-outside-root.rego",
    coverage: 97.44,
    notCoveredLines: "",
  },
  {
    file: "tests/track-using-labels.rego",
    coverage: 76.47,
    notCoveredLines: "",
  },
  {
    file: "tests/enforce-password-length.rego",
    coverage: 100.0,
    notCoveredLines: "",
  },
  {
    file: "tests/notification-stack-failure-origins.rego",
    coverage: 90.0,
    notCoveredLines: "10, 15",
  },
  {
    file: "tests/enforce-module-use-policy.rego",
    coverage: 85.0,
    notCoveredLines: "5",
  },
  {
    file: "tests/readers-writers-admins-teams.rego",
    coverage: 83.33,
    notCoveredLines: "16, 24, 28",
  },
  {
    file: "tests/cancel-in-progress-runs.rego",
    coverage: 83.33,
    notCoveredLines: "16",
  },
  {
    file: "tests/do-not-delete-stateful-resources.rego",
    coverage: 100.0,
    notCoveredLines: "",
  },
];
