"use client";

import { RecordForm } from "@/components/admin/record-form";
import { savePost } from "@/lib/actions/blog";
import type { MediaOption } from "@/lib/media/image-fields";
import { postFieldsets, type PickerOption } from "@/lib/records/blog";

/**
 * The middle column: one post, as a form.
 *
 * A thin wrapper over the shared record form, and it is a client component for
 * one specific reason - the field descriptors carry regular expressions, which
 * do not survive being serialised from a server component. The categories,
 * which are rows and are serialisable, come across as data.
 */
export function PostEditor({
  id,
  values,
  categories,
  assets,
}: {
  id: string;
  values: Record<string, unknown>;
  categories: PickerOption[];
  assets: MediaOption[];
}) {
  return (
    <RecordForm
      id={id}
      fieldsets={postFieldsets(categories, assets)}
      values={values}
      action={savePost}
      copy={{ save: "Save post", busy: "Saving the post", saved: "Post saved" }}
    />
  );
}
