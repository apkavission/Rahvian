/**
 * Renders a JSON-LD graph into the document.
 *
 * `</script>` appearing inside the serialised JSON would close this tag early
 * and let the rest of the payload run as markup. Any string reaching here is
 * ultimately database content, so the escape is not optional — replacing `<`
 * with its unicode escape keeps the JSON valid and identical to a parser while
 * making it impossible to terminate the element.
 *
 * `null` renders nothing, so callers can pass a builder's result straight
 * through without guarding first.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;

  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // The content is our own serialised object, never a user-supplied string.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
