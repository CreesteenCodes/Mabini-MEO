import * as React from "react";

import { cn } from "./utils";

function AutoGrowTextarea({ className, onInput, onKeyDown, value, ...props }: React.ComponentProps<"textarea">) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      value={value}
      rows={1}
      onInput={(event) => {
        const textarea = event.currentTarget;
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
        onInput?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.shiftKey) {
          const currentField = event.currentTarget;
          const fieldGroup = currentField.closest("form, [role='dialog'], .fixed.inset-0") ?? document;
          const fields = Array.from(fieldGroup.querySelectorAll<HTMLElement>(
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([readonly]):not(:disabled), textarea:not([readonly]):not(:disabled), select:not(:disabled)'
          )).filter(field => field.getClientRects().length > 0);
          const nextField = fields[fields.indexOf(currentField) + 1];

          if (nextField) {
            event.preventDefault();
            nextField.focus();
          }
        }
        onKeyDown?.(event);
      }}
      className={className}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { AutoGrowTextarea, Textarea };
