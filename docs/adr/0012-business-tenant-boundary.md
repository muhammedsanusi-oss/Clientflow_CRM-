# ADR-0012: Business is the tenant and data-access boundary

## Status

Proposed

## Context

The application serves independent businesses such as salons, stores,
groomers, and veterinary clinics. A business may operate multiple physical
locations. Employees need access to the same customer records across every
location belonging to their business.

The existing Company_or_Location model combines the business and physical
location concepts, making ownership and authorization unclear.

## Decision

Business is the tenant and security boundary.

- A business has one or more locations.
- Employees belong to a business.
- Customers belong directly to a business, not a location.
- All employees in a business can access that business's customers.
- Appointments occur at a location.
- The server derives business identity from the signed-in employee.
- Client-supplied business identifiers are never trusted for authorization.
- Records belonging to another business appear absent and return 404.

## Consequences

Customer records are shared across a business's locations without being
duplicated. Queries must include the current employee's business scope.

Business and Location require separate database models. Existing domain
models that contain tenant-owned data require a business relationship,
either directly or through another tenant-owned record.

A person who visits two unrelated businesses has a separate customer record
in each business.

## Alternatives considered

Making Location the ownership boundary was rejected because customers must
be shared across locations.

A global customer directory was rejected because it could expose customer
information between unrelated businesses.
