/**
 * The `control` schema — the estate, as TypeScript.
 *
 * ---------------------------------------------------------------------------
 * **Its own file, and its own client, rather than a second schema bolted into
 * `database.ts`.**
 *
 * Two reasons, and the second is the one that matters. The obvious one is that
 * `database.ts` is the company website's schema and this is not part of it.
 *
 * The real one: every query in this application goes through a client pinned to
 * `company`. A screen that can read across all eight applications should have to
 * ask for a different client by name, so that reaching the estate is a visible
 * act in the code rather than something that happens by default. `createControlClient`
 * appears in four files and nowhere else, and that is checkable.
 *
 * ---------------------------------------------------------------------------
 * **Type aliases, not interfaces.** Supabase's `GenericSchema` requires each Row
 * to satisfy `Record<string, unknown>`. A type alias for an object gets an
 * implicit index signature; an interface does not. Written as interfaces, the
 * whole schema silently fails the constraint, the client falls back to `never`,
 * and the errors that appear point nowhere near the cause.
 */

export type ApplicationKind = "site" | "panel" | "demo";

export type ApplicationRow = {
  key: string;
  name: string;
  kind: ApplicationKind;
  base_url: string;
  db_schema: string | null;
  enquiry_table: string | null;
  message_table: string | null;
  grants_access: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type AuditRow = {
  id: number;
  at: string;
  actor_id: string | null;
  actor_email: string | null;
  app_key: string | null;
  action: string;
  subject: string | null;
  detail: Record<string, unknown>;
};

/** One row of the estate dashboard. */
export type EstateCount = {
  app_key: string;
  name: string;
  kind: ApplicationKind;
  base_url: string;
  reachable: boolean;
  enquiries: number | null;
  messages: number | null;
  variants: number | null;
};

/** One line of the unified inbox. */
export type InboxLine = {
  app_key: string;
  app_name: string;
  kind: string;
  who: string;
  summary: string;
  at: string;
};

export type ControlDatabase = {
  control: {
    Tables: {
      applications: {
        Row: ApplicationRow;
        Insert: Omit<ApplicationRow, "created_at"> & { created_at?: string };
        Update: Partial<ApplicationRow>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditRow;
        Insert: Omit<AuditRow, "id" | "at"> & { id?: number; at?: string };
        Update: Partial<AuditRow>;
        Relationships: [];
      };
    };

    Views: Record<never, never>;

    Functions: {
      /** Is the caller the estate's owner? */
      is_owner: { Args: Record<string, never>; Returns: boolean };
      /** Write one line into the audit log. */
      note: {
        Args: {
          p_action: string;
          p_app_key?: string | null;
          p_subject?: string | null;
          p_detail?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      /** How much is in each application, and whether it answers at all. */
      estate_counts: { Args: Record<string, never>; Returns: EstateCount[] };
      /** Everything anybody has written to any application, newest first. */
      estate_inbox: { Args: { p_limit?: number }; Returns: InboxLine[] };
    };

    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
