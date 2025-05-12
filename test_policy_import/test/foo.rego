package policy.foo

import data.policy.utils

# Define default denial
default allow = false

# Allow rule for read operations
allow {
    # Check that the operation is a read
    input.operation == "read"

    # Check that the user can access the resource
    utils.can_access_resource(input.user, input.resource, "read")

    # Ensure it's during business hours for sensitive resources
    not input.resource.sensitive
} else {
    # Alternative path for sensitive resources
    input.operation == "read"
    input.resource.sensitive
    utils.can_access_resource(input.user, input.resource, "read")
    utils.within_business_hours
    utils.has_role(input.user, "manager")
}

# Allow rule for write operations
allow {
    # Check that the operation is a write
    input.operation == "write"

    # Only managers and admins can write
    utils.has_role(input.user, "manager")

    # Check that the user can access the resource
    utils.can_access_resource(input.user, input.resource, "write")

    # Ensure it's during business hours
    utils.within_business_hours
}
