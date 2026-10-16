// Supabase Storage for textbook PDFs. The browser uploads straight to Storage
// with a one-time signed URL (a PDF is far bigger than a request to our own
// server may be); only the server can read the files back.

const BUCKET = "books";
export const MAX_BOOK_BYTES = 50 * 1024 * 1024; // Supabase free plan limit per file

export const base = () => (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const anonKey = () => process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function storageEnabled(): boolean {
  return Boolean(base() && serviceKey() && anonKey());
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: serviceKey(), Authorization: `Bearer ${serviceKey()}`, ...extra };
}

let bucketReady: Promise<void> | null = null;

/** Creates the private "books" bucket once. */
function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const res = await fetch(`${base()}/storage/v1/bucket`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        id: BUCKET,
        name: BUCKET,
        public: false,
        file_size_limit: MAX_BOOK_BYTES,
        allowed_mime_types: ["application/pdf"],
      }),
    });
    // "Already exists" is fine.
    if (!res.ok && res.status !== 409) {
      const text = await res.text();
      if (!/already exists|Duplicate/i.test(text)) throw new Error(`bucket ${res.status}: ${text.slice(0, 200)}`);
    }
  })().catch((e) => {
    bucketReady = null;
    throw e;
  });
  return bucketReady;
}

/** A URL the browser can PUT one PDF to (valid for 2 hours), and the public key it needs. */
export async function signedUpload(path: string): Promise<{ url: string; apikey: string }> {
  await ensureBucket();
  const res = await fetch(`${base()}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: "{}",
  });
  if (!res.ok) throw new Error(`sign ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { url: string };
  return { url: `${base()}/storage/v1${data.url}`, apikey: anonKey() };
}

export async function downloadBook(path: string): Promise<Blob> {
  const res = await fetch(`${base()}/storage/v1/object/${BUCKET}/${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return await res.blob();
}
