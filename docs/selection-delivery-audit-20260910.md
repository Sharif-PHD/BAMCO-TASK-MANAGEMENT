# Selection, delivery and interface repairs — 10 September 2026

This follow-up supersedes the verification limits in `workspace-audit-20260910.md` where noted below. The existing GitHub Pages site remains the deployment target; the home card markup and layout are preserved.

## User-visible repairs

- One selection controller owns table selection: click again to deselect, Ctrl/Command for multiple rows, Shift for a range and Escape to clear. People deletion accepts multiple selections; editing requires one person and explains invalid selections in the shared dialog.
- Excel exports use selected records when present and the complete dataset otherwise, including records outside the current filter or page. A competing Kanban export handler was removed. Explicit fills prevent black cells, dates are readable Persian text, and workbook fonts distinguish Persian and Latin text.
- B Nazanin regular/bold fonts are bundled, with Times New Roman for Latin text. Imports share the neutral export-button style. App notices and confirmations use a centered, app-styled dialog, without native browser-origin headings.
- Sessions register immediately after sign-in. Sticker states load in parallel and reuse cached images. Chart logical heights remain constant across repeated renders and high-density displays.
- Performance completion is tasks completed during the current Persian month divided by all tasks assigned to that person. A separate column counts their task-creation requests during that month. The report summary cards are removed.
- Applied approval chains can be edited. Saving creates a new active version; pending requests retain their original approval stages and audit history.
- Conversations show profile photos, aligned controls, clearer bubbles, member selection, search within loaded messages and editing of the sender's own text. Existing group membership, leave, manager deletion, task recipients and attachments remain connected. This is not a claim of complete Telegram feature parity.

## Message delivery

The uploaded reference package is a desktop Excel/Outlook application. Its five warning/overdue states and template placeholders are represented in the web workflow without executing that package.

One canonical preparation function now reads the same templates that the editor saves. Managers can choose internal delivery, email or both, and use a default template or custom text. Preview, inbox and email share an escaped report renderer with task tables and stickers. Internal replies remain connected to the original delivery in response tracking.

Queue processing claims deliveries atomically, reports partial failures, bounds retries and avoids treating an empty queue as successful delivery. An authenticated connection check performs no email send. The production migration is `20260910143355_unified_delivery_and_chain_editing`; the deployed `send-message-queue` function is version 3.

**External limitation:** the configured email provider returned a certificate hostname error (`NotValidForName`); a subsequent unauthenticated connection probe returned HTTP 502. Real email delivery has not been verified. No test email was sent to real recipients, no TLS check was disabled and no provider credentials were redirected. The configured Outlook reply-to address does not provide automatic inbound-mail ingestion; replies made inside the portal are linked and tested.

## Verification

- `npm test`: 99 passed, zero failed. Includes all 26 navigation destinations, shared toolbars, selection and exports, CRUD feedback, session timing, chart sizing, monthly report calculations, chain versioning, cached stickers, profile photos, text editing and email queue concurrency/failure handling.
- All 39 browser JavaScript files pass syntax checks; shared CSS parses successfully. No native `alert`, `confirm` or `prompt` calls remain in application JavaScript.
- An actual generated XLSX was read back with OpenPyXL: RTL layout, green header, white body, explicit nonblack conditional fills and B Nazanin/Times New Roman fonts were verified. Font metadata and required Persian glyphs were checked.
- Chrome visual checks used the shipped scripts and CSS with an isolated mock API: multi-selection and edit warning, navigation home, conversation/member picker, centered dialog, chain editing and repeated chart renders. Two visible CSS conflicts were corrected. The mock bootstrap was removed and the production entry point restored before release.
- `tests/sql/message-and-chain-editing.sql` passed against the production database inside a transaction that was rolled back. It checks template substitution, recipient deduplication, channel isolation, idempotent portal queueing, a linked portal reply, versioned chain stages, own-message editing and manager/owner permission boundaries. No test fixtures were retained.
- Earlier rollback tests cover task status rules, approval stages, self-approval denial, group/attachment permissions and manager-only deletion. Real production users were not modified for browser testing.

CI and public asset verification are release gates separate from these local and backend checks.
