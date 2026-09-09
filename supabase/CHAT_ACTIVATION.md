# Chat attachment activation

The UI uses the existing `chat_send_message` RPC, including `p_reply_to`, and
soft-deletes only the current sender's message through authenticated PATCH.
Attachment bodies store versioned metadata, not public file URLs. Files are
retrieved with the signed-in user's bearer token from a private bucket.

Server activation remains pending. Before running the bucket migration:

1. Confirm the application Supabase project and inspect chat membership schema,
   thread/message RLS, the send RPC and sender-only UPDATE permissions.
2. Create the private bucket with the 5,242,880-byte server limit.
3. Add storage policies matching the verified chat membership rules. INSERT must
   also require path segment 2 = auth.uid(); SELECT requires current membership;
   DELETE requires uploader ownership and membership. Never enable public access.
4. Verify member upload/download, nonmember denial, oversize rejection, sender
   deletion, recipient deletion denial and replies under actual authenticated users.

The migration deliberately grants no storage access before membership rules are
verified. A UI error reports this pending configuration instead of pretending a
file was sent. Code/static export checks do not substitute for these server checks.
