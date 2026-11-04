# PWA Platform Specification

## Purpose

Defines installability, offline behavior, local persistence, update handling, and the device and privacy constraints of the app.

## Requirements

### Requirement: Installable app

The app SHALL provide a web app manifest with a name, a short name, a start URL, a display mode of `standalone`, theme and background colors, and at least 192 by 192 and 512 by 512 pixel icons, including a maskable icon. The app SHALL be served over HTTPS and SHALL be installable on supported browsers.

#### Scenario: Installing on a phone

- **GIVEN** the app is served over HTTPS and the service worker is registered
- **WHEN** the player chooses to install the app from the browser
- **THEN** the app installs successfully
- **AND** launching it opens in standalone mode

#### Scenario: Maskable icon

- **WHEN** the installed app icon is displayed with a circular or rounded mask
- **THEN** the icon content is not clipped or cropped

### Requirement: Offline launch and play

After one successful online load, the app SHALL load while offline and SHALL allow the full core loop offline, including viewing the pet and performing feed, play, sleep or wake, and walk.

#### Scenario: Airplane mode reload

- **GIVEN** the app has been loaded successfully at least once
- **WHEN** the device goes offline and the app is reloaded
- **THEN** the app opens
- **AND** the pet is shown
- **AND** all care actions can be used

#### Scenario: Offline walk completion

- **GIVEN** a walk is in progress and the device is offline
- **WHEN** the player reopens the app after 5 minutes
- **THEN** the walk completes without a network request

### Requirement: Local-first persistence

The app SHALL store the pet, its needs, its activity state, timestamps, and preferences in local persistent storage, and SHALL restore them on reload, restart, and offline launch.

#### Scenario: State survives reload

- **GIVEN** the player has fed the pet and fullness changed
- **WHEN** the app is reloaded
- **THEN** the saved fullness is restored

#### Scenario: State survives an app restart

- **GIVEN** the app was closed while the pet was sleeping
- **WHEN** the app is launched again
- **THEN** the pet is still sleeping
- **AND** sleep regeneration is applied for the time that passed

### Requirement: No account or server required

The core game loop SHALL work without an account, sign-in, or network request, and SHALL NOT send pet data off the device by default.

#### Scenario: First session with the network blocked

- **GIVEN** the app was previously loaded and the network is blocked
- **WHEN** the player adopts a pet and performs care actions
- **THEN** every core feature works
- **AND** no network request is required

### Requirement: Catch-up on resume

On app start and whenever the app returns to the foreground, the app SHALL recompute needs for the elapsed time before displaying the current state.

#### Scenario: Returning to the app

- **GIVEN** the app was in the background for 3 hours
- **WHEN** the app returns to the foreground
- **THEN** 3 hours of decay are applied
- **AND** the updated needs and mood are displayed

### Requirement: Storage failures are visible

If local storage is unavailable, full, or a saved state cannot be read, the app SHALL inform the player and SHALL avoid silently losing progress. Where possible, the app SHALL keep the current session usable in memory and retry saving.

#### Scenario: Quota exceeded

- **GIVEN** the browser storage quota is full
- **WHEN** the app tries to save a care action
- **THEN** the player sees a clear warning that progress may not be saved
- **AND** the app keeps working for the current session

#### Scenario: Corrupt saved state

- **GIVEN** the saved pet data cannot be parsed
- **WHEN** the app starts
- **THEN** the app does not crash
- **AND** the player is offered a way to reset the saved data and adopt a new pet

### Requirement: Updates do not destroy progress

When a new version of the app is available, the app SHALL activate it without deleting the saved pet, and SHALL NOT show a broken or partially updated interface.

#### Scenario: Update after a new deployment

- **GIVEN** a new version is deployed while the player has a saved pet
- **WHEN** the player opens or reloads the app
- **THEN** the new version loads
- **AND** the pet and its progress are preserved

### Requirement: Negative or excessive elapsed time is handled

The app SHALL ignore negative elapsed time and SHALL cap forward catch-up at 24 hours, so changing the device clock cannot create invalid state or unbounded decay.

#### Scenario: Clock moved far forward

- **GIVEN** the device clock is set 30 days ahead
- **WHEN** the app applies catch-up
- **THEN** no more than 24 hours of decay is applied

#### Scenario: Clock moved backwards

- **GIVEN** the device clock is moved backwards by a day
- **WHEN** the app applies catch-up
- **THEN** needs do not increase from the negative interval

### Requirement: Privacy by default

The app SHALL NOT collect analytics, telemetry, or personal data in the MVP, and SHALL make it clear that pet data is stored only on the device.

#### Scenario: No tracking requests

- **GIVEN** the app is running
- **WHEN** the player uses the core game loop
- **THEN** no analytics or tracking requests are sent

### Requirement: Reset warning covers local storage

Before resetting a pet, the app SHALL warn that the pet is stored only on the device and that resetting or clearing browser data permanently deletes it.

#### Scenario: Reset warning

- **GIVEN** a pet exists
- **WHEN** the player opens the reset confirmation
- **THEN** the confirmation states that the pet and progress will be permanently deleted
- **AND** it states that the data exists only on this device

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
