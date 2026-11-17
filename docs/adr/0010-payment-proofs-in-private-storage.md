# 0010. Payment proofs in private storage, approval by name

Status: accepted

## Context

Payment is confirmed by an admin who checks a bank transfer. Today the student sends a screenshot of the transfer over chat, and the admin has to find it again when approving. We want that proof attached to the invoice, but it must never become a requirement: a student who paid cash or whose admin already knows the payment can still be approved without any file. We also want to show who approved a payment.

## Decision

- **Supabase Storage**, as the `storage` service in the compose stack (`storage-api`, local disk volume, reached through the gateway at `/storage/v1`). It pins the same version the Supabase CLI uses with this Postgres image, so `supabase start` behaves the same. The `migrate` service waits for it because the storage schema is created on its first start.
- **One private bucket**, `payment-proofs`: JPG, PNG or WebP, up to 5 MB, enforced by the bucket itself and by the form. Files live at `<student id>/<invoice id>/<file>`.
- **Who can do what is decided in Postgres.** A student can add a file only into their own folder, for their own invoice that is still waiting for payment, and can delete only such files. Admins can read every proof, the owner can read their own, nobody else can read any. Tutors and other students see nothing.
- **Linking is a database function.** `attach_payment_proof()` checks that the invoice is the student's and unpaid, that the path belongs to that invoice and that the file exists, stores `proof_path` and `proof_uploaded_at`, and returns the file it replaces so the app can delete it. Replacing is the only edit; there is no separate remove.
- **The browser never talks to storage.** The student's upload goes through a Server Action that uploads with the student's own session, then calls the function, and removes the new file again if linking fails. Images are shown through a route handler, `/proofs/<invoice id>`, which reads the invoice with the viewer's session (so row level security applies) and streams the file with `nosniff` and a private cache. The address carries the upload time so a replaced image is not served from cache.
- **Approval by name.** `invoices.paid_by` already records the admin; `invoice_approvals` is a small view that exposes only the admin's name, to admins and to the student who owns the invoice, because students cannot read admin profiles. The admin table, the Mark as paid dialog and the student's invoice show it.
- **Optional on both sides.** Marking as paid never looks at the proof. Once an invoice is paid or cancelled its proof is kept as a record and can no longer be changed.

## Consequences

- One more container and volume. Existing local databases need `docker compose down -v` once, because the storage role password is set when the database is first created.
- Files are served through the app, so each view costs one request to storage. That is fine for the expected volume and keeps access control in one place; thumbnails use the full image, which is capped at 5 MB.
- Admins cannot upload on behalf of a student, and there is no approve or reject step for the proof itself: the approval is the payment. Both are easy to add on top of the same bucket.
- Images only: PDF receipts are not accepted.
