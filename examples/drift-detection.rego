package spacelift

import rego.v1

slack contains {"channel_id": "C000000"} if {
	# Checking if drift detection is present in the run update
	input.run_updated.run.drift_detection

	# Condition to verify that there is at least one change
	count(input.run_updated.run.changes) > 0
}

sample := true
