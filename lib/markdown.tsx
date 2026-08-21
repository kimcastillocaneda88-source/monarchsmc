import { Fragment, type ReactNode } from "react";

/**
 * A deliberately small Markdown subset rendered to React elements.
 *
 * Editorial bodies are authored by trusted editors, but they are still stored
 * in Firestore where a compromised account could inject markup. Rendering to
 * React nodes rather than HTML strings means there is no dangerouslySetInnerHTML
 * anywhere in the app: raw HTML in the source is displayed as literal text.
 *
 * Supported: # ## ### headings, paragraphs, - and 1. lists, > quotes, ---,
 * **bold**, *italic*, `code`, and [text](https://link).
 */

type Inline = { key: string; node: ReactNode };

const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|\/)[^\s)]+\))/g;

function isSafeHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//");
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: Inline[] = [];
  let cursor = 0;
  let index = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > cursor) {
      out.push({ key: `${keyPrefix}-t${index++}`, node: text.slice(cursor, start) });
    }
    const key = `${keyPrefix}-m${index++}`;
    if (token.startsWith("**")) {
      out.push({ key, node: <strong className="font-semibold text-bone">{token.slice(2, -2)}</strong> });
    } else if (token.startsWith("`")) {
      out.push({
        key,
        node: (
          <code className="rounded-xs bg-steel px-1.5 py-0.5 font-mono text-[0.9em] text-goldbright">
            {token.slice(1, -1)}
          </code>
        ),
      });
    } else if (token.startsWith("[")) {
      const label = token.slice(1, token.indexOf("]"));
      const href = token.slice(token.indexOf("](") + 2, -1);
      out.push({
        key,
        node: isSafeHref(href) ? (
          <a
            href={href}
            className="text-gold underline decoration-gold/40 underline-offset-4 transition hover:decoration-gold"
            {...(href.startsWith("/") ? {} : { rel: "noopener noreferrer", target: "_blank" })}
          >
            {label}
          </a>
        ) : (
          label
        ),
      });
    } else {
      out.push({ key, node: <em className="italic">{token.slice(1, -1)}</em> });
    }
    cursor = start + token.length;
  }

  if (cursor < text.length) {
    out.push({ key: `${keyPrefix}-t${index++}`, node: text.slice(cursor) });
  }

  return out.map((item) => <Fragment key={item.key}>{item.node}</Fragment>);
}

export function renderMarkdown(source: string): ReactNode {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ");
    blocks.push(
      // Spacing is on the block itself rather than an adjacent-sibling rule:
      // `[&+p]:mt-5` only spaced consecutive paragraphs, so a paragraph
      // immediately after a heading collided with it.
      <p key={`p${key++}`} className="mt-5 leading-relaxed text-mist first:mt-0">
        {renderInline(text, `p${key}`)}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const { ordered, items } = list;
    const className = ordered
      ? "mt-5 list-decimal space-y-2 pl-6 text-mist first:mt-0 marker:text-gold"
      : "mt-5 list-disc space-y-2 pl-6 text-mist first:mt-0 marker:text-gold";
    blocks.push(
      ordered ? (
        <ol key={`l${key++}`} className={className}>
          {items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(item, `li${key}-${i}`)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={`l${key++}`} className={className}>
          {items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(item, `li${key}-${i}`)}
            </li>
          ))}
        </ul>
      ),
    );
    list = null;
  };

  const flushQuote = () => {
    if (quote.length === 0) return;
    blocks.push(
      <blockquote
        key={`q${key++}`}
        className="mt-6 border-l-2 border-gold/60 pl-5 font-display text-xl leading-snug tracking-wide text-bone uppercase first:mt-0"
      >
        {renderInline(quote.join(" "), `q${key}`)}
      </blockquote>,
    );
    quote = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      flushAll();
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushAll();
      blocks.push(<hr key={`h${key++}`} className="mt-8 border-steel" />);
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      const level = heading[1]?.length ?? 1;
      const text = heading[2] ?? "";
      const classes =
        level === 1
          ? "mt-10 font-display text-3xl tracking-wide text-bone uppercase first:mt-0 sm:text-4xl"
          : level === 2
            ? "mt-10 font-display text-2xl tracking-wide text-bone uppercase first:mt-0 sm:text-3xl"
            : "mt-8 font-display text-xl tracking-[0.08em] text-gold uppercase first:mt-0";
      const Tag = (level === 1 ? "h2" : level === 2 ? "h3" : "h4") as "h2" | "h3" | "h4";
      blocks.push(
        <Tag key={`hd${key++}`} className={classes}>
          {renderInline(text, `hd${key}`)}
        </Tag>,
      );
      continue;
    }

    const quoted = /^>\s?(.*)$/.exec(line);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1] ?? "");
      continue;
    }

    const unordered = /^[-*]\s+(.*)$/.exec(line);
    if (unordered) {
      flushParagraph();
      flushQuote();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(unordered[1] ?? "");
      continue;
    }

    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      flushParagraph();
      flushQuote();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1] ?? "");
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  flushAll();
  return <>{blocks}</>;
}

/** Plain-text projection of a markdown body, for meta descriptions and previews. */
export function markdownToPlainText(source: string, max = 300): string {
  const text = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*`_~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
