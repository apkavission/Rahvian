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

/**
 * One person on the portal and tracker staff list.
 *
 * A different list from `company.profiles`, and the reason this type exists at
 * all: the portal has always kept its own, with a comment on the table saying
 * "a person who joins or leaves must be added or removed in both". Two lists
 * kept in step by remembering to. `has_company_account` is that duplication
 * made visible on screen rather than left to be discovered.
 */
export type PortalStaffRow = {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string | null;
  role_key: string | null;
  /** The master role's own label, so the screen never invents a word for it. */
  role_label: string;
  is_active: boolean;
  menu_extra: string[];
  menu_denied: string[];
  tracker_menu_extra: string[];
  tracker_menu_denied: string[];
  has_company_account: boolean;

  /* Dates, for birthdays and anniversaries in the tracker. Nullable: nobody
     is required to give either. */
  date_of_birth: string | null;
  joined_on: string | null;

  /**
   * Whether this person actually holds the estate.
   *
   * Read from their WEBSITE role, which is what `control.is_owner()` checks —
   * not from `role_key` beside it. When the two disagree somebody reads
   * "Developer" on every screen they use while holding the power to manage all
   * staff and read every salary slip.
   */
  holds_the_estate: boolean;

  /**
   * What they are called, which is not what they may do.
   *
   * A role decides access; a designation goes on an offer letter and beside a
   * name on a project team. Needing a new role to give somebody a new title is
   * how permissions drift, which is why these are two columns.
   */
  designation_key: string | null;
  designation_label: string | null;
};

/** One title that can be given. */
export type DesignationRow = {
  key: string;
  label: string;
  /** What kind of work it describes, for grouping a long list on a form. */
  family: string;
  sort_order: number;
};

/** A kind of document that can be issued to a member of staff. */
export type StaffDocumentKind = {
  key: string;
  label: string;
  /** Whether it is meaningless without a month, or without a sum. */
  needs_period: boolean;
  needs_amount: boolean;
  signs_by_default: boolean;
};

/** One document already issued to somebody. */
export type StaffDocumentRow = {
  id: string;
  kind_key: string;
  kind_label: string;
  title: string;
  amount: string | null;
  period_start: string | null;
  period_end: string | null;
  issued_on: string;
  /** When it was paid, for money going out — a salary. */
  paid_on: string | null;
  paid_method: string | null;
  has_file: boolean;
  note: string | null;
};

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

/**
 * What a demo link can be in, said once.
 *
 * The state is worked out in the database rather than on either screen, because
 * there are two screens — the estate's and the demo's own — and a link that is
 * "expired" in one place and "closed" in the other is a support conversation
 * nobody can win.
 */
export type DemoLinkState = "live" | "expired" | "revoked" | "used_up";

/** One business inside one demo, as the estate sees it. */
export type DemoVariantRow = {
  app_key: string;
  app_name: string;
  base_url: string;
  variant_id: string;
  slug: string;
  name: string;
  business_name: string;
  /** `link_only` unless somebody deliberately opened it to the world. */
  visibility: "public" | "link_only";
  is_active: boolean;
  /** Links for this business that would work if opened right now. */
  live_links: number;
};

/** One invitation to open a demo. */
export type DemoLinkRow = {
  app_key: string;
  app_name: string;
  base_url: string;
  link_id: string;
  token: string;
  label: string;
  note: string | null;
  variant_name: string;
  variant_slug: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  view_count: number;
  max_views: number | null;
  last_seen_at: string | null;
  state: DemoLinkState;
};

/**
 * One opening of one link.
 *
 * Coarse on purpose — a browser and where they came from. No address and
 * nothing that follows a person between visits: this is a record of our own
 * sales link being used, not surveillance of somebody we are pitching to.
 */
export type DemoOpenRow = {
  opened_at: string;
  user_agent: string | null;
  referrer: string | null;
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
      /** The portal and tracker staff list. Empty to anybody who is not an owner. */
      portal_staff: { Args: Record<string, never>; Returns: PortalStaffRow[] };
      /** The titles that can be given. Empty to anybody who is not an owner. */
      designations: { Args: Record<string, never>; Returns: DesignationRow[] };

      /** The kinds of document that can be issued to a person. */
      staff_document_kinds: {
        Args: Record<string, never>;
        Returns: StaffDocumentKind[];
      };

      /** What has already been issued to one person. */
      staff_documents: {
        Args: { p_staff_id: string };
        Returns: StaffDocumentRow[];
      };

      /**
       * Issue one.
       *
       * What each kind requires is decided by that kind's own row, not by this
       * signature — so a kind added next month is enforced without a deploy.
       */
      issue_staff_document: {
        Args: {
          p_staff_id: string;
          p_kind_key: string;
          p_title: string;
          p_amount?: number | null;
          p_period_start?: string | null;
          p_period_end?: string | null;
          p_paid_on?: string | null;
          p_paid_method?: string | null;
          p_note?: string | null;
        };
        Returns: string;
      };
      /** Change one person's portal/tracker role, menus or active state. */
      set_portal_staff: {
        Args: {
          p_id: string;
          p_role_key?: string | null;
          p_is_active?: boolean | null;
          p_menu_extra?: string[] | null;
          p_menu_denied?: string[] | null;
          p_tracker_menu_extra?: string[] | null;
          p_tracker_menu_denied?: string[] | null;
        };
        Returns: undefined;
      };

      /* ------------------------------------------------- who may open a demo */

      /** Every business in every demo, and whether it is open to the world. */
      demo_variants: { Args: Record<string, never>; Returns: DemoVariantRow[] };

      /** Every link ever issued, across every demo. Dead ones included. */
      demo_links: { Args: { p_app_key?: string | null }; Returns: DemoLinkRow[] };

      /** Every opening of one link, newest first. */
      demo_link_opens: {
        Args: { p_app_key: string; p_link_id: string };
        Returns: DemoOpenRow[];
      };

      /**
       * Issue one, and return the token.
       *
       * The only time the token is handed back. After this it exists in the
       * demo's own table and in whatever the link was pasted into.
       */
      create_demo_link: {
        Args: {
          p_app_key: string;
          p_variant_id: string;
          p_label: string;
          p_days: number;
          p_max_views?: number | null;
          p_note?: string | null;
        };
        Returns: string;
      };

      /** Close a link now. The row stays; it is the record of what was sent. */
      revoke_demo_link: { Args: { p_app_key: string; p_link_id: string }; Returns: undefined };

      /** Open one business to anybody with the address, or close it again. */
      set_demo_visibility: {
        Args: { p_app_key: string; p_variant_id: string; p_public: boolean };
        Returns: undefined;
      };
    };

    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
