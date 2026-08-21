"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createGalleryItem,
  deleteGalleryItem,
  setGalleryApproval,
  setGalleryFeatured,
  updateGalleryItem,
} from "@/lib/actions/admin/media";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { Checkbox, FormMessage, Select, TextArea, TextInput } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { UploadField, type UploadResult } from "./UploadField";
import { ActionButton } from "./ActionButton";
import { useToast } from "./ToastProvider";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GALLERY_CATEGORIES } from "@/types";
import type { GalleryItem } from "@/types";

const CATEGORY_OPTIONS = GALLERY_CATEGORIES.map((value) => ({ value, label: value }));

/** Upload + metadata in a single step. */
export function GalleryUploadForm() {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction] = useActionState(createGalleryItem, IDLE_FORM_STATE);
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [handled, setHandled] = useState<typeof state | null>(null);

  // Adjusting state during render — React's documented alternative to
  // resetting state from an effect, which would cause a cascading re-render.
  // Bumping the key remounts the form so the file input and fields clear.
  if (state !== handled) {
    setHandled(state);
    if (state.status === "success") {
      setUploaded(null);
      setFormKey((key) => key + 1);
    }
  }

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") router.refresh();
  }, [state, toast, router]);

  return (
    <form key={formKey} action={formAction} noValidate className="space-y-6">
      {state.status === "error" ? (
        <FormMessage tone="error" title="Not saved">
          {state.message}
        </FormMessage>
      ) : null}

      <UploadField
        id="gallery-file"
        label="Photograph"
        area="gallery"
        namePath="storagePath"
        nameUrl="imageUrl"
        onUploaded={setUploaded}
        hint="JPEG, PNG, WebP or AVIF, up to 8 MB. The file type is verified on the server."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextInput id="title" label="Title" required maxLength={140} error={state.fieldErrors.title} />
        <Select
          id="category"
          label="Category"
          required
          defaultValue="brotherhood"
          options={CATEGORY_OPTIONS}
          error={state.fieldErrors.category}
        />
      </div>

      <TextInput
        id="altText"
        label="Image description"
        required
        maxLength={200}
        hint="Describe what is in the photograph, for people using a screen reader."
        error={state.fieldErrors.altText}
      />

      <TextArea id="caption" label="Caption" rows={3} maxLength={400} error={state.fieldErrors.caption} />

      <div className="space-y-4">
        <Checkbox id="approved" label="Approved — visible in the public gallery" />
        <Checkbox id="featured" label="Featured on the homepage (requires approval)" />
      </div>

      <SubmitButton label="Add photograph" pendingLabel="Saving…" size="md" />
      {!uploaded ? (
        <p className="text-xs text-smoke">Upload a file before saving.</p>
      ) : null}
    </form>
  );
}

/** Row controls: approve, feature, edit metadata, delete. */
export function GalleryItemControls({ item }: { item: GalleryItem }) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <ActionButton
          action={setGalleryApproval.bind(null, item.id, !item.approved)}
          label={item.approved ? "Unpublish" : "Approve"}
          variant={item.approved ? "ghost" : "primary"}
        />
        <ActionButton
          action={setGalleryFeatured.bind(null, item.id, !item.featured)}
          label={item.featured ? "Unfeature" : "Feature"}
          variant="secondary"
          disabled={!item.approved && !item.featured}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <ActionButton
          action={deleteGalleryItem.bind(null, item.id)}
          label="Delete"
          variant="danger"
          confirm={{
            title: `Delete “${item.title}”?`,
            description: "The photograph and its stored file are removed permanently.",
            confirmLabel: "Delete photograph",
            destructive: true,
          }}
        />
      </div>

      <GalleryEditModal item={item} open={editing} onClose={() => setEditing(false)} />
    </>
  );
}

function GalleryEditModal({
  item,
  open,
  onClose,
}: {
  item: GalleryItem;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const bound = updateGalleryItem.bind(null, item.id);
  const [state, formAction] = useActionState(bound, IDLE_FORM_STATE);

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") {
      onClose();
      router.refresh();
    }
  }, [state, toast, router, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Edit photograph" size="md">
      <form action={formAction} noValidate className="space-y-6">
        <TextInput
          id={`title-${item.id}`}
          name="title"
          label="Title"
          required
          defaultValue={item.title}
          maxLength={140}
          error={state.fieldErrors.title}
        />
        <TextInput
          id={`alt-${item.id}`}
          name="altText"
          label="Image description"
          required
          defaultValue={item.altText}
          maxLength={200}
          error={state.fieldErrors.altText}
        />
        <TextArea
          id={`caption-${item.id}`}
          name="caption"
          label="Caption"
          rows={3}
          defaultValue={item.caption ?? ""}
          maxLength={400}
        />
        <Select
          id={`category-${item.id}`}
          name="category"
          label="Category"
          required
          defaultValue={item.category}
          options={CATEGORY_OPTIONS}
        />
        <Checkbox
          id={`approved-${item.id}`}
          name="approved"
          label="Approved"
          defaultChecked={item.approved}
        />
        <Checkbox
          id={`featured-${item.id}`}
          name="featured"
          label="Featured on the homepage"
          defaultChecked={item.featured}
        />
        <SubmitButton label="Save" pendingLabel="Saving…" size="sm" />
      </form>
    </Modal>
  );
}

export function GalleryBadges({ item }: { item: GalleryItem }) {
  return (
    <div className="flex flex-wrap gap-2">
      {item.approved ? <Badge tone="success">Approved</Badge> : <Badge tone="warning">Pending</Badge>}
      {item.featured ? <Badge tone="gold">Featured</Badge> : null}
      <Badge tone="muted">{item.category}</Badge>
    </div>
  );
}
