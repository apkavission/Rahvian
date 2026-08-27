import type { Metadata } from "next";
import Link from "next/link";
import { AssetPreview } from "@/components/admin/asset-preview";
import { requireMenu } from "@/lib/auth/session";
import {
  darkVariantOptions,
  getAdminMedia,
  getAdminMediaItem,
  mediaFolders,
  mediaUsageMap,
} from "@/lib/queries/media-admin";
import { mediaToValues } from "@/lib/records/media";
import { storageConfigured } from "@/lib/storage/r2";
import { cn } from "@/lib/utils";
import { AssetEditor } from "./asset-editor";
import { AssetList } from "./asset-list";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = {
  title: "Media",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The media library.
 *
 * The same three columns as every content screen — the list, the selected
 * record as a form, the preview beside it — with the third column doing
 * something no other screen's does: it is where `docs/image-rules.md` is
 * enforced rather than described. Every file is shown whole, uncropped,
 * uncovered, at its own aspect ratio and never larger than it is, on white and
 * on near-black. A library that previews with a cropped thumbnail is a library
 * that hides the exact defect it exists to catch.
 *
 * Folders are a filter above the list, as pages are on the FAQ screen. A folder
 * comes into existence by someone filing something in it — `media.folder` is
 * free text with a default — so the list is derived from the rows rather than
 * declared in code.
 *
 * Nothing here can change a file's bytes. Replacing an image is an upload: a
 * new row, a new key and a new address, with the old one left reachable for
 * anything still pointing at it. That is what lets `/media/[...]` cache for a
 * year and never hand back something stale.
 */
export default async function MediaScreen({ searchParams }: Props) {
  await requireMenu("media");

  const query = await searchParams;

  const [assets, folders, usage] = await Promise.all([
    getAdminMedia(),
    mediaFolders(),
    mediaUsageMap(),
  ]);

  const requestedFolder = typeof query.folder === "string" ? query.folder : null;
  const folder =
    requestedFolder === ""
      ? ""
      : (folders.find((entry) => entry.folder === requestedFolder)?.folder ?? "");

  const shown = folder ? assets.filter((asset) => asset.folder === folder) : assets;

  const requested = typeof query.asset === "string" ? query.asset : null;
  const selectedSummary = shown.find((asset) => asset.id === requested) ?? shown[0] ?? null;

  // Read in full, and its options, only once one is selected.
  const [selected, darkVariants] = selectedSummary
    ? await Promise.all([
        getAdminMediaItem(selectedSummary.id),
        darkVariantOptions(selectedSummary.id),
      ])
    : [null, []];

  const configured = storageConfigured();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header>
        <h1 className="font-display text-2xl font-semibold">Media</h1>
        <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
          Every image on the site lives here. Files are stored in a private
          bucket and served through this application, so nothing is a public URL
          the moment it exists. Alt text is required at upload — not as a
          nag, but because it is trivial to write while looking at the picture
          and expensive to add to a hundred images later.
        </p>
      </header>

      {!configured && (
        <div className="mt-6 rounded-xl border border-warning/40 bg-warning-soft p-4">
          <h2 className="text-sm font-semibold">File storage is not configured</h2>
          <p className="measure mt-1.5 text-sm leading-relaxed text-text-muted">
            The four <span className="font-mono text-xs">R2_*</span> variables
            are missing from <span className="font-mono text-xs">.env.local</span>.
            Existing files still list here; nothing can be uploaded or served
            until they are set and the server is restarted.
          </p>
        </div>
      )}

      {folders.length > 1 && (
        <nav aria-label="Filter by folder" className="mt-7 -mx-1 overflow-x-auto px-1 pb-1">
          <ul className="flex w-max gap-2">
            <FolderPill
              href="/admin/media?folder="
              label="Everything"
              count={assets.length}
              active={folder === ""}
            />
            {folders.map((entry) => (
              <FolderPill
                key={entry.folder}
                href={`/admin/media?folder=${encodeURIComponent(entry.folder)}`}
                label={entry.folder}
                count={entry.count}
                active={folder === entry.folder}
              />
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            Newest first
          </h2>
          <div className="mt-3">
            <AssetList
              assets={shown.map((asset) => ({
                id: asset.id,
                filename: asset.filename,
                url: asset.public_url,
                alt: asset.alt_text,
                folder: asset.folder,
                width: asset.width,
                height: asset.height,
                mimeType: asset.mime_type,
                usedAs: usage.get(asset.id)?.places ?? [],
              }))}
              selectedId={selected?.id ?? null}
              emptyLabel={
                folder
                  ? "Nothing filed here yet. Upload the first file below."
                  : "No files yet. Upload the first one below."
              }
            />
            <UploadForm folder={folder || "general"} />
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <>
              <div className="surface-raised rounded-2xl border border-border p-6">
                {/*
                  Keyed on the asset, so selecting another one remounts the
                  form. Without it React would reuse the component and keep the
                  first file's alt text in state — one picture described as
                  another, which on this screen is the one thing that must not
                  happen.
                */}
                <AssetEditor
                  key={selected.id}
                  id={selected.id}
                  values={mediaToValues(selected)}
                  darkVariants={darkVariants}
                />
              </div>

              <UsedAs places={usage.get(selected.id)?.places ?? []} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">
                {folder ? "Nothing filed here yet" : "The library is empty"}
              </h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Upload a file on the left and it will open here, with its real
                size read from the file itself rather than from what your
                computer called it.
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          {selected ? (
            <AssetPreview
              asset={{
                id: selected.id,
                url: selected.public_url,
                filename: selected.filename,
                alt: selected.alt_text,
                mimeType: selected.mime_type,
                sizeBytes: Number(selected.size_bytes),
                width: selected.width,
                height: selected.height,
                folder: selected.folder,
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Where the selected file is used.
 *
 * Under the form rather than in the delete dialog alone, because the question
 * "can I change this file's name" and the question "what would deleting it
 * break" have the same answer, and only one of them opens a dialog.
 */
function UsedAs({ places }: { places: string[] }) {
  return (
    <div className="mt-6 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-text-subtle">
      {places.length > 0 ? (
        <>
          Currently used as {places.join(", ")}. Renaming is safe — the address
          resolves on the id in front of the name — but deleting would leave
          every one of those with no image.
        </>
      ) : (
        <>
          Nothing is using this file. Deleting it would change nothing on the
          site.
        </>
      )}
    </div>
  );
}

function FolderPill({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
          active
            ? "border-accent bg-accent-soft text-text"
            : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text",
        )}
      >
        {label}
        <span
          className={cn(
            "font-mono text-[0.65rem]",
            count === 0 ? "text-text-subtle" : "text-text-muted",
          )}
        >
          {count}
        </span>
      </Link>
    </li>
  );
}
