package spacelift_policies.push_test

import data.spacelift
import future.keywords.if
import future.keywords.in

# https://docs.spacelift.io/concepts/policy/push-policy
# https://docs.spacelift.io/concepts/policy#testing-policies
# https://www.openpolicyagent.org/docs/latest/policy-testing/

files_to_ignore := [
	".github/workflows/ci.yml",
	"app/stacks/main-stack/README.md",
	"Dockerfile",
]

files_to_run := [
	"app/modules/spacelift-worker-pool-ec2/main.tf",
	"config/terraform/.terraform.lock.hcl",
	"config/terraform/versions.tofu",
	"Terrafile",
]

main_stack := {
	"branch": "main",
	"id": "main-stack",
}

main_stack_files := [
	sprintf("app/stacks/%s/main.tf", [main_stack.id]),
	sprintf("app/stacks/%s/stack.yml", [main_stack.id]),
]

other_stack := {
	"branch": "main",
	"id": "other-stack",
}

other_stack_files := [
	sprintf("app/stacks/%s/main.tf", [other_stack.id]),
	sprintf("app/stacks/%s/stack.yml", [other_stack.id]),
]

test_is_file_to_run[file] if {
	some file in files_to_run
	spacelift.is_file_to_run(file)
}

test_is_not_file_to_run[file] if {
	some file in files_to_ignore
	not spacelift.is_file_to_run(file)
}

