import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { navForProfile } from "@/lib/auth/menu";
import { requireStaff } from "@/lib/auth/session";
import { signOut } from "@/app/admin/login/actions";

/**
 * Never indexed, whatever the site-wide switch says.
 *
 * Hardcoded rather than read from `seo_defaults`: turning the site live is one
 * boolean, and no value of it may ever make the admin crawlable.
 */
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The signed-in admin.
 *
 * `/admin/login` deliberately sits outside this route group — a login screen
 * inside a layout that requires a session would redirect to itself.
 *
 * The session is established here rather than in each page. The middleware
 * already turned anonymous requests away, but it cannot read a profile, so it
 * does not know a role: this is the first point at which "who is asking" is
 * actually known, and the menu is resolved from it.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { profile, email, role } = await requireStaff();

  return (
    <AdminShell
      groups={navForProfile(profile, role)}
      user={{
        name: profile.full_name || (email ?? "Signed in"),
        email,
        role: role.label,
      }}
      signOutAction={signOut}
    >
      {children}
    </AdminShell>
  );
}
