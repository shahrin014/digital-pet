# Delta for Pet Adoption

## MODIFIED Requirements

### Requirement: Resetting the pet

The app SHALL provide a reset action that requires explicit confirmation, clearly states that the pet and its progress will be permanently deleted, and only deletes the pet after confirmation. Resetting the pet SHALL preserve notification and quiet-hour preferences.

#### Scenario: Confirming a reset

- **GIVEN** a pet exists
- **WHEN** the player chooses reset and confirms
- **THEN** the saved pet and its progress are deleted
- **AND** the adoption flow is shown

#### Scenario: Cancelling a reset

- **GIVEN** a pet exists
- **WHEN** the player chooses reset and cancels
- **THEN** the pet and its progress are unchanged
- **AND** the player returns to the main game screen

#### Scenario: Reset keeps preferences

- **GIVEN** a pet exists and the player has customized notification settings
- **WHEN** the player confirms a reset
- **THEN** the pet and its progress are deleted
- **AND** the notification and quiet-hour preferences are preserved
