-- Prepare private attachment storage. Run only on the app's confirmed project.
-- No client access is granted here: existing chat membership policies must be
-- inspected before adding matching SELECT/INSERT/DELETE storage policies.
-- Paths used by the client: <thread_id>/<auth.uid()>/<uuid>/<filename>.
-- INSERT must verify both thread membership and the second path segment;
-- SELECT must verify current membership; DELETE must verify owner + membership.
-- Do not use public thread metadata visibility as a membership substitute.
BEGIN;
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-attachments', 'chat-attachments', false, 5242880)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880;
COMMIT;
