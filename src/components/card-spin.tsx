"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { ModelViewer } from "@/components/model-viewer";
import { cn } from "@/lib/utils";

/**
 * Miniatura de una card que, al pasar el mouse, se cambia por el modelo 3D girando (como el del hero).
 * En pantallas táctiles gira la card que queda en el centro de la pantalla al hacer scroll.
 *
 * Rendimiento: el visor solo se monta mientras la card está activa y se desmonta al salir,
 * así nunca hay más de uno o dos modelos cargados aunque la grilla tenga muchas cards.
 * No hace nada con "reducir movimiento" ni con el ahorro de datos activado.
 */
export function CardSpin({ src, alt, children }: { src: string; alt: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setIsActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const unmountTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;

    // Monta el visor al activarse y lo desmonta un rato después de salir (deja terminar el fundido).
    const setActive = (value: boolean) => {
      clearTimeout(unmountTimer.current);
      setIsActive(value);
      if (value) {
        setMounted(true);
      } else {
        unmountTimer.current = setTimeout(() => {
          setMounted(false);
          setLoaded(false);
        }, 300);
      }
    };

    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      // La card es el <a> que envuelve la miniatura: el hover cuenta en toda la card.
      const card = el.closest("a") ?? el;
      const on = () => setActive(true);
      const off = () => setActive(false);
      card.addEventListener("pointerenter", on);
      card.addEventListener("pointerleave", off);
      card.addEventListener("focusin", on);
      card.addEventListener("focusout", off);
      return () => {
        card.removeEventListener("pointerenter", on);
        card.removeEventListener("pointerleave", off);
        card.removeEventListener("focusin", on);
        card.removeEventListener("focusout", off);
      };
    }

    // Táctil: solo la card que cruza la franja central de la pantalla.
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: "-45% 0px -45% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(unmountTimer.current), []);

  const showing = active && loaded;

  return (
    <div ref={ref} className="relative size-full">
      <div className={cn("size-full transition-opacity duration-300", showing && "opacity-0")}>{children}</div>
      {mounted && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-300",
            showing ? "opacity-100" : "opacity-0",
          )}
        >
          <ModelViewer
            src={src}
            alt={alt}
            interactive={false}
            background={false}
            onLoaded={() => setLoaded(true)}
            className="size-full"
          />
        </div>
      )}
    </div>
  );
}
