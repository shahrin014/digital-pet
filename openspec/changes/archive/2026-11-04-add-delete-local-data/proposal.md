# Proposal: Delete Local Data

## Why

Players need a clear, explicit way to remove everything Digital Pet stores on their device. The app stores a pet, its progress, preferences, and reminder timestamps in IndexedDB and localStorage, and there is currently no way to delete the database itself from the UI. Resetting a pet is useful, but it should not be the only way to wipe locally stored data.

## What Changes

- Add a **Delete local database** action in settings, separate from **Reset pet**.
- Change **Reset pet** to delete the pet and its progress while preserving notification and quiet-hour preferences.
- Make **Delete local database** remove the IndexedDB database, preferences, and reminder timestamps, then return to adoption with default preferences.
- Require a second confirmation that clearly states the deletion is permanent and device-local.
- Handle the case where another tab is holding the database open and show an actionable error.

## Scope

In scope:

- Settings UI for resetting a pet and deleting the local database.
- Repository support for closing and deleting the IndexedDB database.
- Clearing app-owned localStorage entries.
- State cleanup and return to the adoption flow.
- Tests for database deletion.

Out of scope:

- Cloud backup or restore.
- Exporting a save file before deletion.
- Clearing the browser's HTTP cache or unregistering the service worker.
- Deleting data from other browsers or devices.
- Recovering data after deletion.

## Approach

Use the existing settings danger zone for both actions. Reset calls `deletePet()` and leaves preferences intact. Delete local database calls a new repository method that closes the open IndexedDB connection, deletes the database, and rejects with a clear error if another tab keeps it open for more than five seconds. The app then clears reminder timestamps from localStorage, resets in-memory preferences to defaults, and returns to the adoption screen.

## Impact

- `pwa-platform`: new requirement for explicit local database deletion.
- `pet-adoption`: reset requirement clarified to preserve preferences.
- Storage repository: new `deleteDatabase()` operation.
- Settings dialog: two separate confirmations.
- README: documents both actions.
