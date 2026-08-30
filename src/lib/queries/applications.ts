import "server-only";

import { cache } from "react";
import { createControlClient } from "@/lib/supabase/control";
import { APP_ACCESS_OPTIONS } from "@/lib/validation/users";

/**
 * The applications an account's access can be scoped to.
 *
 * ---------------------------------------------------------------------------
 * **Read from `control.applications`, with the built-in array as a fallback.**
 *
 * The array had already drifted twice by the time the registry existed:
 * `estate` was labelled "Task tracker" while what it actually unlocks is the
 * property demo, and the store demo was missing because it was built after the
 * array was written. A list that lives in a TypeScript file gets out of step
 * with the estate the moment somebody adds an application and edits five files
 * instead of six.
 *
 * ---------------------------------------------------------------------------
 * **The fallback is not defensive habit, it is a real state.**
 *
 * The migration creating that schema is run by hand, in the Supabase editor,
 * like every other migration here. Between deploying this code and running it,
 * every call fails — and a Users screen that renders no tick boxes at all is a
 * worse failure than one showing a label a week out of date. So a failure
 * falls back and says nothing, because there is nothing the person looking at
 * the screen can do about it.
 *
 * **Only applications that actually gate on this column are offered.** The task
 * tracker does not read `app_access` — it looks for a row in `portal.staff` —
 * so it carries `grants_access = false` and does not appear. A tick box that
 * changes nothing is worse than an absent one: somebody ticks it, nothing
 * happens, and the panel loses credibility it does not get back.
 */
export const applicationOptions = cache(
  async (): Promise<readonly { value: string; label: string; hint: string }[]> => {
    try {
      const supabase = await createControlClient();

      const { data, error } = await supabase
        .from("applications")
        .select("key, name, kind, is_active, grants_access, sort_order")
        .eq("is_active", true)
        .eq("grants_access", true)
        .order("sort_order");

      if (error || !data || data.length === 0) return APP_ACCESS_OPTIONS;

      return data.map((app) => ({
        value: app.key,
        label: app.name,
        hint: app.kind === "site" ? "This panel." : "",
      }));
    } catch {
      return APP_ACCESS_OPTIONS;
    }
  },
);
