"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveArticle } from "@/lib/actions/admin/content";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { Checkbox, FormMessage, Select, TextArea, TextInput } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { UploadField } from "./UploadField";
import { useToast } from "./ToastProvider";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { slugify } from "@/lib/utils";
import { NEWS_CATEGORIES } from "@/types";
import type { NewsArticle } from "@/types";

/**
 * Article editor.
 *
 * The body is a Markdown subset rather than a rich-text HTML editor: the
 * renderer produces React elements, so there is no path from stored content to
 * raw HTML injection. Preview renders through exactly the same renderer as the
 * public page.
 */
export function NewsForm({ article }: { article: NewsArticle | null }) {
  const router = useRouter();
  const toast = useToast();
  const boundAction = saveArticle.bind(null, article?.id ?? null);
  const [state, formAction] = useActionState(boundAction, IDLE_FORM_STATE);
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(article));
  const [body, setBody] = useState(article?.body ?? "");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") {
      router.push("/admin/news");
      router.refresh();
    }
  }, [state, toast, router]);

  return (
    <>
      <form action={formAction} noValidate className="space-y-8">
        {state.status === "error" ? (
          <FormMessage tone="error" title="Not saved">
            {state.message}
          </FormMessage>
        ) : null}

        <fieldset className="space-y-6">
          <legend className="u-eyebrow mb-6">Article</legend>

          <TextInput
            id="title"
            label="Title"
            required
            defaultValue={article?.title ?? ""}
            maxLength={160}
            onChange={(e) => {
              if (!slugTouched) setSlug(slugify(e.currentTarget.value));
            }}
            error={state.fieldErrors.title}
          />

          <TextInput
            id="slug"
            label="Web address"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.currentTarget.value);
            }}
            hint="Appears in the URL: /news/your-slug"
            error={state.fieldErrors.slug}
          />

          <Select
            id="category"
            label="Category"
            required
            defaultValue={article?.category ?? "Club News"}
            options={NEWS_CATEGORIES.map((value) => ({ value, label: value }))}
            error={state.fieldErrors.category}
          />

          <TextArea
            id="excerpt"
            label="Excerpt"
            required
            rows={3}
            maxLength={400}
            defaultValue={article?.excerpt ?? ""}
            hint="Shown on the news index and used as the default meta description."
            error={state.fieldErrors.excerpt}
          />

          <TextArea
            id="body"
            label="Body"
            required
            rows={20}
            value={body}
            onChange={(e) => setBody(e.currentTarget.value)}
            hint="Markdown subset: # headings, **bold**, *italic*, `code`, - lists, 1. lists, > quotes, --- rules and [links](https://example.com). Raw HTML is shown as plain text, never rendered."
            error={state.fieldErrors.body}
          />

          <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
        </fieldset>

        <fieldset className="space-y-6 border-t border-ash pt-8">
          <legend className="u-eyebrow mb-6">Cover image</legend>
          <UploadField
            id="cover"
            label="Cover photograph"
            area="news"
            namePath="coverImagePath"
            nameUrl="coverImageUrl"
            initialPath={article?.coverImagePath}
            initialUrl={article?.coverImageUrl}
          />
          <TextInput
            id="coverImageAlt"
            label="Image description"
            defaultValue={article?.coverImageAlt ?? ""}
            maxLength={200}
            error={state.fieldErrors.coverImageAlt}
          />
        </fieldset>

        <fieldset className="space-y-6 border-t border-ash pt-8">
          <legend className="u-eyebrow mb-6">Search &amp; social</legend>
          <TextInput
            id="seoTitle"
            label="SEO title"
            defaultValue={article?.seoTitle ?? ""}
            maxLength={70}
            hint="Defaults to the article title. Around 60 characters works best."
            error={state.fieldErrors.seoTitle}
          />
          <TextArea
            id="seoDescription"
            label="Meta description"
            rows={3}
            maxLength={180}
            defaultValue={article?.seoDescription ?? ""}
            hint="Defaults to the excerpt."
            error={state.fieldErrors.seoDescription}
          />
          <TextInput
            id="ogImageUrl"
            label="Social share image URL"
            type="url"
            defaultValue={article?.ogImageUrl ?? ""}
            hint="Defaults to the cover photograph."
            error={state.fieldErrors.ogImageUrl}
          />
        </fieldset>

        <fieldset className="space-y-6 border-t border-ash pt-8">
          <legend className="u-eyebrow mb-6">Publication</legend>
          <Checkbox
            id="published"
            label="Published — visible on the public site"
            defaultChecked={article?.published ?? false}
          />
        </fieldset>

        <div className="border-t border-ash pt-8">
          <SubmitButton
            label={article ? "Save article" : "Create article"}
            pendingLabel="Saving…"
            size="md"
          />
        </div>
      </form>

      <ArticlePreview open={previewOpen} onClose={() => setPreviewOpen(false)} body={body} />
    </>
  );
}

function ArticlePreview({
  open,
  onClose,
  body,
}: {
  open: boolean;
  onClose: () => void;
  body: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Preview" size="lg">
      <MarkdownPreview source={body} />
    </Modal>
  );
}

/** Client-side mirror of the server renderer's supported subset. */
function MarkdownPreview({ source }: { source: string }) {
  if (!source.trim()) {
    return <p className="text-sm text-smoke">Nothing to preview yet.</p>;
  }
  return (
    <div className="space-y-4">
      {source.split(/\n{2,}/).map((block, index) => {
        const heading = /^(#{1,3})\s+(.*)$/.exec(block.trim());
        if (heading) {
          return (
            <p key={index} className="font-display text-xl tracking-[0.04em] text-bone uppercase">
              {heading[2]}
            </p>
          );
        }
        return (
          <p key={index} className="text-sm leading-relaxed whitespace-pre-line text-mist">
            {block}
          </p>
        );
      })}
      <p className="border-t border-ash pt-4 text-xs text-smoke">
        This is a rough preview. Save as a draft and open the article to see the final rendering.
      </p>
    </div>
  );
}
