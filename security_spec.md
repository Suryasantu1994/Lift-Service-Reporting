# Security Specification - Lift Maintenance Dashboard

## Data Invariants
1. A Lift must belong to an existing Building.
2. A Service Report or Breakdown Report must reference an existing Lift and Building.
3. Only authenticated users with a verified GITAM email (@gitam.edu) can read or write data.
4. Timestamps (createdAt, updatedAt) must be server-generated.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a report with a different `authorId`.
2. **Resource Poisoning**: Document ID with junk characters.
3. **Ghost Fields**: Adding `isAdmin: true` to a building document.
4. **Invalid Enum**: Setting lift status to "Exploded".
5. **Type Mismatch**: Setting `cost` as a number instead of a string.
6. **Boundary Violation**: A technician name with 1MB of text.
7. **Orphaned Record**: Creating a lift with a non-existent `buildingId`.
8. **Malicious Delete**: User A trying to delete User B's building.
9. **Bypass GITAM Requirement**: User with `@gmail.com` trying to write.
10. **State Shortcut**: Setting a breakdown to "Resolved" without a `resolution`.
11. **Future Service**: Setting `nextServiceDate` to a date in the past.
12. **Denial of Wallet**: Sending an array with 10,000 "partsReplaced".

## The Test Runner (Plan)
We will use a test file to verify these payloads are denied.
