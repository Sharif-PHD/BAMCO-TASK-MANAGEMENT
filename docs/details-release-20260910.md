# Interface details and account lifecycle

This release implements the requested group photos, internal delivery for people without email, current-month deadline reporting, sticker controls, logo spacing, and continuous action-bar borders. The home card layout is preserved.

The performance report counts completed work among tasks whose due dates fall in the current Persian month. Completion percentage uses that same cohort, including archived tasks; total assigned counts active and archived work. Completion timestamps do not change the cohort, and the heading no longer appends a month.

Primary action bars occupy the full interior width immediately below the title. The table module reuses the relocated bar instead of creating another Excel button. Sticker version/status selectors sit at the left, with a wider version field. Group creation/editing supports PNG/JPEG/WebP photos up to 5 MB, previews, removal, failed-upload retry without duplicate groups, and photos in the conversation list/header. The photo bucket remains private; only active managers write, and active members or managers read.

No-email profiles use portal delivery. Removing a contact email preserves the existing login identity. Newly created accounts receive a random 20-character temporary password and a login identifier displayed once to the creating manager. The response is not cacheable. Existing passwords are not changed by this release.

Login now uses one application entry path, immediately records the application session, and defers ordinary data loading during mandatory password change. Access/refresh tokens remain in memory. Concurrent requests share a refresh, late refresh cannot revive a cleared session, and logout calls the native Auth endpoint even if audit recording fails. The password form requires at least 12 characters and rejects trivial choices. This is form validation, not a replacement for hosted Auth password policy. CSP restricts script loading to the application origin and disallows inline script handlers, embedded objects and third-party form submissions; dynamic approval buttons use delegated handlers.

## Verification and limits

- The 110-test runtime suite passed; a subsequent integration test also passed using the actual login module, mandatory password form, session start and logout handlers. All HTTP responses in these browser-DOM tests are isolated fixtures.
- Production SQL checks verified photo save/remove, member read, nonmember denial, owner edit denial and cross-group path rejection. All SQL test changes were rolled back. No real email was sent and no real account password was changed for testing.
- Visual preview verified the full-width conversation toolbar, corrected Persian text, group-photo dialog and left-aligned sticker selectors. Further browser navigation encountered a browser connection timeout, so it is not counted as a completed all-page visual pass.
- The broad production authentication/RLS/session enforcement proposal was rejected by automatic approval review because its global policies, triggers and API hook could disrupt access. It was not applied and its dependent functions are not part of this release. The independently applied group-photo feature does not alter existing authentication or RLS policies.
- Further server-side session enforcement and hosted Auth configuration require a separately reviewed rollout with rollback and sign-in checks. This release is not a penetration-test certification or a claim that no bugs remain. External email delivery was not revalidated in this release.

Deployment gates: runtime CI, successful Pages deployment, matching published asset bytes, and verification of the deployed account-management function.
