import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Form primitives.
 *
 * Every control is bound to a real <label>, and errors/hints are wired through
 * aria-describedby with aria-invalid so screen readers announce them. Errors
 * are also prefixed with a visible marker so state is never colour-only.
 */

const CONTROL =
  "w-full border bg-charcoal px-4 py-3 text-sm text-bone placeholder:text-smoke/70 " +
  "transition-colors duration-200 " +
  "focus:border-gold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-[invalid=true]:border-danger";

export function Label({
  htmlFor,
  children,
  required,
  className,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "block font-display text-[0.6875rem] uppercase tracking-[0.2em] text-mist",
        className,
      )}
    >
      {children}
      {required ? (
        <span className="ml-1 text-gold" aria-hidden="true">
          *
        </span>
      ) : (
        <span className="ml-2 text-[0.625rem] tracking-[0.16em] text-smoke">(optional)</span>
      )}
    </label>
  );
}

export function FieldError({ id, children }: { id: string; children?: string | null }) {
  if (!children) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-xs leading-relaxed text-danger">
      <span aria-hidden="true">▲</span>
      <span>{children}</span>
    </p>
  );
}

export function FieldHint({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="text-xs leading-relaxed text-smoke">
      {children}
    </p>
  );
}

interface FieldShellProps {
  id: string;
  label: string;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
}

export function Field({ id, label, error, hint, required, className, children }: FieldShellProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children(describedBy, Boolean(error))}
      <FieldHint id={hintId}>{hint}</FieldHint>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

export type TextInputProps = Omit<ComponentPropsWithoutRef<"input">, "id" | "className"> & {
  id: string;
  label: string;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
};

export function TextInput({ id, label, error, hint, className, required, ...rest }: TextInputProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required} className={className}>
      {(describedBy, invalid) => (
        <input
          {...rest}
          id={id}
          name={rest.name ?? id}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(CONTROL, "min-h-12 border-ash")}
        />
      )}
    </Field>
  );
}

export type TextAreaProps = Omit<ComponentPropsWithoutRef<"textarea">, "id" | "className"> & {
  id: string;
  label: string;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
};

export function TextArea({ id, label, error, hint, className, required, rows = 6, ...rest }: TextAreaProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required} className={className}>
      {(describedBy, invalid) => (
        <textarea
          {...rest}
          id={id}
          name={rest.name ?? id}
          rows={rows}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(CONTROL, "resize-y border-ash leading-relaxed")}
        />
      )}
    </Field>
  );
}

export type SelectProps = Omit<ComponentPropsWithoutRef<"select">, "id" | "className"> & {
  id: string;
  label: string;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
};

export function Select({
  id,
  label,
  error,
  hint,
  className,
  required,
  options,
  placeholder,
  ...rest
}: SelectProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required} className={className}>
      {(describedBy, invalid) => (
        <div className="relative">
          <select
            {...rest}
            id={id}
            name={rest.name ?? id}
            required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(CONTROL, "min-h-12 appearance-none border-ash pr-10")}
          >
            {placeholder ? (
              <option value="">{placeholder}</option>
            ) : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-gold"
          >
            ▼
          </span>
        </div>
      )}
    </Field>
  );
}

export type CheckboxProps = Omit<ComponentPropsWithoutRef<"input">, "id" | "className" | "type"> & {
  id: string;
  label: ReactNode;
  error?: string | null;
  className?: string;
};

export function Checkbox({ id, label, error, className, ...rest }: CheckboxProps) {
  const errorId = `${id}-error`;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start gap-3">
        <input
          {...rest}
          type="checkbox"
          id={id}
          name={rest.name ?? id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-1 h-4.5 w-4.5 shrink-0 cursor-pointer appearance-none border border-ash bg-charcoal checked:border-gold checked:bg-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-mist">
          {label}
        </label>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

/** Form-level feedback banner, announced politely to assistive technology. */
export function FormMessage({
  tone,
  title,
  children,
}: {
  tone: "success" | "error" | "info";
  title: string;
  children?: ReactNode;
}) {
  const tones = {
    success: "border-success/50 bg-success/8 text-success",
    error: "border-danger/50 bg-danger/8 text-danger",
    info: "border-gold/40 bg-gold/5 text-gold",
  } as const;
  const marks = { success: "✓", error: "▲", info: "●" } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn("border px-5 py-4", tones[tone])}
    >
      <p className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.2em]">
        <span aria-hidden="true">{marks[tone]}</span>
        {title}
      </p>
      {children ? <div className="mt-2 text-sm leading-relaxed text-mist">{children}</div> : null}
    </div>
  );
}

/** Hidden honeypot + timing pair used by every public form. */
export function SpamTrap({ elapsedName = "elapsedMs" }: { elapsedName?: string }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor="website">Website</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      <input name={elapsedName} type="hidden" defaultValue="0" />
    </div>
  );
}
