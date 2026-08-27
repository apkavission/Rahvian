"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * Accordion.
 *
 * The open/closed transition animates `grid-template-rows` from `0fr` to `1fr`.
 * That is a layout property, which the motion rules otherwise avoid — but a
 * height animation cannot be expressed any other way, it runs only on a
 * deliberate click, and one row of a grid is cheap to reflow. `max-height`
 * guesswork, the usual alternative, either clips long answers or eases
 * visibly wrong.
 *
 * Only one panel is open at a time: this is a scanning surface, and a reader
 * comparing two answers is better served by a fast switch than by a growing
 * wall of text.
 */
export function FaqList({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="space-y-px">
      {items.map((item) => {
        const open = openId === item.id;

        return (
          <div key={item.id} className="border-t border-border last:border-b">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`faq-panel-${item.id}`}
                onClick={() => setOpenId(open ? null : item.id)}
                className="group flex w-full items-start justify-between gap-6 py-6 text-left"
              >
                <span
                  className={cn(
                    "font-display text-lg font-medium transition-colors duration-[--duration-fast]",
                    open ? "text-text" : "text-text-muted group-hover:text-text",
                  )}
                >
                  {item.question}
                </span>
                <Plus
                  aria-hidden
                  className={cn(
                    "mt-1 size-5 shrink-0 text-text-subtle",
                    "transition-transform duration-[--duration-base] ease-[--ease-out]",
                    open && "rotate-45 text-accent",
                  )}
                />
              </button>
            </h3>

            <div
              id={`faq-panel-${item.id}`}
              role="region"
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-[--duration-base] ease-[--ease-out]",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="measure pb-7 leading-relaxed text-text-muted">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
