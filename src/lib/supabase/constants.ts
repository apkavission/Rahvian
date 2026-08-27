/**
 * Postgres schema this application owns.
 *
 * One Supabase project hosts seven schemas: `company` (this app), `control`
 * (the super admin plane) and one per demo application. Every client sets
 * this, so a query can never accidentally reach another application's data.
 *
 * The schema must also be listed under Exposed schemas in the Supabase
 * dashboard (Project Settings -> API), otherwise PostgREST will not serve it.
 */
export const DB_SCHEMA = "company" as const;
