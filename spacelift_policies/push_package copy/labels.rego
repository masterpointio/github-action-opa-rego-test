package spacelift

import future.keywords.if
import future.keywords.in

ignore if "spacelift-no-trigger" in input.pull_request.labels

# The `propose` rule has been moved to `files.rego` to make it more specific.

# https://docs.spacelift.io/concepts/policy#sampling-policy-inputs
sample := true
