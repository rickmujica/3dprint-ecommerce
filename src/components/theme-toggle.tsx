"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

/** Interruptor claro/oscuro con forma de switch. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      suppressHydrationWarning
      aria-checked={isDark}
      aria-label="Modo oscuro"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-8 w-15 shrink-0 items-center rounded-full border-2 border-foreground bg-muted p-0.5 shadow-extrude-sm transition-colors dark:border-extrude",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full bg-background text-foreground transition-transform duration-300",
          "translate-x-0 dark:translate-x-7 dark:bg-primary dark:text-primary-foreground",
        )}
      >
        <SunIcon className="size-3.5 dark:hidden" />
        <MoonIcon className="hidden size-3.5 dark:block" />
      </span>
    </button>
  );
}
