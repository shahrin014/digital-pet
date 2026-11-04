# Pet Adoption Specification

## Purpose

Defines how a player creates their pet, how pet identity is validated and shown, and how the player can deliberately start over.

## Requirements

### Requirement: First-run adoption

The app SHALL require the player to adopt a pet before the main game screen becomes available.

#### Scenario: First launch with no saved pet

- **GIVEN** no pet is saved on the device
- **WHEN** the player opens the app
- **THEN** the adoption flow is shown
- **AND** the main game screen is not reachable until a pet has been created

#### Scenario: Launch with an existing pet

- **GIVEN** a saved pet exists on the device
- **WHEN** the player opens the app
- **THEN** the main game screen is shown for that pet
- **AND** the adoption flow is skipped

### Requirement: Pet naming

The app SHALL require a pet name that contains between 1 and 24 characters after trimming surrounding whitespace, and SHALL reject names that are empty, whitespace-only, or longer than 24 characters.

#### Scenario: Valid name

- **WHEN** the player enters "Mochi" and confirms adoption
- **THEN** the pet is created with the name "Mochi"

#### Scenario: Empty name

- **WHEN** the player submits an empty or whitespace-only name
- **THEN** an inline validation message is shown
- **AND** no pet is created

#### Scenario: Name too long

- **WHEN** the player submits a name longer than 24 characters
- **THEN** an inline validation message states the maximum length
- **AND** no pet is created

### Requirement: Species selection

The app SHALL offer at least one built-in species, SHALL require the player to choose a species during adoption, and SHALL render the chosen species' visual appearance on the main game screen.

#### Scenario: Choosing a species

- **GIVEN** the adoption flow is open
- **WHEN** the player selects a species and confirms adoption
- **THEN** the created pet records that species
- **AND** the main game screen shows the corresponding appearance

### Requirement: Initial pet state

On adoption, the app SHALL create a pet with a unique identifier, the chosen name and species, a creation timestamp, an `awake` activity state, and initial need values of 80 for fullness, energy, and happiness.

#### Scenario: New pet starts healthy

- **WHEN** a pet is created
- **THEN** its fullness, energy, and happiness are each 80
- **AND** its activity state is `awake`
- **AND** its creation time is recorded

### Requirement: Adoption persistence

The app SHALL persist the newly created pet before showing the main game screen, and SHALL NOT complete adoption if persistence fails.

#### Scenario: Successful save

- **WHEN** the player confirms adoption and the pet is saved successfully
- **THEN** the main game screen is shown

#### Scenario: Storage failure during adoption

- **GIVEN** local storage is unavailable or full
- **WHEN** the player confirms adoption
- **THEN** the app shows an error explaining that the pet could not be saved
- **AND** the player remains in the adoption flow

### Requirement: Pet identity on the main screen

The main game screen SHALL display the pet's name and a visual representation of its chosen species.

#### Scenario: Identity is visible

- **GIVEN** a pet named "Mochi" of the "fox" species
- **WHEN** the main game screen is displayed
- **THEN** the name "Mochi" is visible
- **AND** the pet is rendered with the fox appearance

### Requirement: Single active pet

The app SHALL manage exactly one pet per installation in the MVP.

#### Scenario: No pet switcher

- **GIVEN** one pet exists
- **WHEN** the player opens the main game screen
- **THEN** no interface for switching to another pet is shown

### Requirement: Resetting the pet

The app SHALL provide a reset action that requires explicit confirmation, clearly states that the pet and its progress will be permanently deleted, and only deletes the pet after confirmation.

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
