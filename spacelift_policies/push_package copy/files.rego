package spacelift

import future.keywords.if
import future.keywords.in

# Run if:
#
# 1. The event affects certain file types in the stack being evaluated
# 2. The event affects certain file types outside the `app/stacks` directory

is_pr if {
	input.pull_request != null
	not input.pull_request.closed
	pull_request_actions := {"opened", "reopened", "synchronize", "labeled", "unlabeled"}
	some input.pull_request.action in pull_request_actions
}

is_push if input.push.branch == input.stack.branch

affected_files := input.pull_request.diff if is_pr

else := input.push.affected_files

is_file_to_run(file) if {
	prefixes := {
		"app/",
		"config/",
		"Terrafile",
	}
	startswith(file, prefixes[_])
	suffixes := {
		".erb",
		".hcl",
		".json",
		".rb",
		".rego",
		".tf",
		".tftpl",
		".tfvars",
		".tofu",
		".yaml",
		".yml",
		"Terrafile",
	}
	endswith(file, suffixes[_])
}

affects_files_to_run if {
	some affected_file in affected_files
	is_file_to_run(affected_file)
}

affects_files_in_this_stack if {
	some affected_file in affected_files
	startswith(affected_file, sprintf("app/stacks/%s", [input.stack.id]))
	is_file_to_run(affected_file)
}

affects_files_outside_stacks_directory if {
	some affected_file in affected_files
	not startswith(affected_file, "app/stacks")
	is_file_to_run(affected_file)
}

ignore if not affects_files_to_run

# Proposed runs (plans) have been disabled by default because worker pool queues got too long.
# The "Terraspace planner" GitHub Actions runner will run and comment on PRs by default.
# To opt in to Spacelift proposed runs on PRs, add the `spacelift-trigger` label.
propose if {
	"spacelift-trigger" in input.pull_request.labels
	affects_files_in_this_stack
	is_pr
} else if {
	"spacelift-trigger" in input.pull_request.labels
	affects_files_outside_stacks_directory
	is_pr
}

track if {
	affects_files_in_this_stack
	is_push
} else if {
	affects_files_outside_stacks_directory
	is_push
}

# https://docs.spacelift.io/concepts/policy#sampling-policy-inputs
sample := true
