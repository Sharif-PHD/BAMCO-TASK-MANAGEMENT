-- Keep Storage objects and metadata synchronized: destructive document writes must go through document-library Edge Function.
revoke insert, update, delete on public.documents from authenticated;
revoke delete on public.document_categories from authenticated;
