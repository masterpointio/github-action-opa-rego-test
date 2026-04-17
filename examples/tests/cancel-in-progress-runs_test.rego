package spacelift

import rego.v1

test_cancel_runs_allowed if {
	cancel["test"] with input as {
		"pull_request": {"head": {"branch": "main"}},
		"in_progress": [{
			"id": "test",
			"type": "PROPOSED",
			"state": "QUEUED",
			"branch": "main",
		}],
	}
}

test_cancel_runs_denied if {
	not cancel["test"] with input as {
		"pull_request": {"head": {"branch": "feature/example"}},
		"in_progress": [{
			"id": "test",
			"type": "PROPOSED",
			"state": "QUEUED",
			"branch": "main",
		}],
	}
}
