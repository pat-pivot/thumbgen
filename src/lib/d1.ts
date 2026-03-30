const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const D1_DATABASE_ID = process.env.D1_DATABASE_ID!;
const CF_EMAIL = process.env.CLOUDFLARE_EMAIL!;
const CF_API_KEY = process.env.CLOUDFLARE_API_KEY!;

const D1_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;

export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const body: Record<string, unknown> = { sql };
  if (params && params.length > 0) {
    body.params = params;
  }

  const res = await fetch(D1_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Email": CF_EMAIL,
      "X-Auth-Key": CF_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!data.success) {
    const errMsg = data.errors?.[0]?.message || "D1 query failed";
    throw new Error(errMsg);
  }

  return (data.result?.[0]?.results as T[]) || [];
}
