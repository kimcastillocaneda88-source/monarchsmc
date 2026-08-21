"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updatePageContent, updateSiteSettings } from "@/lib/actions/admin/settings";
import { IDLE_FORM_STATE } from "@/lib/actions/form-state";
import { Checkbox, FormMessage, TextArea, TextInput } from "@/components/ui/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { UploadField } from "./UploadField";
import { useToast } from "./ToastProvider";
import type { EditableSection } from "@/lib/content/defaults";
import type { PageContent, SiteSettings } from "@/types";

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction] = useActionState(updateSiteSettings, IDLE_FORM_STATE);

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") router.refresh();
  }, [state, toast, router]);

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" ? (
        <FormMessage tone="error" title="Not saved">
          {state.message}
        </FormMessage>
      ) : null}

      <fieldset className="space-y-6">
        <legend className="u-eyebrow mb-6">Identity</legend>
        <TextInput
          id="clubName"
          label="Club name"
          required
          defaultValue={settings.clubName}
          maxLength={80}
          error={state.fieldErrors.clubName}
        />
        <TextInput
          id="tagline"
          label="Tagline"
          defaultValue={settings.tagline ?? ""}
          maxLength={160}
          error={state.fieldErrors.tagline}
        />
      </fieldset>

      <fieldset className="space-y-6 border-t border-ash pt-8">
        <legend className="u-eyebrow mb-6">Contact</legend>
        <p className="text-sm leading-relaxed text-smoke">
          Anything left blank is hidden from the site rather than shown as empty.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextInput
            id="contactEmail"
            label="Contact email"
            type="email"
            defaultValue={settings.contactEmail ?? ""}
            error={state.fieldErrors.contactEmail}
          />
          <TextInput
            id="contactPhone"
            label="Contact phone"
            type="tel"
            defaultValue={settings.contactPhone ?? ""}
            error={state.fieldErrors.contactPhone}
          />
          <TextInput
            id="locationLabel"
            label="Based in"
            defaultValue={settings.locationLabel ?? ""}
            maxLength={120}
            className="sm:col-span-2"
            hint="A town or region. Do not publish a private address."
            error={state.fieldErrors.locationLabel}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-6 border-t border-ash pt-8">
        <legend className="u-eyebrow mb-6">Social</legend>
        <p className="text-sm leading-relaxed text-smoke">
          Only profiles the club actually operates. Icons appear in the footer only when a valid URL
          is present here.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextInput
            id="instagram"
            label="Instagram URL"
            type="url"
            defaultValue={settings.social.instagram ?? ""}
            placeholder="https://instagram.com/…"
            error={state.fieldErrors.instagram}
          />
          <TextInput
            id="facebook"
            label="Facebook URL"
            type="url"
            defaultValue={settings.social.facebook ?? ""}
            placeholder="https://facebook.com/…"
            error={state.fieldErrors.facebook}
          />
          <TextInput
            id="youtube"
            label="YouTube URL"
            type="url"
            defaultValue={settings.social.youtube ?? ""}
            placeholder="https://youtube.com/…"
            error={state.fieldErrors.youtube}
          />
          <TextInput
            id="tiktok"
            label="TikTok URL"
            type="url"
            defaultValue={settings.social.tiktok ?? ""}
            placeholder="https://tiktok.com/…"
            error={state.fieldErrors.tiktok}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-6 border-t border-ash pt-8">
        <legend className="u-eyebrow mb-6">Membership</legend>
        <Checkbox
          id="applicationsOpen"
          label="Accepting membership applications"
          defaultChecked={settings.applicationsOpen}
        />
        <p className="text-sm leading-relaxed text-smoke">
          When this is off the join form is replaced with a notice, and the server rejects any
          application submitted anyway.
        </p>
      </fieldset>

      <div className="border-t border-ash pt-8">
        <SubmitButton label="Save settings" pendingLabel="Saving…" size="md" />
      </div>
    </form>
  );
}

/** Editable copy for one marketing page. */
export function PageContentForm({
  pageId,
  label,
  sections,
  page,
  uploadArea,
}: {
  pageId: string;
  label: string;
  sections: EditableSection[];
  page: PageContent | null;
  uploadArea: "gallery" | "news";
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction] = useActionState(updatePageContent, IDLE_FORM_STATE);

  useEffect(() => {
    if (state.status === "idle") return;
    toast.show(state.status === "success" ? "success" : "error", state.message);
    if (state.status === "success") router.refresh();
  }, [state, toast, router]);

  return (
    <form action={formAction} noValidate className="space-y-7">
      <input type="hidden" name="pageId" value={pageId} />

      {state.status === "error" ? (
        <FormMessage tone="error" title="Not saved">
          {state.message}
        </FormMessage>
      ) : null}

      <p className="text-sm leading-relaxed text-smoke">
        Leave a field blank to fall back to the shipped placeholder copy. Replace the placeholders
        with the club&apos;s own words — nothing here should state something the club has not said.
      </p>

      {sections.map((section) => {
        const value = page?.sections?.[section.key] ?? "";
        return section.multiline ? (
          <TextArea
            key={section.key}
            id={`${pageId}-${section.key}`}
            name={`section.${section.key}`}
            label={section.label}
            rows={7}
            maxLength={20000}
            defaultValue={value}
            hint={section.help}
            error={state.fieldErrors[`section.${section.key}`]}
          />
        ) : (
          <TextInput
            key={section.key}
            id={`${pageId}-${section.key}`}
            name={`section.${section.key}`}
            label={section.label}
            maxLength={300}
            defaultValue={value}
            hint={section.help}
            error={state.fieldErrors[`section.${section.key}`]}
          />
        );
      })}

      <div className="space-y-5 border-t border-ash pt-7">
        <UploadField
          id={`${pageId}-hero`}
          label={`${label} hero photograph`}
          area={uploadArea}
          namePath="heroImagePath"
          nameUrl="heroImageUrl"
          initialPath={page?.heroImagePath}
          initialUrl={page?.heroImageUrl}
          hint="Large landscape photograph. Used as the page's full-bleed background."
        />
        <TextInput
          id={`${pageId}-heroAlt`}
          name="heroImageAlt"
          label="Hero image description"
          defaultValue={page?.heroImageAlt ?? ""}
          maxLength={200}
        />
      </div>

      <SubmitButton label={`Save ${label.toLowerCase()} content`} pendingLabel="Saving…" size="sm" />
    </form>
  );
}
