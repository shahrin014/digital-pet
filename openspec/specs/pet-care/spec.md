# Pet Care Specification

## Purpose

Defines the care actions the player can perform, their effects, when they are available, and the feedback the player receives.

## Requirements

### Requirement: Care actions

The app SHALL provide exactly four care actions in the MVP: feed, play, sleep or wake, and walk. Each action SHALL produce a distinct effect and a visible pet reaction.

#### Scenario: All actions are available

- **GIVEN** the pet is awake and every need is 50
- **WHEN** the main game screen is displayed
- **THEN** feed, play, sleep, and walk controls are present and enabled

### Requirement: Feeding

Feeding SHALL add 35 fullness and 5 happiness, SHALL be available only while the pet is awake, and SHALL be blocked with an explanation when fullness is 95 or higher.

#### Scenario: Feeding a hungry pet

- **GIVEN** the pet is awake with fullness 40 and happiness 50
- **WHEN** the player feeds the pet
- **THEN** fullness becomes 75
- **AND** happiness becomes 55

#### Scenario: Feeding a full pet

- **GIVEN** the pet is awake with fullness 96
- **WHEN** the player tries to feed the pet
- **THEN** no need changes
- **AND** the app explains that the pet is already full

#### Scenario: Feeding a sleeping pet

- **GIVEN** the pet is sleeping
- **WHEN** the player tries to feed the pet
- **THEN** no need changes
- **AND** the app explains that the pet is asleep and offers to wake it

### Requirement: Playing

Playing SHALL add 20 happiness, remove 10 energy, and remove 5 fullness, and SHALL require the pet to be awake with at least 15 energy.

#### Scenario: Playing with an energetic pet

- **GIVEN** the pet is awake with energy 60, happiness 40, and fullness 70
- **WHEN** the player plays with the pet
- **THEN** happiness becomes 60
- **AND** energy becomes 50
- **AND** fullness becomes 65

#### Scenario: Playing when too tired

- **GIVEN** the pet is awake with energy 10
- **WHEN** the player tries to play
- **THEN** no need changes
- **AND** the app explains that the pet is too tired and suggests sleep

### Requirement: Sleeping and waking

The app SHALL let the player put an awake pet to sleep and wake a sleeping pet. While asleep, the pet SHALL use the sleep regeneration rules in the pet-needs specification, play and walk SHALL be unavailable, and the pet SHALL wake automatically when energy reaches 100.

#### Scenario: Putting the pet to sleep

- **GIVEN** the pet is awake
- **WHEN** the player chooses sleep
- **THEN** the pet's activity state becomes `sleeping`
- **AND** the sleep control changes to a wake control

#### Scenario: Waking the pet

- **GIVEN** the pet is sleeping
- **WHEN** the player chooses wake
- **THEN** the pet's activity state becomes `awake`

#### Scenario: Automatic wake at full energy

- **GIVEN** the pet is sleeping with energy 96
- **WHEN** enough time passes for energy to reach 100
- **THEN** the pet wakes automatically
- **AND** the activity state becomes `awake`

#### Scenario: Sleep continues while the app is closed

- **GIVEN** the pet is sleeping with energy 20 and the app is closed
- **WHEN** the app is opened 10 hours later
- **THEN** energy reaches 100 after 8 hours of sleep
- **AND** the pet wakes automatically at that point
- **AND** awake energy decay applies for the remaining 2 hours
- **AND** energy is approximately 94

#### Scenario: Play while asleep is blocked

- **GIVEN** the pet is sleeping
- **WHEN** the player tries to play
- **THEN** no need changes
- **AND** the app explains that the pet is asleep

### Requirement: Walking

Starting a walk SHALL create a 5-minute walking session, require the pet to be awake with at least 25 energy, and make sleep and play unavailable until the walk ends. A completed walk SHALL add 30 happiness, remove 20 energy, and remove 10 fullness. Normal time-based decay also applies during the walk; the stated effects are the walk's own contribution. A cancelled walk SHALL apply none of those effects.

#### Scenario: Completing a walk

- **GIVEN** the pet is awake with energy 60, happiness 40, and fullness 70
- **WHEN** the player starts a walk and 5 minutes pass
- **THEN** happiness is approximately 70
- **AND** energy is approximately 40
- **AND** fullness is approximately 60
- **AND** the activity state returns to `awake`

#### Scenario: Starting a walk while too tired

- **GIVEN** the pet is awake with energy 20
- **WHEN** the player tries to start a walk
- **THEN** no walk starts
- **AND** no need changes
- **AND** the app explains that the pet needs more energy

#### Scenario: Walk continues while the app is closed

- **GIVEN** the player starts a walk and closes the app
- **WHEN** the player reopens the app after 6 minutes
- **THEN** the walk is completed
- **AND** the walk effects are applied
- **AND** the pet is awake

#### Scenario: Cancelling a walk

- **GIVEN** a walk has been running for 2 minutes
- **WHEN** the player cancels the walk
- **THEN** no walk effects are applied
- **AND** the activity state returns to `awake`
- **AND** the pet is available for other actions

### Requirement: Walking blocks conflicting actions

While the pet is walking, the app SHALL block play, sleep, feed, and starting another walk, and SHALL explain that the pet is on a walk.

#### Scenario: Action during a walk

- **GIVEN** a walk is in progress
- **WHEN** the player tries to put the pet to sleep
- **THEN** the activity state remains `walking`
- **AND** the app explains that the pet is currently walking

### Requirement: Actions are validated before they change state

An action that cannot be performed SHALL NOT change any need or activity state, and SHALL show a clear reason to the player.

#### Scenario: Blocked action has no side effects

- **GIVEN** the pet is too tired to play
- **WHEN** the player tries to play
- **THEN** energy, fullness, and happiness are unchanged
- **AND** the activity state is unchanged
- **AND** a reason is shown

### Requirement: Action feedback is immediate

After a valid care action, the app SHALL update the affected needs and show a pet reaction and a short message within 500 milliseconds, without requiring a reload. The updated state SHALL be persisted before the action is considered complete.

#### Scenario: Feeding feedback

- **WHEN** the player feeds the pet
- **THEN** the fullness meter updates immediately
- **AND** the pet shows a feeding reaction
- **AND** a short message describes the result
- **AND** reloading the app preserves the updated fullness

### Requirement: Repeated input applies once

A single player intent SHALL be applied only once, even if the control is activated multiple times within one second.

#### Scenario: Double tap on feed

- **GIVEN** fullness is 40
- **WHEN** the player double-taps the feed control within one second
- **THEN** the feed effect is applied only once
- **AND** fullness becomes 75, not 100

### Requirement: Friendly, non-punitive tone

All care messages, including blocked-action messages and messages shown at critical needs, SHALL be friendly and non-punitive. The app SHALL NOT scold the player or imply that the pet has been harmed permanently.

#### Scenario: Returning to a critical pet

- **GIVEN** the pet is in a critical state
- **WHEN** the player opens the app
- **THEN** the message is supportive and suggests a care action
- **AND** the message does not shame the player for being away
