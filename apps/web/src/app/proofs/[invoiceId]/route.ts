import { z } from "zod";
import { isProofType, PROOF_BUCKET } from "@/lib/proof";
import { createClient } from "@/lib/supabase/server";

const notFound = () => new Response("Not found", { status: 404 });

/** Serves a payment proof to the admin or the student who owns the invoice, as decided by row level security. */
export async function GET(_: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const invoiceId = z.uuid().safeParse((await params).invoiceId);
  if (!invoiceId.success) return notFound();

  const db = await createClient();
  const { data: invoice } = await db
    .from("invoices")
    .select("proof_path")
    .eq("id", invoiceId.data)
    .maybeSingle();
  if (!invoice?.proof_path) return notFound();

  const { data: file } = await db.storage.from(PROOF_BUCKET).download(invoice.proof_path);
  if (!file) return notFound();

  return new Response(file, {
    headers: {
      "Content-Type": isProofType(file.type) ? file.type : "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
