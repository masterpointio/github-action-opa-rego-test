[![Masterpoint Logo](https://masterpoint-public.s3.us-west-2.amazonaws.com/v2/standard-long-fullcolor.png)](https://masterpoint.io)

# GitHub Action for OPA Rego Policy Tests [![Latest Release](https://img.shields.io/github/release/masterpointio/github-action-opa-rego-test.svg)](https://github.com/masterpointio/github-action-opa-rego-test/releases/latest)

GitHub Action to test your OPA (Open Policy Agent) Rego policies, generates a coverage report, and posts the results as a comment on your pull requests.

Some use cases include testing your OPA Rego files for [Spacelift policies](https://docs.spacelift.io/concepts/policy), Kubernetes Admission Controller policies, Docker authorization policies, or any other use case that uses [Open Policy Agent's policy language Rego](https://www.openpolicyagent.org/docs/latest/).


see more example PR comments below and hyperlink

generate table of contents here


<img src="./assets/banner-pr-comment-example.png" alt="OPA Rego Test GitHub Comment Example" width="600">

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



## internal to do:
- make logging better
- add debug logs
