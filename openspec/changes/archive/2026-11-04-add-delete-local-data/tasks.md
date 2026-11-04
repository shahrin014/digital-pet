# Tasks

## 1. Storage

- [x] 1.1 Add `deleteDatabase()` to the repository interface.
- [x] 1.2 Close the cached IndexedDB connection before deleting.
- [x] 1.3 Add a five-second blocked-tab timeout with an actionable error.
- [x] 1.4 Add a repository test covering deletion and reopening.

## 2. Application State

- [x] 2.1 Change reset to delete only the pet and keep preferences.
- [x] 2.2 Add a delete-database handler that resets in-memory state to defaults.
- [x] 2.3 Clear `digital-pet.` localStorage entries on both actions.
- [x] 2.4 Show the success message in the adoption flow.

## 3. Settings UI

- [x] 3.1 Explain that reset keeps notification and quiet-hour preferences.
- [x] 3.2 Add a separate delete-local-database section with a second confirmation.
- [x] 3.3 Warn that deletion is permanent and device-local.
- [x] 3.4 Show deletion failures inline in the dialog.

## 4. Verification

- [x] 4.1 Run `npm test` (49 passing).
- [x] 4.2 Run `npm run typecheck`.
- [x] 4.3 Run `npm run build`.
- [x] 4.4 Run `openspec validate --all`.
