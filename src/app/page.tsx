import Link from "next/link";
import { ArrowRight, Layers, MessageCircle, Package, Sparkles, Wand2 } from "lucide-react";

import { ModelGrid } from "@/components/model-card";
import { ModelViewer } from "@/components/model-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublishedModels } from "@/lib/catalog";
import { colors, materials } from "@/lib/options";

export default async function HomePage() {
  const models = await getPublishedModels();
  const featured = models.filter((m) => m.featured);
  const hero = featured[0] ?? models[0];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="print-bed absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute -left-32 top-10 -z-10 size-96 rounded-full bg-brand-cyan/20 blur-3xl" />
        <div className="absolute -right-24 top-40 -z-10 size-96 rounded-full bg-brand-magenta/20 blur-3xl" />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-24">
          <div className="space-y-6">
            <Badge variant="outline" className="gap-1.5 border-2 bg-background px-3 py-1 text-sm">
              <Sparkles className="text-primary" /> Impresión 3D a pedido
            </Badge>
            <h1 className="text-5xl font-bold leading-[0.95] sm:text-6xl lg:text-7xl">
              Tus ideas, <span className="text-filament">capa por capa.</span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Elegí un modelo del catálogo, giralo en 3D, configurá material y color, y te lo imprimimos. ¿Tenés algo en
              mente? También diseñamos a medida.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="extrude" size="lg">
                <Link href="/modelos">
                  Ver catálogo <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pedido-personalizado">
                  <Wand2 /> Pedido personalizado
                </Link>
              </Button>
            </div>
            <dl className="flex gap-8 pt-2">
              {[
                [models.length, "modelos"],
                [materials.length, "materiales"],
                [colors.length, "colores"],
              ].map(([n, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display text-3xl font-bold">{n}</dd>
                  <dd className="text-sm text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {hero && (
            <div className="relative">
              <div className="relative aspect-square rotate-1 overflow-hidden rounded-3xl border-2 border-foreground bg-card shadow-extrude transition-transform hover:rotate-0 dark:border-extrude/60">
                <ModelViewer src={hero.glb_url} alt={`Modelo 3D de ${hero.title}`} poster={hero.thumbnail_url} className="size-full" />
              </div>
              <Link
                href={`/modelos/${hero.slug}`}
                className="absolute -bottom-4 left-6 -rotate-2 rounded-xl border-2 border-foreground bg-accent px-4 py-2 font-display font-semibold text-accent-foreground shadow-extrude-sm transition-transform hover:rotate-0"
              >
                {hero.title} →
              </Link>
              <span className="absolute -right-2 top-6 rotate-6 rounded-full border-2 border-foreground bg-background px-3 py-1 font-mono text-xs shadow-extrude-sm">
                capa 0,2 mm
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-primary">{"// destacados"}</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Listos para imprimir</h2>
          </div>
          <Button asChild variant="link" className="hidden sm:inline-flex">
            <Link href="/modelos">
              Todo el catálogo <ArrowRight />
            </Link>
          </Button>
        </div>
        <ModelGrid models={(featured.length ? featured : models).slice(0, 8)} />
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
        <p className="font-mono text-sm text-primary">{"// cómo funciona"}</p>
        <h2 className="mb-10 text-3xl font-bold sm:text-4xl">Del archivo a tus manos</h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Layers, title: "Elegí y configurá", text: "Mirá el modelo en 3D, elegí material, color y tamaño." },
            { icon: MessageCircle, title: "Te cotizamos", text: "Te escribimos con precio y plazo. Recién ahí confirmás." },
            { icon: Package, title: "Imprimimos y entregamos", text: "Lo imprimimos, lo revisamos y coordinamos la entrega." },
          ].map((step, i) => (
            <li key={step.title} className="relative rounded-2xl border-2 border-foreground/10 bg-card p-6">
              <span className="text-filament absolute right-5 top-3 font-display text-6xl font-bold opacity-80">{i + 1}</span>
              <step.icon className="mb-4 size-8 text-primary" />
              <h3 className="mb-1 text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="bg-filament relative overflow-hidden rounded-3xl border-2 border-foreground p-8 text-white shadow-extrude sm:p-12 dark:border-extrude">
          <div className="print-bed absolute inset-0 opacity-30" />
          <div className="relative max-w-xl space-y-4">
            <h2 className="text-3xl font-bold sm:text-4xl">¿No está en el catálogo?</h2>
            <p className="text-lg text-white/85">
              Mandanos una foto, un boceto o una descripción. Lo modelamos, te mostramos una vista previa y lo imprimimos.
            </p>
            <Button asChild size="lg" className="border-2 border-black bg-white text-black shadow-[4px_4px_0_0_#000] hover:bg-white/90">
              <Link href="/pedido-personalizado">
                <Wand2 /> Pedir un diseño a medida
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
