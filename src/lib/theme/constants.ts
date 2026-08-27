export const THEME_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

/** localStorage key holding the visitor's explicit choice, if any. */
export const THEME_STORAGE_KEY = "as-theme";

/** Attribute stamped on <html>. Only ever "light" or "dark" — never "system". */
export const THEME_ATTRIBUTE = "data-theme";

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

/**
 * Blocking script injected into <head>, before any paint.
 *
 * This is the only way to avoid a flash of the wrong theme: the attribute has
 * to be on <html> before the browser paints the first frame, which rules out
 * anything that runs after hydration.
 *
 * Kept dependency-free and small on purpose. It is inlined into the document,
 * so every byte here is on the critical path of every page.
 *
 * Wrapped in try/catch because localStorage throws outright in some privacy
 * modes; a theme preference is never worth breaking the page for.
 */
export const themeInitScript = `
(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)},a=${JSON.stringify(THEME_ATTRIBUTE)};
var s=localStorage.getItem(k);
var m=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
document.documentElement.setAttribute(a,m);
document.documentElement.style.colorScheme=m;
}catch(e){}})();
`
  .replace(/\n/g, "")
  .trim();
