[![Masterpoint Logo](https://masterpoint-public.s3.us-west-2.amazonaws.com/v2/standard-long-fullcolor.png)](https://masterpoint.io)

# GitHub Action for OPA Rego Policy Tests [![Latest Release](https://img.shields.io/github/release/masterpointio/github-action-opa-rego-test.svg)](https://github.com/masterpointio/github-action-opa-rego-test/releases/latest)

GitHub Action to automate testing for your OPA (Open Policy Agent) Rego policies, generates a coverage report, and posts the results as a comment on your pull requests.

Use this to test your OPA Rego files for [Spacelift policies](https://docs.spacelift.io/concepts/policy), Kubernetes Admission Controller policies, Docker authorization policies, or any other use case that uses [Open Policy Agent's policy language Rego](https://www.openpolicyagent.org/docs/latest/).

<img src="./assets/opa-logo.png" alt="OPA Logo" width="300">

<img src="./assets/banner-pr-comment-example.png" alt="OPA Rego Test GitHub Comment Example" width="600">

See examples of the pull request comments below at the [Example Pull Request Comments section](#-example-pull-request-comments).

📚 Table of Contents
- [🚀 Usage](#-usage)
    - [Inputs](#inputs)
- [🧪 Running Tests](#-running-tests)
- [🏗️ Setup & Run Locally](#️-setup--run-locally)
- [📦 Releases / Packaging for Distribution](#-releases--packaging-for-distribution)
- [🤝 Contributing](#-contributing)
- [💬 Example Pull Request Comments](#-example-pull-request-comments)

## 🚀 Usage
It's super easy to get started and use this GitHub Action to test your OPA Rego policies. In your repository/directory with the `.rego` files and the `_test.rego` files, simply checkout the repository and add the step with `uses: masterpointio/github-action-opa-rego-test@main`. It's as simple as adding the step with no required inputs!
```yaml
      - name: Run OPA Rego Tests
        # TODO, use v1 when released
        uses: masterpointio/github-action-opa-rego-test@main
```

<details>
    <summary>Expand to see full usage example!</summary>

```yaml
name: Spacelift Policy OPA Rego Tests

on:
  pull_request:
    types:
      - opened
      - edited
      - synchronize
      - ready_for_review
      - reopened

permissions:
  id-token: write
  contents: read
  pull-requests: write # required to comment on PRs

jobs:
  run-opa-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository code
        uses: actions/checkout@v4

      - name: Run OPA Rego Tests
        # TODO, use v1 when released
        uses: masterpointio/github-action-opa-rego-test@feat/action
        with:
          test_directory_path: "./config/spacelift-policies" # Path of the directory where the OPA Rego policies are stored. Optional, defaults to `.` which is the root directory.
          report_untested_files: true # Flag to check & report Rego files without corresponding test files. Optional, defaults to false.
```

</details>



### Inputs
| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `test_directory_path` | Path to the directory containing OPA Rego files to test | No | `.` (root directory) |
| `write_pr_comment` | Flag to write a user-friendly PR comment with test results | No | `true` |
| `pr_comment_title` | Title of the PR comment for test results | No | `🧪 OPA Rego Policy Test Results` |
| `run_coverage_report` | Flag to run OPA coverage tests and include in PR comment | No | `true` |
| `report_untested_files` | Check & report Rego files without corresponding test files | No | `false` |

## ⚙️ How It Works
This GitHub Action automates the process of testing OPA (Open Policy Agent) Rego policies and generating coverage reports. Here's a breakdown of its operation:

1. Setup: The action begins by setting up OPA using the open-policy-agent/setup-opa@v2 action, ensuring the necessary tools are available.
2. Run OPA Tests: It executes `opa test` on all .rego files in the specified directory (default is the root directory). The test results are captured and stored as an output.
3. Run OPA Coverage Tests: Enabled by default but optional, the action performs coverage tests on each .rego file that has a corresponding _test.rego file. This step identifies which parts of your policies are covered by tests.
4. Find Untested Files: Optionally if enabled, it can identify Rego files that don't have corresponding test files, helping you maintain comprehensive test coverage.
5. Parse and Format Results: A custom TypeScript script (index.ts) processes the raw test and coverage outputs. It parses the results into a structured format and generates a user-friendly summary.
6. Generate PR Comment: The formatted results are used to create or update a comment on the pull request.
7. Fail the Action if Tests Fail: If any tests fail, the action is marked as failed, which can be used to block PR merges or trigger other workflows.

![Masterpoint OPA Rego Test Action Diagram](https://lucid.app/publicSegments/view/60bf898e-2640-475f-b130-2a70d317a65d/image.png)

## 🧪 Running Tests
1. `npm install`
2. `npm run test`

<img src="./assets/readme-test-results.png" alt="NPM Test Results" width="450">


## 🏗️ Setup & Run Locally
You can use [nektos/act](https://github.com/nektos/act) to simulate and run a GitHub Actions workflow locally. To directly test the custom TypeScript action locally, you can:
1. `npm run install`
2. `node ./dist/index.js`
This is assuming you have `npm` and `node` installed already. Note: You will have to manually provide the required inputs since this is directly executing the TypeScript code.

## 📦 Releases / Packaging for Distribution
We use [@vercel/ncc](https://github.com/vercel/ncc) to easily compile this TypeScript Node.js module into a single file together with all its dependencies, gcc-style, to package it up for use and distribute.

To use, simply run the command (see the source in `package.json`):
```bash
npm run build
```

To create a new release... TODO, release please with `npm run build` and commit to /dist distribution


## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request or open any Issues you may have.

## 💬 Example Pull Request Comments
- ![Masterpoint GitHub Actions OPA Rego Test PR Example](./assets/readme-example-1.png)
    - Using `report_untested_files` to indicate policies without corresponding tests.
- ![Masterpoint GitHub Actions OPA Rego Test PR Example](./assets/readme-example-2.png)
- ![Masterpoint GitHub Actions OPA Rego Test PR Example](./assets/readme-example-3.png)


### To-Do's:
- make composite action logging better
- add debug logs
- more tests
- lint and ci tests
