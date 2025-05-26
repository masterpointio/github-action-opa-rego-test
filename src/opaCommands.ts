import { OpaRawJsonTestResult } from "./interfaces";
import * as exec from "@actions/exec";
import path from "path";

const opaV0CompatibleFlag = "--v0-compatible"; // https://www.openpolicyagent.org/docs/latest/v0-compatibility/

export async function executeOpaTestByDirectory(
  path: string,
  runCoverageReport: boolean = false,
): Promise<{
  output: string;
  error: string;
  exitCode: number;
  coverageOutput?: string;
  coverageExitCode?: number;
}> {
  let opaOutput = "";
  let opaError = "";
  let opaCoverageOutput = "";
  let exitCode = 0;
  let coverageExitCode;

  const options: exec.ExecOptions = {
    listeners: {
      stdout: (data: Buffer) => {
        opaOutput += data.toString();
      },
      stderr: (data: Buffer) => {
        opaError += data.toString();
      },
    },
    ignoreReturnCode: true,
  };

  exitCode = await exec.exec(
    "opa",
    ["test", path, "--format=json", opaV0CompatibleFlag],
    options,
  );

  if (runCoverageReport) {
    const coverageOptions: exec.ExecOptions = {
      listeners: {
        stdout: (data: Buffer) => {
          opaCoverageOutput += data.toString();
        },
        stderr: (data: Buffer) => {
          opaError += `\nCoverage: ${data.toString()}`;
        },
      },
      ignoreReturnCode: true,
    };

    coverageExitCode = await exec.exec(
      "opa",
      ["test", path, "--format=json", "--coverage", opaV0CompatibleFlag],
      coverageOptions,
    );
  } else {
    console.log(
      "Coverage reporting skipped due to runCoverageReport flag set to false",
    );
  }

  console.log("OPA test commands completed");

  return {
    output: opaOutput,
    error: opaError,
    exitCode: exitCode,
    ...(runCoverageReport && {
      coverageOutput: opaCoverageOutput,
      coverageExitCode: coverageExitCode,
    }),
  };
}

/**
 * Run OPA tests on all files matching the given test file postfix in the specified base path.
 * @param basePath - The base path to search for test files.
 * @param testFilePostfix - The postfix of the test files to look for (e.g., "_test").
 * @param runCoverageReport - Whether to run coverage report (default: false).
 * @returns An object containing the test results, error messages, and exit codes.
 */
export async function executeIndividualOpaTests(
  basePath: string,
  testFilePostfix: string,
  runCoverageReport = false,
): Promise<{
  output: string;
  error: string;
  exitCode: number;
  coverageOutput?: string;
  coverageExitCode?: number;
}> {
  const allTestResults: OpaRawJsonTestResult[] = [];
  let opaError = "";
  let exitCode = 0;

  const coverageFiles: Record<string, any> = {};
  let coverageExitCode = 0;

  // ---------- locate test files ----------
  let findStdout = "";
  let findStderr = "";
  await exec.exec(
    "find",
    [basePath, "-type", "f", "-name", `*${testFilePostfix}.rego`],
    {
      listeners: {
        stdout: (b: Buffer) => (findStdout += b.toString()),
        stderr: (b: Buffer) => (findStderr += b.toString()),
      },
    },
  );

  if (findStderr) {
    opaError += findStderr + "\n";
    exitCode = 1;
  }

  const testFiles = findStdout.trim().split("\n").filter(Boolean);

  for (const testFile of testFiles) {
    const base = path.basename(testFile, `${testFilePostfix}.rego`);
    const dir = path.dirname(testFile);

    // locate impl file
    let implOut = "";
    await exec.exec(
      "find",
      [
        dir,
        `${dir}/..`,
        "-maxdepth",
        "1",
        "-type",
        "f",
        "-name",
        `${base}.rego`,
      ],
      {
        listeners: { stdout: (b: Buffer) => (implOut += b.toString()) },
      },
    );
    const implFile = implOut.trim().split("\n").find(Boolean);
    if (!implFile) {
      const msg = `Error: Implementation file not found for test: ${testFile}`;
      opaError += msg + "\n";
      exitCode = 1;
      coverageExitCode = 1;
      continue;
    }

    // -------- Running OPA test --------
    let testOutput = "";
    let testErrMsg = "";
    const testExitCode = await exec.exec(
      "opa",
      ["test", testFile, implFile, "--format=json", opaV0CompatibleFlag],
      {
        listeners: {
          stdout: (b: Buffer) => (testOutput += b.toString()),
          stderr: (b: Buffer) => (testErrMsg += b.toString()),
        },
        ignoreReturnCode: true,
      },
    );

    if (testExitCode) exitCode = testExitCode;
    if (testErrMsg) opaError += testErrMsg;

    try {
      const parsed = JSON.parse(testOutput);
      if (Array.isArray(parsed)) allTestResults.push(...parsed);
    } catch (e) {
      opaError += `Error parsing test results for ${testFile}: ${e}\n`;
      exitCode = 1;
    }

    // -------- coverage (optional) --------
    if (runCoverageReport) {
      let covOut = "";
      let covErr = "";
      const covExit = await exec.exec(
        "opa",
        [
          "test",
          testFile,
          implFile,
          "--coverage",
          "--format=json",
          opaV0CompatibleFlag,
        ],
        {
          listeners: {
            stdout: (b: Buffer) => (covOut += b.toString()),
            stderr: (b: Buffer) => (covErr += b.toString()),
          },
          ignoreReturnCode: true,
        },
      );
      coverageExitCode = Math.max(coverageExitCode, covExit);
      if (covErr) opaError += `Coverage error for ${testFile}: ${covErr}`;

      try {
        const covJson = JSON.parse(covOut);
        if (covJson?.files) {
          Object.assign(coverageFiles, covJson.files);
        }
      } catch (e) {
        opaError += `Error parsing coverage for ${testFile}: ${e}\n`;
        coverageExitCode = 1;
      }
    }
  }

  return {
    output: JSON.stringify(allTestResults),
    error: opaError,
    exitCode,
    ...(runCoverageReport && {
      coverageOutput: JSON.stringify({ files: coverageFiles }),
      coverageExitCode,
    }),
  };
}
