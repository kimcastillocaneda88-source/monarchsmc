import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Hidden below md; use for secondary data so mobile stays readable. */
  secondary?: boolean;
  align?: "left" | "right";
  className?: string;
}

/**
 * Responsive admin table.
 *
 * Above md it is a real <table> with a scroll container. Below md each row
 * becomes a stacked card with the column headers as inline labels, so admin
 * work is genuinely usable on a phone rather than a shrunken desktop grid.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
  actions,
  className,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  empty?: ReactNode;
  actions?: (row: T) => ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className={className}>
      {/* Desktop */}
      <div className="hidden overflow-x-auto border border-ash md:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-ash bg-charcoal">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 font-display text-[0.625rem] uppercase tracking-[0.2em] text-smoke",
                    column.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {column.header}
                </th>
              ))}
              {actions ? (
                <th scope="col" className="px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-ash/60 last:border-0 hover:bg-charcoal/60">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3.5 align-middle text-mist",
                      column.align === "right" ? "text-right" : "text-left",
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
                {actions ? <td className="px-4 py-3.5 text-right">{actions(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="space-y-px md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="border border-ash bg-charcoal/50 p-4">
            <dl className="space-y-2.5">
              {columns.map((column) => (
                <div key={column.key} className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 font-display text-[0.5625rem] uppercase tracking-[0.2em] text-smoke">
                    {column.header}
                  </dt>
                  <dd className="min-w-0 text-right text-sm text-mist">{column.render(row)}</dd>
                </div>
              ))}
            </dl>
            {actions ? <div className="mt-4 flex flex-wrap justify-end gap-2">{actions(row)}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
