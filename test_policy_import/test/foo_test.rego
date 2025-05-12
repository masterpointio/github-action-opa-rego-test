package policy.foo

import data.policy.utils

# Mock time for tests
mock_time_ns = 1651815600000000000 # Friday, 9:00 AM

# Mock the time function for testing
time = {"now_ns": mock_time_ns}

# Test allow for normal user read
test_allow_user_read {
    # Setup test input
    input := {
        "operation": "read",
        "user": {
            "id": "user1",
            "roles": ["user"],
            "department": "engineering"
        },
        "resource": {
            "id": "resource1",
            "department": "engineering",
            "sensitive": false,
            "permissions": {
                "read": ["user1", "user2"],
                "write": ["manager1"]
            }
        }
    }

    # Assert allow is true
    allow with input as input
        with data.policy.utils.within_business_hours as true
}

# Test deny for sensitive resource outside business hours
test_deny_sensitive_outside_hours {
    # Setup test input
    input := {
        "operation": "read",
        "user": {
            "id": "manager1",
            "roles": ["manager"],
            "department": "engineering"
        },
        "resource": {
            "id": "resource2",
            "department": "engineering",
            "sensitive": true,
            "permissions": {
                "read": ["manager1"],
                "write": ["manager1"]
            }
        }
    }

    # Assert allow is false
    not allow with input as input
        with data.policy.utils.within_business_hours as false
}

# Test allow for manager write
test_allow_manager_write {
    # Setup test input
    input := {
        "operation": "write",
        "user": {
            "id": "manager1",
            "roles": ["manager"],
            "department": "engineering"
        },
        "resource": {
            "id": "resource1",
            "department": "engineering",
            "sensitive": false,
            "permissions": {
                "read": ["user1", "user2", "manager1"],
                "write": ["manager1"]
            }
        }
    }

    # Assert allow is true
    allow with input as input
        with data.policy.utils.within_business_hours as true
}

# Test deny for user write
test_deny_user_write {
    # Setup test input
    input := {
        "operation": "write",
        "user": {
            "id": "user1",
            "roles": ["user"],
            "department": "engineering"
        },
        "resource": {
            "id": "resource1",
            "department": "engineering",
            "sensitive": false,
            "permissions": {
                "read": ["user1", "user2"],
                "write": ["manager1"]
            }
        }
    }

    # Assert allow is false
    not allow with input as input
}
