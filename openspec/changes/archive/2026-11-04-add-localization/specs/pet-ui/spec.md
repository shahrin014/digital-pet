# Delta for Pet Interface

## ADDED Requirements

### Requirement: Settings access

The app SHALL provide a persistent gear button in the header of the main game screen that opens Settings in one tap. The button SHALL have a localized accessible name. The MVP SHALL NOT use a hamburger menu or drawer for Settings.

#### Scenario: Opening settings

- **GIVEN** the main game screen is displayed
- **WHEN** the player activates the gear button
- **THEN** Settings opens

#### Scenario: Keyboard access

- **GIVEN** the player uses only the keyboard
- **WHEN** focus reaches the gear button and the player activates it
- **THEN** Settings opens

#### Scenario: No hamburger navigation

- **GIVEN** the main game screen is displayed
- **THEN** no hamburger menu is shown for Settings
- **AND** Settings remains reachable from the gear button
