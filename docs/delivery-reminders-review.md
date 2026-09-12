# Delivery reminder repair — pending live verification

Status: draft; not deployed or complete. No real email was sent in this session.

## Confirmed root causes

- `phase3-response-tracking.js` discarded selected delivery identities and passed only deduplicated recipient IDs to `prepare_workflow_messages`.
- The deployed preparation RPC queried current tasks and the recipient's latest send date. It did not retain the selected original deliveries or their original subjects/snapshots.
- `mark_message_reminders` incremented every supplied delivery unconditionally. It had no success evidence, response eligibility check, or idempotency record. The frontend invoked it only after the entire email request succeeded, so partial batches were not reconciled individually.
- Replied rows could be visually selected, although the send path filtered them.
- Existing deployed queue code does query reminder emails (no kind exclusion), personalizes from joined snapshots and claims rows atomically. No evidence yet establishes a live SMTP/provider failure: the database currently contains only two reminder portal deliveries (one sent and one cancelled), no reminder email deliveries.

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
- Live browser reached the manager login form. There is no authenticated manager session. No live reminder, recipient inbox inspection, real email/provider acceptance, desktop/mobile visual acceptance or post-send browser refresh has been verified.

## Remaining acceptance work

Deploy the migration and worker together with the frontend, then use an authenticated manager and designated test recipients to run all eight requested live scenarios. Verify recipient inbox/chat visibility, actual email acceptance and queue status, original counts after refresh, partial failure, and console/network errors. Do not mark complete until the real end-to-end reminder is verified.
