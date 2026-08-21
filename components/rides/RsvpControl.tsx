"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitRsvp } from "@/lib/actions/rsvp";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { FormMessage } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/States";
import type { RsvpResponse } from "@/types";

const OPTIONS: Array<{ value: RsvpResponse; label: string }> = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "not_going", label: "Not going" },
];

/**
 * RSVP control for active members.
 *
 * Rendered as a radio group so it is operable with arrow keys and announced
 * correctly. Selecting an option calls the server action, which writes a single
 * document keyed by ride + uid.
 */
export function RsvpControl({
  rideId,
  initialResponse,
}: {
  rideId: string;
  initialResponse: RsvpResponse | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<RsvpResponse | null>(initialResponse);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  function choose(value: RsvpResponse) {
    if (pending || value === selected) return;
    const previous = selected;
    setSelected(value);
    setFeedback(null);

    startTransition(async () => {
      const result = await submitRsvp(rideId, value);
      if (result.ok) {
        track({ name: "ride_rsvp", response: value });
        setFeedback({ tone: "success", message: result.message ?? "Response recorded." });
        router.refresh();
      } else {
        setSelected(previous);
        setFeedback({ tone: "error", message: result.message ?? "We could not record your response." });
      }
    });
  }

  return (
    <div className="border border-ash bg-charcoal/60 p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-sm tracking-[0.2em] text-bone uppercase">Your response</h3>
        {pending ? <Spinner /> : null}
      </div>

      <div
        role="radiogroup"
        aria-label="RSVP for this ride"
        className="mt-5 grid gap-px bg-ash sm:grid-cols-3"
      >
        {OPTIONS.map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => choose(option.value)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 bg-ink px-4 font-display text-[0.6875rem] tracking-[0.2em] uppercase transition-colors disabled:opacity-60",
                active ? "bg-gold text-ink" : "text-mist hover:text-bone",
              )}
            >
              {active ? <span aria-hidden="true">✓</span> : null}
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-smoke">
        You can change your response at any time. Only one response is kept per member.
      </p>

      {feedback ? (
        <div className="mt-5">
          <FormMessage tone={feedback.tone} title={feedback.tone === "success" ? "Saved" : "Not saved"}>
            {feedback.message}
          </FormMessage>
        </div>
      ) : null}
    </div>
  );
}