test_pr_affects_files_in_other_stack if {
	pr_affects_files_in_other_stack := {
		"pull_request": {
			"action": "opened",
			"diff": other_stack_files,
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	spacelift.is_pr with input as pr_affects_files_in_other_stack
	not spacelift.is_push with input as pr_affects_files_in_other_stack
	spacelift.affects_files_to_run with input as pr_affects_files_in_other_stack
	not spacelift.ignore with input as pr_affects_files_in_other_stack
	not spacelift.propose with input as pr_affects_files_in_other_stack
	not spacelift.track with input as pr_affects_files_in_other_stack
}

test_pr_affects_files_in_this_stack if {
	pr_affects_files_in_this_stack := {
		"pull_request": {
			"action": "opened",
			"diff": main_stack_files,
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	spacelift.is_pr with input as pr_affects_files_in_this_stack
	not spacelift.is_push with input as pr_affects_files_in_this_stack
	spacelift.affects_files_to_run with input as pr_affects_files_in_this_stack
	not spacelift.ignore with input as pr_affects_files_in_this_stack
	not spacelift.propose with input as pr_affects_files_in_this_stack
	not spacelift.track with input as pr_affects_files_in_this_stack
}

test_pr_affects_files_to_ignore_always if {
	pr_affects_files_to_ignore_always := {
		"pull_request": {
			"action": "opened",
			"diff": files_to_ignore,
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	spacelift.is_pr with input as pr_affects_files_to_ignore_always
	not spacelift.is_push with input as pr_affects_files_to_ignore_always
	not spacelift.affects_files_to_run with input as pr_affects_files_to_ignore_always
	spacelift.ignore with input as pr_affects_files_to_ignore_always
}

test_pr_affects_files_to_run_always if {
	pr_affects_files_to_run_always := {
		"pull_request": {
			"action": "opened",
			"diff": files_to_run,
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	spacelift.is_pr with input as pr_affects_files_to_run_always
	not spacelift.is_push with input as pr_affects_files_to_run_always
	spacelift.affects_files_to_run with input as pr_affects_files_to_run_always
	not spacelift.ignore with input as pr_affects_files_to_run_always
	not spacelift.propose with input as pr_affects_files_to_run_always
	not spacelift.track with input as pr_affects_files_to_run_always
}

# test case based on https://github.com/trialspark/terraform/pull/3704
test_pr_affects_mixed_files if {
	pr_affects_mixed_files := {
		"pull_request": {
			"action": "opened",
			"diff": array.concat(other_stack_files, [".github/config/aws/credentials"]),
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	spacelift.is_pr with input as pr_affects_mixed_files
	not spacelift.is_push with input as pr_affects_mixed_files
	spacelift.affects_files_to_run with input as pr_affects_mixed_files
	not spacelift.ignore with input as pr_affects_mixed_files
	not spacelift.propose with input as pr_affects_mixed_files
	not spacelift.track with input as pr_affects_mixed_files
}

test_pr_merge if {
	pr_merge := {
		"pull_request": {"action": "merged"},
		"push": {
			"affected_files": files_to_run,
			"branch": "main",
		},
		"stack": main_stack,
	}
	spacelift.is_push with input as pr_merge
	spacelift.track with input as pr_merge
}

test_push_affects_files_in_other_stack if {
	push_affects_files_in_other_stack := {
		"pull_request": null,
		"push": {
			"affected_files": other_stack_files,
			"branch": "main",
		},
		"stack": main_stack,
	}
	not spacelift.is_pr with input as push_affects_files_in_other_stack
	spacelift.is_push with input as push_affects_files_in_other_stack
	spacelift.affects_files_to_run with input as push_affects_files_in_other_stack
	not spacelift.ignore with input as push_affects_files_in_other_stack
	not spacelift.propose with input as push_affects_files_in_other_stack
	not spacelift.track with input as push_affects_files_in_other_stack
}

test_push_affects_files_in_this_stack if {
	push_affects_files_in_this_stack := {
		"pull_request": null,
		"push": {
			"affected_files": main_stack_files,
			"branch": "main",
		},
		"stack": main_stack,
	}
	not spacelift.is_pr with input as push_affects_files_in_this_stack
	spacelift.is_push with input as push_affects_files_in_this_stack
	spacelift.affects_files_to_run with input as push_affects_files_in_this_stack
	not spacelift.ignore with input as push_affects_files_in_this_stack
	not spacelift.propose with input as push_affects_files_in_this_stack
	spacelift.track with input as push_affects_files_in_this_stack
}

test_push_affects_files_to_ignore_always if {
	push_affects_files_to_ignore_always := {
		"pull_request": null,
		"push": {
			"affected_files": files_to_ignore,
			"branch": "main",
		},
		"stack": main_stack,
	}
	not spacelift.is_pr with input as push_affects_files_to_ignore_always
	spacelift.is_push with input as push_affects_files_to_ignore_always
	not spacelift.affects_files_to_run with input as push_affects_files_to_ignore_always
	spacelift.ignore with input as push_affects_files_to_ignore_always
}

test_push_affects_files_to_run_always if {
	push_affects_files_to_run_always := {
		"pull_request": null,
		"push": {
			"affected_files": files_to_run,
			"branch": "main",
		},
		"stack": main_stack,
	}
	not spacelift.is_pr with input as push_affects_files_to_run_always
	spacelift.is_push with input as push_affects_files_to_run_always
	spacelift.affects_files_to_run with input as push_affects_files_to_run_always
	not spacelift.ignore with input as push_affects_files_to_run_always
	not spacelift.propose with input as push_affects_files_to_run_always
	spacelift.track with input as push_affects_files_to_run_always
}

# test case based on https://github.com/trialspark/terraform/pull/3704
test_push_affects_mixed_files if {
	push_affects_mixed_files := {
		"pull_request": null,
		"push": {
			"affected_files": array.concat(other_stack_files, [".github/config/aws/credentials"]),
			"branch": "main",
		},
		"stack": main_stack,
	}
	not spacelift.is_pr with input as push_affects_mixed_files
	spacelift.is_push with input as push_affects_mixed_files
	spacelift.affects_files_to_run with input as push_affects_mixed_files
	not spacelift.ignore with input as push_affects_mixed_files
	not spacelift.propose with input as push_affects_mixed_files
	not spacelift.track with input as push_affects_mixed_files
}

test_push_to_feature_branch if {
	push_to_feature_branch := {
		"pull_request": null,
		"push": {
			"affected_files": files_to_run,
			"branch": "feature",
		},
		"stack": main_stack,
	}
	not spacelift.is_pr with input as push_to_feature_branch
	not spacelift.is_push with input as push_to_feature_branch
	spacelift.affects_files_to_run with input as push_to_feature_branch
	not spacelift.ignore with input as push_to_feature_branch
	not spacelift.propose with input as push_to_feature_branch
	not spacelift.track with input as push_to_feature_branch
}

test_sample if {
	spacelift.sample
}
