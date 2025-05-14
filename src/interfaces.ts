export interface ProcessedTestResult {
  file: string;
  status: "PASS" | "FAIL" | "NO TESTS";
  passed: number;
  total: number;
  details: string[]; // Array of either "✅ test_name" or "❌ test_name" for the test within the file
}

export interface ProcessedCoverageResult {
  file: string;
  coverage: number;
  notCoveredLines: string;
}

// This is what is returned from the OPA test command with `--format=json` and `--coverage`
export interface OpaRawJsonCoverageReport {
  files: {
    [filePath: string]: {
      // Array of covered code sections
      covered?: Array<{
        start: {
          row: number;
        };
        end: {
          row: number;
        };
      }>;

      // Array of code sections that are not covered by tests
      not_covered?: Array<{
        start: {
          row: number;
        };
        end: {
          row: number;
        };
      }>;

      covered_lines?: number;

      // Total number of lines not covered by tests (only present if there are uncovered lines)
      not_covered_lines?: number;

      // Coverage percentage (0-100)
      coverage: number;
    };
  };
}

// Interface for individual OPA test result - this is what is returned from the OPA test command with --format=json
export interface OpaRawJsonTestResult {
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
