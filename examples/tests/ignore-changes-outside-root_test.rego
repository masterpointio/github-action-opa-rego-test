package spacelift

import rego.v1

test_affected_no_files if {
	not affected with input as {
		"stack": {"project_root": ""},
		"push": {"affected_files": []},
	}
}

test_affected_tf_files if {
	affected with input as {
		"stack": {"project_root": ""},
		"push": {"affected_files": ["main.tf", "stacks.tf"]},
	}
}

test_affected_no_tf_files if {
	not affected with input as {
		"stack": {"project_root": ""},
		"push": {"affected_files": ["README", "myicon.png"]},
	}
}

test_affected_outside_project_root if {
	not affected with input as {
		"stack": {"project_root": "stacks/my-stack"},
		"push": {"affected_files": ["stacks/another-stack/main.tf"]},
	}
}

test_ignore_affected if {
	ignore with affected as false
}

test_ignore_not_affected if {
	not ignore with affected as true
}

test_ignore_tag if {
	ignore with input as {"push": {"tag": "v1.0.0"}}
		with affected as true
}

test_propose_affected if {
	propose with affected as true
}

test_propose_not_affected if {
	not propose with affected as false
}

matching_branch_input := {
	"push": {"branch": "main"},
	"stack": {"branch": "main"},
}

test_track_affected if {
	track with input as matching_branch_input with affected as true
}

test_track_not_affected if {
	not track with input as matching_branch_input with affected as false
}

test_track_not_stack_branch if {
	not track with input as {
		"push": {"branch": "my-feature"},
		"stack": {"branch": "main"},
	}
		with affected as true
}
