# Workspace repair — 10 September 2026

The existing GitHub Pages application remains the deployment target. The home card layout and its assets are unchanged. Only the requested conversation labels and removal of email/alert settings affect its available shortcuts.

## Changes

- All 26 navigation destinations use the shared interior heading, toolbar, control sizes and one return-to-home button first in RTL order. Native action handlers remain attached when controls move. People editing opens a person picker when no row is selected.
- Removed the dashboard action center; charts occupy full rows. The final chart has separate labelled date/calendar controls and left-aligned apply/clear actions. Gantt days expand across the available width.
- Removed competing conversation renderers and the obsolete navigation fallback. One conversation module handles public/group/private/task screens, searchable member selection, group management, leave, manager deletion and explicit task recipient selection.
- Fixed public attachments: the production private bucket and authenticated member policies were missing. Upload keys support Persian filenames by keeping the original name in message metadata. Limit: 5 MiB. Message/thread deletion uses manager-only RPCs and preserves audit history through soft deletion.
- Extracted one template editor, removed competing handlers and nonfunctional formatting controls, unified its dialog, reloads saved data, surfaces read/save errors, and cancels late opening after navigation home.
- Shared interior styles cover stickers, account/password forms, approval-chain layout, calendar and conversation icon alignment. Email/alert settings routes are removed.
- Once per release, app data caches are cleared; sticker and sign-in caches are preserved. API business-data reads use no-store. Existing business records are not bulk-deleted.
- Task storage incorrectly required an owner for every status. Registered tasks now have no owner or dates; doing requires owner/start/end; awaiting response has no due date. UI and Excel import checks agree with these rules. A manager reopening an archived task with incomplete dates is prompted to complete the editor.
- Request submission was recorded twice by a trigger and RPC. The trigger now owns that event; new registered proposals have no owner.

## Verification

- `npm test`: 89 checks passed (0 failed). full shipped script order against isolated mocked API, including 26 routes with shipped CSS, return navigation, people CRUD/error feedback, full Excel exports, active session revocation, account and first-login password behavior, dashboard date controls, template save/reload/navigation races, all ten sticker upload pickers, approval-chain controls, Gantt navigation, task status controls and manual-message preview/queue/error handling.
- Production database rollback tests exercised real authenticated manager/owner policies: group message and attachment metadata access, nonmember denial, member leave, manager-only message/thread deletion, closed-thread write rejection and unassigned-task authorization.
- `tests/sql/task-rules-and-conversations.sql`: status invariants and unassigned task conversation permissions.
- `tests/sql/approval-workflow.sql`: actual configured chain, self-approval denial, final task creation, a single submission event and audit history. All fixtures rolled back.
- The admin-users Edge Function contract was inspected against the actual frontend edit payload. Real users were not added/edited/deleted for testing. Outbound email delivery is mocked; no test email was sent to people.

## Explicit limits and data issue

The cloud browser blocked the documented preview URL (`ERR_BLOCKED_BY_CLIENT`), so these are DOM/CSS and backend contract checks, not a fresh visual browser sign-off or a claim that every pixel and every external delivery was tested. The deployment and public asset checks are separate release gates.

One existing doing task lacks a due date. No deadline was invented or private task content copied into this public repository. The next edit requires completing its dates or selecting the appropriate status.
