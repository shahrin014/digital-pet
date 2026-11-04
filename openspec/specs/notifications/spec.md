# Notifications Specification

## Purpose

Defines in-app reminders, optional browser notifications, quiet hours, and the limits the app must communicate about notification delivery.

## Requirements

### Requirement: In-app need reminders

While the app is open, the app SHALL show a reminder when any need falls below 30, SHALL show at most one reminder per need every 2 hours, and SHALL provide a way to dismiss the reminder without performing an action.

#### Scenario: Low fullness reminder

- **GIVEN** the app is open and fullness falls below 30
- **WHEN** no fullness reminder has been shown in the last 2 hours
- **THEN** an in-app reminder suggests feeding the pet
- **AND** the reminder can be dismissed

#### Scenario: Reminder rate limit

- **GIVEN** an energy reminder was shown 30 minutes ago
- **WHEN** energy is still below 30
- **THEN** no second energy reminder is shown yet

### Requirement: Quiet hours

The app SHALL suppress reminders during quiet hours, which default to 22:00 through 08:00 local time, and SHALL let the player change or disable quiet hours.

#### Scenario: Reminder during quiet hours

- **GIVEN** quiet hours are active
- **WHEN** a need falls below 30
- **THEN** no reminder is shown

#### Scenario: Quiet hours end

- **GIVEN** a need is still below 30 when quiet hours end
- **WHEN** the rate limit allows a reminder
- **THEN** a reminder may be shown after quiet hours end

### Requirement: Browser notifications are opt-in

Browser notifications SHALL be disabled by default, notification permission SHALL be requested only after the player explicitly enables them, and a denied permission SHALL leave browser notifications disabled without repeated permission prompts.

#### Scenario: Enabling browser notifications

- **GIVEN** browser notifications are disabled
- **WHEN** the player enables them in settings
- **THEN** the app requests notification permission
- **AND** browser notifications are enabled only if permission is granted

#### Scenario: Permission denied

- **GIVEN** the player previously denied notification permission
- **WHEN** the player opens notification settings
- **THEN** browser notifications remain disabled
- **AND** the app explains how to re-enable them in the browser
- **AND** no permission prompt is shown again automatically

### Requirement: Browser notification eligibility

When browser notifications are enabled and the app is running, the app SHALL apply the same low-need threshold, per-need rate limit, and quiet-hours rules to browser notifications as it applies to in-app reminders.

#### Scenario: Background tab notification

- **GIVEN** browser notifications are enabled, the app is open in a background tab, and it is outside quiet hours
- **WHEN** energy falls below 30 and no energy reminder was sent in the last 2 hours
- **THEN** a browser notification about low energy may be sent

#### Scenario: Quiet hours suppress browser notifications

- **GIVEN** browser notifications are enabled and quiet hours are active
- **WHEN** a need falls below 30
- **THEN** no browser notification is sent

### Requirement: Notification content and action

A notification SHALL identify the pet, name the need that needs attention, and suggest a care action. Activating it SHALL open or focus the app and highlight the relevant care action.

#### Scenario: Activating a notification

- **GIVEN** a browser notification about low energy is shown
- **WHEN** the player activates it
- **THEN** the app opens or comes to the foreground
- **AND** the sleep or wake action is highlighted

### Requirement: Delivery limits are stated honestly

The app SHALL state that browser notifications are best-effort and may not arrive while the app is closed, and SHALL NOT describe reminders as guaranteed.

#### Scenario: Notification settings copy

- **WHEN** the player views notification settings
- **THEN** the screen explains that reminders depend on the browser and device
- **AND** it does not promise delivery while the app is closed

### Requirement: Preferences are persisted

The app SHALL persist the browser-notification opt-in and quiet-hours settings and restore them on the next launch.

#### Scenario: Preferences survive reload

- **GIVEN** the player enabled browser notifications and disabled quiet hours
- **WHEN** the player reloads the app
- **THEN** browser notifications remain enabled
- **AND** quiet hours remain disabled
