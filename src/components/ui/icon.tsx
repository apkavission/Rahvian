import {
  Boxes,
  Code,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  PenTool,
  Rocket,
  Search,
  Settings2,
  Smartphone,
  Sparkles,
  TrendingUp,
  CircleCheck,
  CircleHelp,
  FileText,
  Image as ImageIcon,
  Images,
  Inbox,
  Menu,
  NotebookText,
  Tag,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Curated icon map.
 *
 * Icons are referenced from the database by name, so the set has to be a fixed
 * map rather than a dynamic import: importing all of lucide to satisfy an
 * arbitrary string would put hundreds of kilobytes into the bundle to render
 * six glyphs.
 *
 * Adding an icon means adding one line here. An unknown name falls back to a
 * neutral glyph rather than throwing, so a content edit can never break a page.
 */
const CONTENT_ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  "layout-dashboard": LayoutDashboard,
  smartphone: Smartphone,
  "settings-2": Settings2,
  sparkles: Sparkles,
  "trending-up": TrendingUp,
  megaphone: Megaphone,
  search: Search,
  "file-text": FileText,
  "pen-tool": PenTool,
  code: Code,
  "check-circle": CircleCheck,
  rocket: Rocket,
  "life-buoy": LifeBuoy,
  boxes: Boxes,
};

/**
 * The admin menu's own glyphs.
 *
 * Kept apart from the content set because they are not choices anyone makes:
 * the sidebar names them in `components/admin/nav.ts`, and offering "Enquiries"
 * as an icon for a service would be offering a mistake.
 */
const ADMIN_ICONS: Record<string, LucideIcon> = {
  inbox: Inbox,
  menu: Menu,
  image: ImageIcon,
  images: Images,
  notebook: NotebookText,
  tag: Tag,
  "help-circle": CircleHelp,
  users: Users,
  "user-cog": UserCog,
};

const ICONS: Record<string, LucideIcon> = { ...CONTENT_ICONS, ...ADMIN_ICONS };

/**
 * The icon names a content row may hold.
 *
 * Exported so the admin offers a picker over exactly what this file can render
 * rather than a free-text box. A name that is not in the map falls back to a
 * neutral glyph, which on the live page reads as an icon that silently went
 * missing — and nothing fails to say so.
 */
export const ICON_NAMES: string[] = Object.keys(CONTENT_ICONS);

export function Icon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Component = (name && ICONS[name]) || Boxes;
  return <Component className={className} aria-hidden />;
}
