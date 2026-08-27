import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getServerEnv } from "@/lib/env";

/**
 * What the server can know about a form submission that the form did not tell it.
 *
 * The IP address is hashed with a secret salt and never stored raw. A salted
 * hash still supports the two things we actually need — counting submissions
 * from one source, and recognising a repeat abuser — while making the stored
 * value useless to anyone who copies the table. Without the salt an unsalted
 * hash would be trivially reversible, since the entire IPv4 space fits in a
 * rainbow table.
 */

export interface RequestContext {
  ipHash: string | null;
  userAgent: string | null;
  referrer: string | null;
}

export function hashValue(value: string): string {
  const { IP_HASH_SALT } = getServerEnv();
  return createHash("sha256")
    .update(`${IP_HASH_SALT}:${value.toLowerCase().trim()}`)
    .digest("hex");
}

/**
 * Reads the client IP from the proxy headers.
 *
 * `x-forwarded-for` is a comma-separated chain and the first entry is the
 * original client. It is trivially spoofable by the client, so this is good
 * enough for rate limiting a public form and is not relied on for anything
 * that grants access.
 */
function readClientIp(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip")?.trim() || null;
}

export async function getRequestContext(): Promise<RequestContext> {
  const headerList = await headers();
  const ip = readClientIp(headerList);

  return {
    ipHash: ip ? hashValue(ip) : null,
    userAgent: headerList.get("user-agent")?.slice(0, 500) ?? null,
    referrer: headerList.get("referer")?.slice(0, 500) ?? null,
  };
}
