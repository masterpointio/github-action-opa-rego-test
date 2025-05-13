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
