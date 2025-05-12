package policy.utils

# Helper function to check if a user has a specific role
has_role(user, role) {
    user.roles[_] == role
}

# Helper function to check if a user belongs to a specific department
in_department(user, department) {
    user.department == department
}

# Helper function to validate resource access
can_access_resource(user, resource, permission) {
    # Admin users can access any resource
    has_role(user, "admin")
} else {
    # Users can access resources in their department
    in_department(user, resource.department)

    # Check specific permission
    resource.permissions[permission][_] == user.id
}

# Helper for time-based policies
within_business_hours {
    time.weekday(time.now_ns()) != "Saturday"
    time.weekday(time.now_ns()) != "Sunday"

    hour := time.clock(time.now_ns())[0]
    hour >= 9
    hour < 17
}
