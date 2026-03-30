# Setup Contract

## Happy-Path Setup Goals

The first self-serve setup flow should let a simple Cliniko clinic:

1. enter business details
2. choose live Cliniko or demo mode
3. connect or simulate practitioners and appointment types
4. enter fallback and FAQ details
5. reach a test-call experience

## Demo Mode Expectations

When live Cliniko is not connected, the system should:

- load seeded clinic data
- simulate availability
- simulate booking mutations
- persist the payloads that would have been sent to Cliniko
- make those payloads visible in the review flow

## Early Release Constraint

The setup path is intentionally narrow:

- one location
- simple appointment policy
- one fallback number
- limited FAQ set
