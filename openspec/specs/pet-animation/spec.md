# pet-animation Specification

## Purpose
Defines the pet's animation states, the default frame counts and timing for each activity, and how animations respond to actions, interruptions, and reduced-motion preferences.

## Requirements

### Requirement: Animation states

The app SHALL provide exactly six animation states: `idle`, `feed`, `play`, `sleep`, `wake`, and `walk`. The `idle`, `sleep`, and `walk` states SHALL loop while their corresponding persistent state applies. The `feed`, `play`, and `wake` states SHALL play exactly once and then return to the current persistent state.

#### Scenario: Idle loops while awake

- **GIVEN** the pet is awake and no transient action animation is playing
- **WHEN** the main game screen is displayed
- **THEN** the idle animation loops

#### Scenario: Feeding plays once

- **GIVEN** the pet is awake
- **WHEN** the player feeds the pet successfully
- **THEN** the feed animation plays exactly once
- **AND** the pet returns to idle when the feed animation finishes

#### Scenario: Playing plays once

- **GIVEN** the pet is awake and has enough energy
- **WHEN** the player plays with the pet successfully
- **THEN** the play animation plays exactly once
- **AND** the pet returns to idle when the play animation finishes

#### Scenario: Sleeping loops

- **GIVEN** the pet is sleeping
- **WHEN** the main game screen is displayed
- **THEN** the sleep animation loops

#### Scenario: Waking plays once

- **GIVEN** the pet is sleeping
- **WHEN** the player wakes the pet successfully
- **THEN** the wake animation plays exactly once
- **AND** the pet returns to idle when the wake animation finishes

#### Scenario: Walking loops

- **GIVEN** the pet is walking
- **WHEN** the main game screen is displayed
- **THEN** the walk animation loops

### Requirement: Default frame counts and timing

The built-in fox, cat, and bunny animations SHALL each use exactly these frame counts, frame durations, and loop behavior:

| Animation | Frames | Frame duration | Cycle | Playback |
| --- | --- | --- | --- | --- |
| `idle` | 4 | 125 ms | 500 ms | loop |
| `feed` | 6 | 83 ms | 500 ms | once |
| `play` | 8 | 83 ms | 667 ms | once |
| `sleep` | 4 | 250 ms | 1000 ms | loop |
| `wake` | 4 | 100 ms | 400 ms | once |
| `walk` | 6 | 100 ms | 600 ms | loop |

#### Scenario: Built-in frame counts match the table

- **GIVEN** any built-in species (fox, cat, or bunny)
- **WHEN** each animation is observed for one cycle
- **THEN** idle shows 4 distinct poses over approximately 500 ms
- **AND** feed shows 6 distinct poses over approximately 500 ms
- **AND** play shows 8 distinct poses over approximately 667 ms
- **AND** sleep shows 4 distinct poses over approximately 1000 ms
- **AND** wake shows 4 distinct poses over approximately 400 ms
- **AND** walk shows 6 distinct poses over approximately 600 ms

#### Scenario: Frame timing tolerance

- **GIVEN** an animation is playing on a supported device
- **WHEN** one cycle completes
- **THEN** its elapsed time is within 100 ms of the cycle in the table

### Requirement: Actions trigger animations

The app SHALL start a successful action's animation within 100 ms of applying the action. A blocked action SHALL NOT play its activity animation. Starting a walk or falling asleep SHALL start the corresponding persistent animation immediately, and completing or cancelling a walk SHALL return the pet to idle.

#### Scenario: Successful feed animates

- **GIVEN** the pet is awake and not full
- **WHEN** the player feeds the pet
- **THEN** the feed animation starts within 100 ms
- **AND** the need changes and result message are still shown immediately

#### Scenario: Blocked feed does not animate

- **GIVEN** the pet is asleep
- **WHEN** the player tries to feed the pet
- **THEN** the feed animation does not play
- **AND** the app explains that the pet is asleep

#### Scenario: Starting a walk animates

- **GIVEN** the pet is awake with enough energy
- **WHEN** the player starts a walk
- **THEN** the walk animation starts immediately
- **AND** the walk animation loops until the walk ends

#### Scenario: Walk completion returns to idle

- **GIVEN** the walk animation is playing
- **WHEN** the walk completes or is cancelled
- **THEN** the pet returns to the idle animation

#### Scenario: Resume does not replay a transient animation

- **GIVEN** the feed animation is playing
- **WHEN** the app is hidden long enough for the feed animation to finish and is then resumed
- **THEN** the pet shows the current persistent animation
- **AND** the feed animation is not replayed

### Requirement: Animation interruption

A successful action SHALL replace any currently playing transient animation immediately, and transient animations SHALL NOT queue. A persistent sleep or walk state SHALL override a transient animation.

#### Scenario: Play replaces feed

- **GIVEN** the feed animation is playing
- **WHEN** the player plays with the pet before the feed animation finishes
- **THEN** the play animation replaces the feed animation immediately
- **AND** both successful actions apply to the pet

#### Scenario: Sleep replaces a transient animation

- **GIVEN** the feed animation is playing
- **WHEN** the player puts the pet to sleep
- **THEN** the sleep animation starts immediately
- **AND** the feed animation does not resume

### Requirement: Motion preference

The app SHALL offer three motion preferences: `system` (the default), `full`, and `reduced`. `system` SHALL follow the operating system setting, `full` SHALL allow animations even when the operating system requests reduced motion, and `reduced` SHALL disable animations regardless of the operating system. The preference SHALL persist.

#### Scenario: Always animate overrides the device setting

- **GIVEN** the device requests reduced motion
- **WHEN** the player selects **Always animate**
- **THEN** activity animations play

#### Scenario: Always reduce motion overrides the device setting

- **GIVEN** the device does not request reduced motion
- **WHEN** the player selects **Always reduce motion**
- **THEN** activity animations do not play
- **AND** activity text, badges, and result messages still update

#### Scenario: Default follows the device setting

- **GIVEN** the motion preference is **Use device setting**
- **WHEN** the device's reduced-motion setting changes
- **THEN** the app follows the new setting without a reload

#### Scenario: Reduced-motion notice

- **GIVEN** the device requests reduced motion and the preference is **Use device setting**
- **WHEN** the player opens settings
- **THEN** a notice explains that activity animations are paused and suggests **Always animate**

### Requirement: Reduced motion

When the effective motion setting requests reduced motion—the player selected **Always reduce motion**, or selected **Use device setting** and the operating system requests reduced motion—the app SHALL render one static representative frame for the current state, SHALL NOT advance frames or loop, and SHALL NOT play transient frame sequences. Activity text, badges, and result messages SHALL still update.

#### Scenario: Reduced-motion feeding

- **GIVEN** the device has `prefers-reduced-motion: reduce`
- **WHEN** the player feeds the pet
- **THEN** the pet is shown in a single feeding pose
- **AND** no frame sequence or looping animation plays
- **AND** the feeding message is still shown and announced

#### Scenario: Reduced-motion sleeping

- **GIVEN** the device has `prefers-reduced-motion: reduce` and the pet is sleeping
- **THEN** the pet is shown in a single sleeping pose
- **AND** no looping motion plays

### Requirement: Animation accessibility

The animated pet SHALL expose an accessible name that includes the pet's name, species, activity state, and current animation state. The app SHALL NOT rely on animation alone to communicate activity or action results.

#### Scenario: Accessible animation name

- **GIVEN** Mochi the fox is playing
- **WHEN** assistive technology reads the pet image
- **THEN** the accessible name identifies Mochi, the fox, play activity, and the play animation
- **AND** the activity badge and result message remain available as text
