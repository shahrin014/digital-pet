# Design: Delete Local Data

## Technical Approach

Two distinct actions share the settings danger zone:

- **Reset pet** calls `repository.deletePet()`, deletes only the pet record, clears reminder timestamps, and returns to adoption. Preferences remain in IndexedDB.
- **Delete local database** calls `repository.deleteDatabase()`, which closes the singleton connection, deletes the whole IndexedDB database, and then lets the repository reopen lazily on the next save.

## Architecture Decisions

### Decision: Delete the database, not just clear the store

Clearing every key would leave the database and schema behind. Deleting the database matches the player's expectation and exercises the same path as a fresh install. The repository's lazy `getDb()` recreates the object store on the next write.

### Decision: Separate reset from database deletion

Resetting a pet is a common, lower-consequence action. Keeping notification and quiet-hour preferences makes starting a new pet less repetitive. Deleting the database is the explicit "remove everything" option.

### Decision: Close the connection before deleting

IndexedDB deletion blocks while open connections exist. The repository closes its cached connection first. Other tabs can still block deletion, so the operation rejects after five seconds with a message asking the player to close other Digital Pet tabs.

### Decision: Clear app-owned localStorage

Reminder timestamps live in localStorage under the `digital-pet.` prefix. Both reset and database deletion clear these keys so a new pet does not inherit reminder throttles.

## Error Handling

- If deletion fails or is blocked, the settings dialog stays open and shows a `role="alert"` message.
- The in-memory pet remains usable. The repository reopens on the next save if the connection was closed.
- The delete confirmation is a second step; cancelling it leaves all data untouched.

## Testing

- Repository test: save a pet and preferences, call `deleteDatabase()`, verify both loads return empty/defaults and the repository can reopen.
- Manual/automated UI checks: reset keeps preferences; delete database returns to adoption with default preferences; blocked deletion shows an error.
- Existing engine tests remain unchanged because deletion is a storage/UI concern.

## Alternatives Considered

- **Clear all keys only:** simpler, but leaves the database behind and does not meet the "delete the local DB" request.
- **Delete without closing:** would block indefinitely or fail unpredictably.
- **Use `localStorage` for the pet:** avoids the database but violates the local-first IndexedDB design.
