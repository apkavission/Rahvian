import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import type { Tables } from "@/types/database";
import { cn } from "@/lib/utils";

/**
 * One pricing card.
 *
 * The row, not a view model built from it — the admin preview renders drafts,
 * which never pass through the public query, and both must produce the same
 * card or the preview is a drawing of the page rather than the page.
 *
 * The card itself, without the list item around it. The public section wraps it
 * in a `Reveal`; the preview wraps it in something that can carry a "not
 * published" marker. Owning the `<li>` here would mean neither could.
 */
export type PricingPlanRow = Pick<
  Tables<"pricing_plans">,
  | "id"
  | "name"
  | "tagline"
  | "price_from"
  | "currency"
  | "price_note"
  | "is_custom_quote"
  | "features"
  | "is_highlighted"
  | "cta_label"
  | "cta_href"
>;

export function PlanCard({ plan }: { plan: PricingPlanRow }) {
  const features = planFeatures(plan.features);

  return (
    <div
      className={cn(
        "surface-raised relative flex h-full flex-col rounded-2xl border p-7",
        plan.is_highlighted ? "border-accent" : "border-border",
      )}
    >
      {plan.is_highlighted && (
        <span className="absolute -top-3 left-7 inline-flex items-center rounded-full bg-accent px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-accent-fg">
          Most asked for
        </span>
      )}

      <h3 className="font-display text-lg font-semibold leading-snug">{plan.name}</h3>

      {plan.tagline && (
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{plan.tagline}</p>
      )}

      <p className="mt-6 font-display text-3xl font-semibold">{priceLabel(plan)}</p>

      {plan.price_note && (
        <p className="mt-2 text-xs leading-relaxed text-text-subtle">{plan.price_note}</p>
      )}

      {features.length > 0 && (
        <ul className="mt-7 flex-1 space-y-3 border-t border-border pt-7">
          {features.map((feature) => (
            <li key={feature} className="flex gap-3 text-sm leading-relaxed text-text-muted">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <ButtonLink
          href={plan.cta_href}
          variant={plan.is_highlighted ? "primary" : "secondary"}
          className="w-full"
        >
          {plan.cta_label}
        </ButtonLink>
      </div>
    </div>
  );
}

/**
 * What the card says where the number goes.
 *
 * "Custom quote" wins over a stored price: a plan flagged custom is one whose
 * cost genuinely depends on the brief, and printing a floor beside that flag
 * would be read as a promise.
 */
export function priceLabel(plan: Pick<PricingPlanRow, "is_custom_quote" | "price_from" | "currency">): string {
  if (plan.is_custom_quote) return "Custom quote";
  if (plan.price_from === null) return "Custom quote";

  const amount = Number(plan.price_from).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
  const symbol = plan.currency === "INR" ? "₹" : `${plan.currency} `;

  return `From ${symbol}${amount}`;
}

/** `features` is JSONB and legitimately anything. Non-strings are dropped. */
export function planFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== "",
  );
}
