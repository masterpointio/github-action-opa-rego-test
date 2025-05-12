package spacelift_policies.push_test


import data.spacelift
import future.keywords.if
import future.keywords.in

# https://docs.spacelift.io/concepts/policy/push-policy
# https://docs.spacelift.io/concepts/policy#testing-policies
# https://www.openpolicyagent.org/docs/latest/policy-testing/

test_cancel_in_progress_runs_on_pr_branch if {
	pr_with_in_progress_runs := {
		"in_progress": [
			{
				"id": "test-queued",
				"type": "PROPOSED",
				"state": "QUEUED",
				"branch": "feature",
			},
			{
				"id": "test-ready",
				"type": "PROPOSED",
				"state": "READY",
				"branch": "feature",
			},
		],
		"pull_request": {
			"action": "synchronize",
			"base": {"branch": main_stack.branch},
			"head": {"branch": "feature"},
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	expected_cancel := {"test-queued", "test-ready"}
	# TODO actual would be test-queued and test-ready
	spacelift.cancel == expected_cancel with input as pr_with_in_progress_runs
}

test_not_cancel_in_progress_runs_on_pr_branch if {
	pr_with_in_progress_runs := {
		"in_progress": [{
			"id": "test-planning",
			"type": "PROPOSED",
			"state": "PLANNING",
			"branch": "feature",
		}],
		"pull_request": {
			"action": "synchronize",
			"base": {"branch": main_stack.branch},
			"head": {"branch": "feature"},
		},
		"push": {"branch": "feature"},
		"stack": main_stack,
	}
	expected_cancel := set()
	spacelift.cancel == expected_cancel with input as pr_with_in_progress_runs
}

test_not_cancel_in_progress_runs_on_push_branch if {
	push_with_in_progress_runs := {
		"in_progress": [
			{
				"id": "test-queued",
				"type": "PROPOSED",
				"state": "QUEUED",
				"branch": main_stack.branch,
			},
			{
				"id": "test-ready",
				"type": "PROPOSED",
				"state": "READY",
				"branch": main_stack.branch,
			},
		],
		"pull_request": null,
		"push": {"branch": main_stack.branch},
		"stack": main_stack,
	}
	expected_cancel := set()
	spacelift.cancel == expected_cancel with input as push_with_in_progress_runs
}

test_sample if {
	spacelift.sample
}
