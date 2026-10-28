"use client";

import { useEffect, useRef, useState } from "react";
import { Box, RotateCw } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  poster?: string | null;
  className?: string;
  autoRotate?: boolean;
  /** Muestra controles de cámara y botón de AR. */
  interactive?: boolean;
  /** Color para teñir el modelo (preview del filamento elegido). */
  tint?: string | null;
};

type ModelViewerElement = HTMLElement & {
  model?: {
    materials: { pbrMetallicRoughness: { setBaseColorFactor(color: string): void } }[];
  };
};

/**
 * Visor 3D basado en <model-viewer> de Google. El web component se carga solo en el navegador
 * para no pesar en el HTML inicial (bueno para SEO y Core Web Vitals).
 */
export function ModelViewer({ src, alt, poster, className, autoRotate = true, interactive = true, tint }: Props) {
  const ref = useRef<ModelViewerElement>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer").then(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onLoad = () => setLoaded(true);
    el.addEventListener("load", onLoad);
    return () => el.removeEventListener("load", onLoad);
  }, [ready]);

  useEffect(() => {
    const el = ref.current;
    if (!el?.model || !tint) return;
    el.model.materials.forEach((m) => m.pbrMetallicRoughness.setBaseColorFactor(tint));
  }, [tint, loaded]);

  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      {/* Cama de impresión de fondo */}
      <div className="print-bed absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />
      <div className="absolute inset-x-[15%] bottom-[12%] -z-10 h-1/3 rounded-full bg-primary/20 blur-3xl" />
      {ready ? (
        <model-viewer
          ref={ref}
          src={src}
          alt={alt}
          poster={poster ?? undefined}
          loading="eager"
          camera-controls={interactive ? "" : undefined}
          auto-rotate={autoRotate ? "" : undefined}
          auto-rotate-delay="0"
          rotation-per-second="24deg"
          interaction-prompt="none"
          ar={interactive ? "" : undefined}
          ar-modes="webxr scene-viewer quick-look"
          shadow-intensity="1.2"
          shadow-softness="0.8"
          exposure="1.05"
          environment-image="neutral"
          camera-orbit="35deg 70deg 115%"
          disable-pan=""
        />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <Box className="size-10 animate-pulse" />
        </div>
      )}
      {interactive && loaded && (
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-background/70 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur">
          <RotateCw className="size-3" /> Arrastrá para girar
        </span>
      )}
    </div>
  );
}
