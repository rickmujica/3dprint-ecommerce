import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

/** Cubo isométrico con las tres caras en los colores de filamento. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <path d="M16 2 29 9.5 16 17 3 9.5Z" fill="var(--brand-cyan)" />
      <path d="M3 9.5 16 17v14L3 23.5Z" fill="var(--brand-violet)" />
      <path d="M29 9.5 16 17v14l13-7.5Z" fill="var(--brand-magenta)" />
      <path d="M16 2 29 9.5v14L16 31 3 23.5v-14Z" fill="none" stroke="var(--foreground)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight", className)}>
      <LogoMark />
      {site.name}
    </span>
  );
}
