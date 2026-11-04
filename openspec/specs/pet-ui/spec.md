# Pet Interface Specification

## Purpose

Defines the main game screen, how game state is presented, and the accessibility and responsive behavior of the interface.

## Requirements

### Requirement: Main game screen content

The main game screen SHALL show the pet's visual representation, its name, its current mood, indicators for fullness, energy, and happiness, and controls for feed, play, sleep or wake, and walk.

#### Scenario: Complete main screen

- **GIVEN** a pet exists
- **WHEN** the main game screen is displayed
- **THEN** the pet, name, mood, all three need indicators, and all four action controls are visible

### Requirement: Need indicators are not color-only

Each need indicator SHALL include a text label and a qualitative state, and SHALL NOT rely on color alone to communicate its value or urgency.

#### Scenario: Low need with color-vision deficiency

- **GIVEN** energy is low
- **WHEN** the player views the energy indicator
- **THEN** the low state is communicated by text or an icon in addition to color

### Requirement: Pet appearance reflects state

The pet's rendered appearance SHALL reflect its chosen species and its current activity state, including at least awake, sleeping, and walking.

#### Scenario: Sleeping appearance

- **GIVEN** the pet is sleeping
- **WHEN** the main game screen is displayed
- **THEN** the pet is shown in a sleeping pose or with a clear sleeping indicator

#### Scenario: Walking appearance

- **GIVEN** a walk is in progress
- **WHEN** the main game screen is displayed
- **THEN** the pet is shown in a walking state
- **AND** the remaining walk time or progress is visible

### Requirement: Responsive layout

The main game screen SHALL be usable without horizontal scrolling at viewport widths from 320 CSS pixels upward, SHALL respect device safe areas, and SHALL keep the pet and all action controls visible in a 360 by 640 CSS pixel portrait viewport without overlapping.

#### Scenario: Small phone viewport

- **GIVEN** a 320 by 568 CSS pixel viewport
- **WHEN** the main game screen is displayed
- **THEN** no horizontal scrolling is required
- **AND** all action controls can be reached

#### Scenario: Notched phone

- **GIVEN** a device with a display cutout or home indicator
- **WHEN** the app is installed and running standalone
- **THEN** content is not obscured by the safe-area insets

### Requirement: Touch targets

Every interactive control SHALL have a touch target of at least 44 by 44 CSS pixels.

#### Scenario: Action control size

- **WHEN** the feed, play, sleep, and walk controls are rendered
- **THEN** each has a touch target of at least 44 by 44 CSS pixels

### Requirement: Keyboard and screen reader access

All interactive controls SHALL be reachable and operable with a keyboard, SHALL have accessible names, SHALL show a visible focus indicator, and SHALL announce action results through a live region.

#### Scenario: Keyboard-only care

- **GIVEN** the player uses only the keyboard
- **WHEN** the player tabs to the feed control and activates it
- **THEN** the feed action is performed
- **AND** the result is announced to assistive technology

#### Scenario: Visible focus

- **WHEN** a control receives keyboard focus
- **THEN** a visible focus indicator is shown

### Requirement: Reduced motion

When the operating system requests reduced motion, the app SHALL suppress decorative animation while preserving visible and announced feedback for every action.

#### Scenario: Reduced motion preference

- **GIVEN** the device has `prefers-reduced-motion: reduce`
- **WHEN** the player feeds the pet
- **THEN** no large or continuous animation is played
- **AND** the need change and result message are still shown and announced

### Requirement: Contrast and legibility

Text SHALL meet WCAG 2.1 AA contrast of at least 4.5 to 1 against its background, and essential non-text UI elements SHALL meet at least 3 to 1.

#### Scenario: Need label contrast

- **WHEN** the main game screen is rendered in its default theme
- **THEN** need labels and values meet at least 4.5 to 1 contrast

### Requirement: Messages do not block play

Result messages and reminders SHALL be dismissible or SHALL disappear automatically, and SHALL NOT prevent the player from using care controls.

#### Scenario: Message during care

- **GIVEN** a result message is visible
- **WHEN** the player activates another care action
- **THEN** the new action is performed without waiting for the message to close

### Requirement: Controls communicate availability

When an action is unavailable, the app SHALL expose the unavailable state and its reason programmatically to assistive technology, and activating the control SHALL explain why the action cannot be performed without changing any game state.

#### Scenario: Unavailable play control

- **GIVEN** the pet is too tired to play
- **WHEN** the player focuses and activates the play control
- **THEN** the control exposes that it is unavailable and why
- **AND** the action is not performed
- **AND** the reason is shown to the player
