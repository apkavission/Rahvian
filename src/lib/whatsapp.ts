/**
 * Click-to-chat links, in one place.
 *
 * This is stage 1 of the messaging centre (spec §25.5) and it is worth being
 * precise about what that means, because the two stages are easy to confuse and
 * only one of them costs money.
 *
 * **Stage 1 — this file.** A `wa.me` link with the message already written.
 * Tapping it opens WhatsApp on the visitor's own phone with the text in the
 * box; they press send. There is no API, no account, no verification and no
 * per-message cost, because nothing is ever sent from a server — the link is
 * a link.
 *
 * **Stage 2 — not this file.** Sending a WhatsApp message *from* the panel
 * needs Meta's WhatsApp Business Cloud API: business verification, a phone
 * number that cannot also be used in the normal app, templates approved in
 * advance, and a per-conversation charge. That is phase 15, and nothing here
 * depends on it.
 *
 * The href was being built in three components with three copies of the same
 * `replace(/\D/g, "")`, none of which pre-filled anything. One copy now, and
 * the message is part of it — a link that opens an empty chat makes the visitor
 * write the first sentence, which is the sentence they are least willing to
 * write.
 */

/**
 * The fallback message, used when settings carry no template.
 *
 * `{context}` is replaced with what the visitor was looking at. The template is
 * editable in the admin because everything on this site is, and because the
 * right opening line is a matter of the owner's voice rather than a developer's
 * guess.
 */
export const DEFAULT_WHATSAPP_TEMPLATE = "Hi, I'd like to talk about {context}.";

/** Used when a page has nothing more specific to say about itself. */
export const GENERIC_CONTEXT = "a project";

/**
 * The shortest string of digits that can be a reachable number.
 *
 * A WhatsApp link needs the country code, and `wa.me` silently opens a broken
 * chat rather than erroring when it does not get one. Ten digits is an Indian
 * mobile with no country code — common, and exactly the mistake that produces a
 * link that looks fine and goes nowhere. Below twelve we would rather render no
 * button at all than one that fails after the tap.
 */
const MIN_DIGITS = 12;

/**
 * A `wa.me` address, or null when the number cannot make one.
 *
 * Null is a real answer and every caller must handle it: an unset number and a
 * number typed without its country code are both states this site can be in,
 * and both should mean "no WhatsApp button", not "a button that does nothing".
 */
export function whatsappHref(
  number: string | null | undefined,
  message?: string,
): string | null {
  if (!number) return null;

  const digits = number.replace(/\D/g, "");
  if (digits.length < MIN_DIGITS) return null;

  const base = `https://wa.me/${digits}`;
  const text = message?.trim();

  // `encodeURIComponent` and not `URLSearchParams`: the latter encodes a space
  // as `+`, which WhatsApp shows literally in the message box.
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/**
 * The message, with the page's own subject in it.
 *
 * A template with no `{context}` placeholder is returned as written — somebody
 * who deleted the placeholder meant to, and appending the context would undo
 * an edit they made on purpose.
 */
export function whatsappMessage(
  template: string | null | undefined,
  context?: string | null,
): string {
  const shape = template?.trim() || DEFAULT_WHATSAPP_TEMPLATE;
  const subject = context?.trim() || GENERIC_CONTEXT;

  return shape.replaceAll("{context}", subject).trim();
}

/** Both halves together, which is what every caller actually wants. */
export function whatsappLink(
  number: string | null | undefined,
  template: string | null | undefined,
  context?: string | null,
): string | null {
  return whatsappHref(number, whatsappMessage(template, context));
}

/**
 * The template as stored in settings, read defensively.
 *
 * `whatsapp_template` arrives with the migration in
 * `20260829000015_whatsapp_template.sql`, and by this project's convention a
 * migration is run by the owner in the Supabase SQL editor rather than by a
 * deploy. So this has to work on both sides of that: before it is run the
 * column is absent, the generated types do not carry it, and every button
 * falls back to `DEFAULT_WHATSAPP_TEMPLATE` — which is the same sentence the
 * column defaults to, so nothing changes visibly when the migration lands.
 *
 * The cast is the point rather than an oversight: the column genuinely may not
 * exist yet, and pretending otherwise would be a type that lies.
 */
export function whatsappTemplateOf(settings: unknown): string {
  const row = settings as { whatsapp_template?: string | null } | null | undefined;
  return row?.whatsapp_template?.trim() || DEFAULT_WHATSAPP_TEMPLATE;
}
