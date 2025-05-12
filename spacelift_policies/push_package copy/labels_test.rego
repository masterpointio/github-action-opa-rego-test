package spacelift_policies.push_test

import data.spacelift
import future.keywords.if
import future.keywords.in

# https://docs.spacelift.io/concepts/policy/push-policy
# https://docs.spacelift.io/concepts/policy#testing-policies
# https://www.openpolicyagent.org/docs/latest/policy-testing/

test_pr_with_ignore_label[draft] if {
	some draft in {false, true}
	pr_with_ignore_label := {
		"pull_request": {
			"action": "opened",
			"closed": false,
			"diff": main_stack_files,
			"draft": draft,
			"labels": ["spacelift-no-trigger"],
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	spacelift.ignore with input as pr_with_ignore_label
}

test_pr_with_trigger_label[draft] if {
	some draft in {false, true}
	pr_with_trigger_label := {
		"pull_request": {
			"action": "opened",
			"closed": false,
			"diff": main_stack_files,
			"draft": draft,
			"labels": ["spacelift-trigger"],
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	not spacelift.ignore with input as pr_with_trigger_label
	spacelift.propose with input as pr_with_trigger_label
}

test_pr_with_unrelated_label[draft] if {
	some draft in {false, true}
	pr_with_unrelated_label := {
		"pull_request": {
			"action": "opened",
			"closed": false,
			"diff": other_stack_files,
			"draft": draft,
			"labels": ["foo"],
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	not spacelift.ignore with input as pr_with_unrelated_label
	not spacelift.propose with input as pr_with_unrelated_label
}

test_pr_with_trigger_label_affects_files_in_other_stack if {
	pr_with_trigger_label_affects_files_in_other_stack := {
		"pull_request": {
			"action": "labeled",
			"closed": false,
			"diff": other_stack_files,
			"draft": false,
			"labels": ["spacelift-trigger"],
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	not spacelift.ignore with input as pr_with_trigger_label_affects_files_in_other_stack
	not spacelift.propose with input as pr_with_trigger_label_affects_files_in_other_stack
}

test_pr_with_trigger_label_affects_files_to_ignore_always if {
	pr_with_trigger_label_affects_files_to_ignore_always := {
		"pull_request": {
			"action": "labeled",
			"closed": false,
			"diff": files_to_ignore,
			"draft": false,
			"labels": ["spacelift-trigger"],
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	spacelift.ignore with input as pr_with_trigger_label_affects_files_to_ignore_always
}

test_pr_with_trigger_label_closed if {
	pr_with_trigger_label_closed := {
		"pull_request": {
			"action": "labeled",
			"closed": true,
			"diff": main_stack_files,
			"draft": false,
			"labels": ["spacelift-trigger"],
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	not spacelift.propose with input as pr_with_trigger_label_closed
}

test_push if {
	push := {
		"pull_request": null,
		"push": {
			"affected_files": other_stack_files,
			"branch": main_stack.branch,
		},
		"stack": main_stack,
	}
	not spacelift.ignore with input as push
	not spacelift.propose with input as push
}

test_sample if {
	spacelift.sample
}
