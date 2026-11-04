# Pet Needs Specification

## Purpose

Defines the pet's needs, how they change over real time, how mood is derived from them, and how the game treats a neglected pet.

## Requirements

### Requirement: Three bounded needs

The pet SHALL have exactly three needs in the MVP: fullness, energy, and happiness. Each need SHALL be represented as a number from 0 to 100 inclusive, and every change SHALL be clamped to that range.

#### Scenario: Decay cannot go below zero

- **GIVEN** fullness is 2
- **WHEN** an hour of decay is applied
- **THEN** fullness is 0 and not a negative number

#### Scenario: Care cannot exceed the maximum

- **GIVEN** happiness is 90
- **WHEN** the player plays with the pet, which adds 20 happiness
- **THEN** happiness is 100 and not 110

### Requirement: Needs decay with real time

The app SHALL decay needs based on elapsed real time, including time while the app was closed or in the background, using these initial default rates while the pet is awake:

| Need | Change per hour |
| --- | --- |
| Fullness | −4 |
| Energy | −3 |
| Happiness | −2 |

#### Scenario: Decay while the app is closed

- **GIVEN** the pet is awake with fullness 80, energy 80, and happiness 80
- **AND** the app is closed for 2 hours
- **WHEN** the player opens the app
- **THEN** fullness is approximately 72
- **AND** energy is approximately 74
- **AND** happiness is approximately 76

#### Scenario: Decay continues while the app is in the background

- **GIVEN** the app was last updated 1 hour ago
- **WHEN** the player returns the app to the foreground
- **THEN** one hour of decay is applied before the updated needs are shown

### Requirement: Sleep changes need regeneration

While the pet is sleeping, energy SHALL regenerate at 10 points per hour, fullness and happiness SHALL decay at half their normal rates, and energy SHALL NOT decay.

#### Scenario: Energy regenerates during sleep

- **GIVEN** the pet is sleeping with energy 20
- **WHEN** 4 hours pass
- **THEN** energy is 60
- **AND** fullness and happiness have decayed at half their normal rates

#### Scenario: Regeneration stops at the maximum

- **GIVEN** the pet is sleeping with energy 95
- **WHEN** 2 hours pass
- **THEN** energy is 100

### Requirement: Catch-up is applied safely

When the app starts or returns to the foreground, it SHALL apply catch-up decay for the elapsed time since the last update, SHALL cap the elapsed time at 24 hours, and SHALL treat negative elapsed time as zero.

#### Scenario: Long absence is capped

- **GIVEN** the pet was last updated 3 days ago
- **WHEN** the player opens the app
- **THEN** at most 24 hours of decay is applied

#### Scenario: Device clock moves backwards

- **GIVEN** the stored last-updated time is later than the current device time
- **WHEN** the app applies catch-up
- **THEN** no need increases or decreases from the negative interval
- **AND** the last-updated time is corrected to the current time

### Requirement: Mood is derived from needs

The app SHALL derive a mood from the needs using this precedence:

1. `critical` if any need is 0.
2. `needy` if any need is below 30.
3. `content` if every need is at least 30 but at least one need is below 60.
4. `happy` if every need is at least 60.

The displayed mood SHALL update after any need change without requiring a reload.

#### Scenario: Happy pet

- **GIVEN** fullness, energy, and happiness are all 80
- **THEN** the mood is `happy`

#### Scenario: Low need makes the pet needy

- **GIVEN** fullness is 10 and the other needs are 70
- **THEN** the mood is `needy`

#### Scenario: Zero need overrides other moods

- **GIVEN** happiness is 0 and fullness and energy are 100
- **THEN** the mood is `critical`

#### Scenario: Mood updates after care

- **GIVEN** the pet is `needy` because fullness is 10
- **WHEN** feeding raises fullness to 45
- **THEN** the mood is recalculated and displayed before the next interaction

### Requirement: No permanent failure

Neglect SHALL NOT kill, delete, or permanently harm the pet in the MVP. A pet whose needs reach 0 SHALL enter a recoverable critical state, and care actions SHALL restore it.

#### Scenario: Critical pet recovers

- **GIVEN** fullness has been 0 for several hours
- **WHEN** the player feeds the pet
- **THEN** fullness increases normally
- **AND** the pet remains available and playable

#### Scenario: Pet is never deleted for neglect

- **GIVEN** all needs have been 0 for a long time
- **WHEN** the player opens the app
- **THEN** the pet still exists
- **AND** the app offers the normal care actions

### Requirement: Need changes are persisted with their timestamp

Each change to the pet's needs SHALL be persisted together with an updated last-updated timestamp so that reopening the app does not double-apply the same elapsed time.

#### Scenario: No double decay after an action

- **GIVEN** the app applies one hour of decay and saves the state
- **WHEN** the player immediately reloads the app
- **THEN** no additional decay is applied for the same hour
