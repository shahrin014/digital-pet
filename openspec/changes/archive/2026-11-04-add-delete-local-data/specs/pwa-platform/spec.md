# Delta for PWA Platform

## ADDED Requirements

### Requirement: Local data deletion

The app SHALL provide an explicit "delete local database" action, separate from resetting the pet, that deletes the local database and all stored app data on the device, including the pet, progress, preferences, and reminder timestamps. The app SHALL require explicit confirmation and SHALL warn that the action cannot be undone.

#### Scenario: Deleting the local database

- **GIVEN** a pet and customized notification preferences exist
- **WHEN** the player confirms deleting the local database
- **THEN** the pet, progress, preferences, and reminder timestamps are deleted
- **AND** the adoption flow is shown
- **AND** the next adoption starts with default preferences

#### Scenario: Cancelling local database deletion

- **GIVEN** the delete-local-database confirmation is open
- **WHEN** the player cancels
- **THEN** no data is deleted
- **AND** the current pet remains available

#### Scenario: Deletion is blocked by another tab

- **GIVEN** another tab is holding the local database open
- **WHEN** the player confirms deletion
- **THEN** the app explains that other Digital Pet tabs must be closed
- **AND** the current pet remains available
