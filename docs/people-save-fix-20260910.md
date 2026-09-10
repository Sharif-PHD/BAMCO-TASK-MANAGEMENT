# People editing: preserve the manager's database identity

The previous UI checks mocked `admin-users` and did not exercise the production profile trigger. They were insufficient to establish that a real name or role edit could be saved.

The deployed function patched `profiles` using its service-role credential. In production, `private.guard_profile_update()` executes as the caller and checks `private.is_manager()`. The old request failed with `permission denied for schema private`; it also did not carry the manager's `auth.uid()`. Service-role access to the table does not bypass trigger logic.

The function now verifies the active manager as before, uses the manager's incoming JWT and the public API key for profile writes, and retains server-only service credentials for Auth Admin operations. Existing RLS, trigger guards and JWT verification are unchanged. No database grants or schema changes were added.

Both editing and account creation require one saved profile row from `return=representation` before reporting success. Database errors are surfaced. Omitted CC addresses are preserved, and changing an existing account's email no longer resets its password. The frontend uses the shared request timeout/error handler and refreshes the table before closing the edit form.

Verification:

- The added Edge Function tests execute the actual TypeScript handler with an isolated HTTP boundary. Four tests failed against the old source; all five pass with the repair. They check the manager/service credential boundaries, edit and create, unchanged passwords, preserved CC addresses, empty writes, database failures and rejected nonmanager/inactive/unauthenticated callers.
- `tests/sql/people-edit-manager-context.sql` ran against production: it reproduced the old service-role rejection, saved a manager's name/role/active/channel edits and read them back, rejected owner self-promotion, and allowed own display-name changes. Every change was rolled back, including timestamps.
- The form test clicks the actual Save button. The complete runtime suite passed: 104 tests, zero failures.
- Production `admin-users` version 8 is active with `verify_jwt: true`. No real person's account was permanently modified for testing, and no email was sent.

Deployment and public asset verification are separate release gates. No new visual layout was introduced by this repair.
