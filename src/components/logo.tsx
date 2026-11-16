import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

/** Logo de Mimi3D (la impresora que dibuja un corazón). Archivos en public/brand/. */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/mimi3d-logo-128.png"
      srcSet="/brand/mimi3d-logo-128.png 1x, /brand/mimi3d-logo-256.png 2x"
      alt=""
      aria-hidden
      width={128}
      height={128}
      className={cn("size-11 shrink-0 drop-shadow-[2px_2px_0_var(--extrude)] transition-transform hover:-rotate-6", className)}
    />
  );
}

/** Logo + nombre: "Mimi" en chocolate y "3D" en rosa, como en el logo. */
export function Logo({ className }: { className?: string }) {
  const match = site.name.match(/^(.*?)(3D)$/i);
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-2xl font-semibold tracking-tight", className)}>
      <LogoMark />
      {match ? (
        <span>
          {match[1]}
          <span className="text-primary">{match[2]}</span>
        </span>
      ) : (
        site.name
      )}
    </span>
  );
}
