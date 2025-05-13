export interface TestResult {
  file: string;
  status: "PASS" | "FAIL" | "NO TESTS";
  passed: number;
  total: number;
  details: string[]; // Array of either "✅ test_name" or "❌ test_name"
}

export interface CoverageResult {
  file: string;
  coverage: number;
  notCoveredLines: string;
}
