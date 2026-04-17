package spacelift

import rego.v1

track if {
	input.push.branch == input.stack.branch
	affected
}

propose if {
	input.push.branch != ""
}

ignore if {
	not affected
}

# Extract and use tracked directories and extensions from labels
tracked_directories contains tracked_directory if {
	label := input.stack.labels[_]
	startswith(label, "trackeddirectories:")
	tracked_directory := split(label, ":")[1]
}

tracked_extensions contains tracked_extension if {
	label := input.stack.labels[_]
	startswith(label, "trackedextensions:")
	tracked_extension := split(label, ":")[1]
}

affected if {
	some i, j
	path := input.push.affected_files[i]
	startswith(path, tracked_directories[j])
}

affected if {
	some i, j
	path := input.push.affected_files[i]
	endswith(path, tracked_extensions[j])
}

sample := true
