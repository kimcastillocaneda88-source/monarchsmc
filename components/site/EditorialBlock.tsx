import { Eyebrow, SectionHeading } from "@/components/ui/Typography";
import { renderMarkdown } from "@/lib/markdown";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

/**
 * A titled prose block driven by admin-editable content.
 * The body is rendered through the sanitising markdown renderer.
 */
export function EditorialBlock({
  eyebrow,
  title,
  body,
  index,
  className,
  reversed = false,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  index?: string;
  className?: string;
  reversed?: boolean;
}) {
  return (
    <div className={cn("grid gap-8 lg:grid-cols-12 lg:gap-16", className)}>
      <Reveal className={cn("lg:col-span-5", reversed && "lg:order-2")}>
        {eyebrow ? <Eyebrow index={index}>{eyebrow}</Eyebrow> : null}
        <SectionHeading className="text-[clamp(1.75rem,4.5vw,3rem)]">{title}</SectionHeading>
      </Reveal>
      <Reveal delay={120} className={cn("lg:col-span-7", reversed && "lg:order-1")}>
        <div className="lg:pt-4">{renderMarkdown(body)}</div>
      </Reveal>
    </div>
  );
}
