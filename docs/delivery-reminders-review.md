# Delivery reminder repair — Portal verified

Status: deployed; live Portal delivery, recipient inbox and tracking refresh verified. Real email remains deferred while the provider is unavailable.

## Confirmed root causes

- `phase3-response-tracking.js` discarded selected delivery identities and passed only deduplicated recipient IDs to `prepare_workflow_messages`.
- The previous preparation RPC queried current tasks and the recipient's latest send date. It did not retain the selected original deliveries or their original subjects/snapshots.
- `mark_message_reminders` incremented every supplied delivery unconditionally. It had no success evidence, response eligibility check, or idempotency record. The frontend invoked it only after the entire email request succeeded, so partial batches were not reconciled individually.
- Replied rows could be visually selected, although the send path filtered them.
- Existing deployed queue code does query reminder emails (no kind exclusion), personalizes from joined snapshots and claims rows atomically. No evidence yet establishes a live SMTP/provider failure: the initial inspection contained only two reminder portal deliveries (one sent and one cancelled), no reminder email deliveries.

## Changes

`prepare_message_reminders` accepts delivery IDs, a channel and a request UUID. An authorization-checked private implementation validates all originals and email availability transactionally, locks originals in order, builds one immutable reminder snapshot per recipient with only selected originals, and persists the original-to-reminder mapping. Its dedicated versioned text template includes recipient, subject, send date, delivery and thread identity. It does not include current task data or CC recipients.

Repeated request UUIDs reuse the same batch and reject changed inputs. A one-minute cooldown and pending-delivery check reject overlapping accidental requests. Queue retries reuse the batch, and successful channels are not resent. The preview shows each recipient separately.

Database delivery completion reconciles mappings exactly once after **all chosen channels** for a recipient succeed. Both-channel partial success leaves the original count unchanged. The compatibility `mark_message_reminders` RPC now reports recorded completions instead of incrementing counters. Original reply fields remain untouched. Replied/cancelled originals are rejected again before queue/claim.

The email worker rejects blank subject/body and reports a per-row claim error while continuing other recipients. After provider acceptance, the database must still persist success; a failed persistence remains ambiguous/processing and must not be retried blindly. This is not an exactly-once guarantee across a third-party email provider.

The existing automatic message renderer already places risk and waiting sections under one parent. Their minimum flex basis now preserves readable table width, with stacking and local table scrolling on narrow screens. The welcome card was not modified by this patch.

## Verification

- Three isolated frontend tests pass: valid/replied selection and delivery-ID preview; confirmation double click; missing-email preflight; cancelled exclusion.
- Targeted shared renderer and atomic email-worker tests pass. Updated the worker test's fixture to include the now-required subject/body.
- Migration plus `tests/sql/delivery-reminders.sql` passed in a transaction on the configured database, then rolled back. Checks include original A/B isolation, three separate recipients, Portal recipient record creation, both-channel count gating, injected email failure, simulated provider success, repeated reconciliation, original response preservation, idempotency, missing email and recipient RLS. These SQL tests simulate JWT role context; they do not prove browser authentication or actual email delivery.
- The broader 20-test legacy run initially had 16 failures, including jsdom scrollTo errors, stale control-order assertions and the incomplete worker fixture. The unchanged baseline reproduces all other 15 failures (5/20 pass). The one additional worker failure was its blank-content fixture, corrected and re-tested successfully.
- Live browser on 2026-09-12: selected original delivery 72 for the signed-in manager, prepared and confirmed Portal reminder 94. The result reported one success, zero failures/pending. Original reminder_count changed from 0 to 1, last_reminded_at was populated, response stayed awaiting after the tracking refresh. The recipient inbox displayed the reminder with original subject and delivery 72. Replied delivery 36 was unchanged. Email is currently unavailable and the user explicitly deferred real email testing.

## Remaining acceptance work

Migration, frontend and queue worker are deployed. Portal end-to-end acceptance is verified above. Real Email and both-channel external delivery remain pending provider restoration; simulated provider success in SQL is not evidence of a real email. Frontend failure/selection/idempotency and transactional integration scenarios pass.


## Five-template repair (2026-09-12)

Root cause was RPC/snapshot generation: task_status_view returns localized due_state labels (`دوره هشدار`, `دیرکرد`), while prepare_workflow_messages counted English values. Both counts were always zero and state1 was selected for everyone. The recipient UI independently calculated dates, so it disagreed with the generated message.

message_task_state now normalizes status once; the live-recipient view and snapshot RPC use it. All five existing email_templates are preserved. Waiting tasks add a table marker even for state1, whose template has no task marker. The shared browser/email renderer also handles old localized snapshots and no-marker templates, preserving purple waiting colors and per-task links. Empty waiting sections are omitted. Task navigation closes its preview, clears Kanban search/filters, reveals the correct page and sets selection without toggling an already-selected row off.

Verification: rollback SQL integration tests exercised all five actual template branches, UI/snapshot agreement for every active recipient, task-owner isolation, and waiting marker insertion. Reminder integration scenarios passed again with this RPC. Live own-recipient preview showed state3 text, 2 overdue tasks, 1 warning and 2 waiting tasks. Clicking waiting task 12855 selected its Kanban row; the observed preview-overlay defect was then fixed and covered by a DOM regression test. Shared rendering is deployed with the email worker; real email testing is deferred by the user.
