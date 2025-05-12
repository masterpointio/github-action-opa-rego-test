package spacelift

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# Cancel proposed runs (plans), but not tracked runs (applies), if a new commit is pushed to the branch
# https://docs.spacelift.io/concepts/policy/git-push-policy#canceling-in-progress-runs
cancel contains run.id if {
	some run in input.in_progress
	run.branch == input.pull_request.head.branch
	run.type == "PROPOSED"
	states_to_cancel := {"READY", "QUEUED"}
	some run.state in states_to_cancel
}

# https://docs.spacelift.io/concepts/policy#sampling-policy-inputs
sample := true
