# Tab implementation and remaining activation work

This branch is a work in progress against the user's complete specification. It
is not evidence that every tab works on the live server. Do not merge or describe
it as production-complete before the blocking checks below are resolved.

## Changes prepared in this branch

- Restore owner request retrieval, pending/in-review/revision states and completed
  request history in the actual refresh override.
- Replace report summaries with detailed, filterable, searchable, exportable data
  tables for performance, messages, responses, requests and login/logout.
- Fix login report routing; calculate inactive sessions using the 30-minute rule.
- Expose immutable message snapshots, including the task data at send time.
- Prepare a real snapshot before message review; queue the same batch only after
  the user confirms. Never send mail as part of agent verification.
- Add default message channel to user editing; replace competing status/priority
  editors with the canonical tables and preserve system status labels/rules.
- Add alert/email setting editors with optimistic version checks. These depend on
  the proposed server settings table; missing server setup produces an error.
- Add task audit history access from Kanban/archive, dynamic date-filter calendars,
  shared full/filtered Excel actions, borders and matching warning labels.
- Add an actionable dashboard block from actual task/request/message records.

## Tab-by-tab coverage

| Tab | Code/data path | Verification still required |
| --- | --- | --- |
| Login/account settings | Existing Auth/profile handlers retained | Live sign-in, password change, avatar storage |
| Kanban/archive | Existing CRUD/request flow; refresh/history/export fixes | Owner versus manager RLS and approval-only writes |
| Calendar/Gantt | Existing day grid and sticky layout; shared task state | Browser interaction and owner data isolation |
| Pending requests | All three open states restored | Manager review, correction, rejection and return cycle |
| Request history | Refresh restored, immutable event timeline retained | Actual event and actor records |
| Approval chains | Existing configurable chain form retained | Atomic chain save, required people mapping, any/all route enforcement |
| Send message | Live recipient state and persisted preview snapshot | v2 RPC for custom text, server settings and dispatch |
| Sent messages | Both channel delivery records and snapshot detail | Live queue and delivery statuses |
| Response tracking | Date/person/channel/status filters and selected channel reminders | v2 RPC, server reminder interval, inbound email mapping |
| Templates | Existing persisted template editor retained | Template version increments and complete variable rendering |
| Stickers | Existing five-state pack manager retained | Storage access and configured images |
| People/roles | Existing account handlers + default channel field | Admin edge function and privilege enforcement |
| Login activity/active sessions | Detailed records, timeout calculation and revoke action | Audit edge function, failed-login events, token revocation |
| Group/direct/task conversations | Prior live chat implementation retained | Private attachment policies, deletion, unread/pin/mention server behavior |
| Permanent/temporary vehicles | Existing CRUD retained; paged loading and filtered export | Live table permissions and document upload |
| Dashboard | Existing charts + needs-action records | Vehicle expiry and suspicious-login data integration |
| Performance report | Task-derived counts with shared temporal calculation | Compare with actual full authorized dataset |
| Message report | Complete delivery rows + fixed snapshots | Provider delivery receipt/webhook |
| Response report | Detailed reply records and response rate | Incoming email webhook or inbox integration |
| Request report | Detail + status counts + event timeline | Complete authorized records |
| Login report | Correct view, session details and metrics | Complete session/audit data |
| Status/priority settings | Canonical table editing and form option refresh | Server protection for system rules and custom-status lifecycle |
| Alert settings | Full policy editor prepared | Schema + enforcement of days, thresholds, interval, send hours and weekdays |
| Email settings | Nonsecret configuration editor prepared | Schema + worker wiring, validated sender and secrets |

## Server blockers

Supabase is connected in ChatGPT, but no Supabase executable tools are exposed in
this session. Therefore no database mutation, policy change, edge-function deploy,
or authenticated server test has been performed in this branch.

`supabase/schema-proposals/workspace-settings.sql` is a review proposal, not an
applied migration. It prepares the versioned settings table and the v2 batch RPC.
The saved policy still needs to be enforced in queue/worker logic before activation.
The existing private chat bucket proposal also does not grant storage access.

Remaining specification items include authenticated storage policies and task
attachments, chat pins/mentions/notifications, incoming email response ingestion,
reliable background queue scheduling/retry under uncertain provider responses,
authorization/audit verification, atomic chain editing, and comprehensive browser
and role-based end-to-end checks. No demo records or fake success counters were
inserted to make these areas look complete.

## Checks performed

- Syntax checks on all fourteen changed JavaScript sources.
- Behavioral checks for waiting/registered/overdue/warning/normal task states.
- Session timeout and explicit revocation state checks.
- Prior styled-XLSX readback verified RTL, B Nazanin, first-row freeze and rules;
  this branch additionally corrects the warning text and adds cell borders.

No claim of successful live delivery, upload, deletion, or all-tab browser operation
is made. Keep this branch as a draft until the server and remaining features are
completed and verified.

## 2026-09-09 follow-up: entry, forms, and password regression checks

- Added a pre-login management selector with company logo, three square cards,
  and disabled coming-soon process/quality departments.
- Reduced the date picker to 330px and added expandable status/priority creation
  forms backed by canonical option tables (live database constraints unverified).
- People refresh now updates the owner source. Managers see all people; inactive
  people remain labelled and unavailable for new assignment. Owners remain limited
  to themselves. This frontend behavior is not an RLS security test.
- Removed duplicate message/login report navigation entries; equivalent records
  remain available through Sent messages and Login activity.
- Fixed password update ordering: Auth must succeed before clearing the required
  change flag. Captured the form before awaiting so resetting it does not access
  a cleared event.currentTarget. Mandatory dialog Escape is blocked in the UI.
- Three behavioral regression tests pass: successful change, failed Auth update,
  and failed profile update (`node --test tests/password-change.test.cjs`).
- Six changed JavaScript files passed syntax checking.
- Opened the public live login in the browser. No authenticated manager/owner
  session was available; the live site is still main, not this draft branch.
- No passwords have been reset to 123456. Supabase execution tools are still not
  exposed. Bulk provisioning, server-enforced first-login password changes,
  database/storage role tests and every-tab live tests remain blocked/unverified.
