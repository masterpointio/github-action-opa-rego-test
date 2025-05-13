import { OpaRawJsonTestResult } from "./interfaces";
import * as exec from "@actions/exec";
import * as core from "@actions/core";

export async function executeOpaTestByPackage(
  path: string,
  runCoverageReport: boolean = false
): Promise<{
  output: string;
  error: string;
  exitCode: number;
  coverageOutput?: string;
  coverageExitCode?: number;
}> {
  let opaOutput = '';
  let opaError = '';
  let opaCoverageOutput = '';
  let exitCode = 0;
  let coverageExitCode;

  // Set up options to capture stdout and stderr
  const options: exec.ExecOptions = {
    listeners: {
      stdout: (data: Buffer) => {
        opaOutput += data.toString();
      },
      stderr: (data: Buffer) => {
        opaError += data.toString();
      }
    }
  };

  console.log("Running OPA test command...");

  // Execute the OPA test command
  try {
    exitCode = await exec.exec('opa', ['test', path, '--format=json'], options);
  } catch (error) {
    console.error(`Error executing OPA command: ${error}`);
    exitCode = 1;
  }

  // Only run coverage if the flag is set to true
  if (runCoverageReport) {
    // Set up options for coverage command
    const coverageOptions: exec.ExecOptions = {
      listeners: {
        stdout: (data: Buffer) => {
          opaCoverageOutput += data.toString();
        },
        stderr: (data: Buffer) => {
          // Add a prefix to distinguish coverage errors
          opaError += `\nCoverage: ${data.toString()}`;
        }
      },
      ignoreReturnCode: true
    };

    console.log("Running OPA test with coverage...");
    coverageExitCode = await exec.exec('opa', ['test', path, '--format=json', '--coverage'], coverageOptions);
    console.log(`Coverage Exit code: ${coverageExitCode}`);
  } else {
    console.log("Coverage reporting skipped due to runCoverageReport flag set to false");
  }

  console.log("OPA test commands completed");

  return {
    output: opaOutput,
    error: opaError,
    exitCode: exitCode,
    ...(runCoverageReport && {
      coverageOutput: opaCoverageOutput,
      coverageExitCode: coverageExitCode
    })
  };
}





import * as fs from "fs";
import * as path from "path";

export async function runOpaTests(
  basePath: string,
  testFilePostfix: string
): Promise<{
  output: string;
  error: string;
  exitCode: number;
}> {
  // Array to hold all test results
  const allTestResults: OpaRawJsonTestResult[] = [];
  let opaError = '';
  let exitCode = 0;

  console.log(`Searching for test files in ${basePath} with postfix ${testFilePostfix}.rego`);

  // Find all test files
  let findOutput = '';
  let findError = '';

  const findOptions: exec.ExecOptions = {
    listeners: {
      stdout: (data: Buffer) => {
        findOutput += data.toString();
      },
      stderr: (data: Buffer) => {
        findError += data.toString();
      }
    }
  };

  try {
    await exec.exec('find', [basePath, '-type', 'f', '-name', `*${testFilePostfix}.rego`], findOptions);
  } catch (error) {
    console.error(`Error executing find command: ${error}`);
    return { output: '[]', error: `Error executing find command: ${error}`, exitCode: 1 };
  }

  // Split the output into an array of test files
  const testFiles = findOutput.trim().split('\n').filter(line => line.trim() !== '');
  console.log(`Found ${testFiles.length} test files`);

  // Process each test file
  for (const testFile of testFiles) {
    console.log(`Running test: ${testFile}`);

    // Get base name and directory
    const basename = path.basename(testFile, `${testFilePostfix}.rego`);
    const testDir = path.dirname(testFile);

    // Find implementation file
    let implFindOutput = '';
    const implFindOptions: exec.ExecOptions = {
      listeners: {
        stdout: (data: Buffer) => {
          implFindOutput += data.toString();
        }
      }
    };

    try {
      await exec.exec('find', [testDir, `${testDir}/..`, '-maxdepth', '1', '-type', 'f', '-name', `${basename}.rego`], implFindOptions);
    } catch (error) {
      console.error(`Error finding implementation file for ${testFile}: ${error}`);
      opaError += `Error finding implementation file for ${testFile}: ${error}\n`;
      exitCode = 1;
      continue;
    }

    // Get the first implementation file if found
    const implFiles = implFindOutput.trim().split('\n').filter(line => line.trim() !== '');
    const implFile = implFiles.length > 0 ? implFiles[0] : '';

    if (implFile) {
      console.log(`Found implementation file: ${implFile}`);

      // Run test with JSON format
      let testResult = '';
      let testError = '';
      const testOptions: exec.ExecOptions = {
        listeners: {
          stdout: (data: Buffer) => {
            testResult += data.toString();
          },
          stderr: (data: Buffer) => {
            testError += data.toString();
          }
        },
        ignoreReturnCode: true
      };

      let testExitCode = 0;
      try {
        testExitCode = await exec.exec('opa', ['test', testFile, implFile, '--format=json'], testOptions);
        if (testExitCode !== 0) {
          exitCode = testExitCode;
        }

        // Parse the JSON result and add to our array
        try {
          const testResultJson = JSON.parse(testResult);
          if (Array.isArray(testResultJson)) {
            // Add each test result to our array
            allTestResults.push(...testResultJson);
          } else {
            console.error(`Unexpected test result format for ${testFile}: not an array`);
            opaError += `Unexpected test result format for ${testFile}: not an array\n`;
          }
        } catch (parseError) {
          console.error(`Error parsing test results for ${testFile}: ${parseError}`);
          opaError += `Error parsing test results for ${testFile}: ${parseError}\n`;
          exitCode = 1;
        }
      } catch (error) {
        console.error(`Error running test for ${testFile}: ${error}`);
        testError += `Error running test for ${testFile}: ${error}\n`;
        exitCode = 1;
      }

      if (testError) {
        opaError += testError;
      }
    } else {
      const errorMessage = `Error: Implementation file not found for test: ${testFile}\n`;
      console.error(errorMessage.trim());
      opaError += errorMessage;
      exitCode = 1;
    }
  }

  console.log("All tests completed");

  // Convert the combined results array to a JSON string
  const combinedOutput = JSON.stringify(allTestResults);

  console.log(allTestResults)

  // Return the results
  return {
    output: combinedOutput,
    error: opaError,
    exitCode: exitCode
  };
}
