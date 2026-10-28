import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, Ruler, Scale } from "lucide-react";

import { ProductConfigurator } from "@/components/product-configurator";
import { Badge } from "@/components/ui/badge";
import { getModelBySlug, getPublishedModels } from "@/lib/catalog";
import { licenses } from "@/lib/options";
import { site } from "@/lib/site";
import type { Model } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

// Prerenderiza las fichas conocidas en el build; las nuevas se generan on-demand y quedan cacheadas.
export async function generateStaticParams() {
  const models = await getPublishedModels();
  // Con Cache Components hace falta al menos un parámetro.
  return models.length ? models.map((m) => ({ slug: m.slug })) : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/modelos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const model = await getModelBySlug(slug);
  if (!model) notFound();

  const title = `${model.title} · impresión 3D`;
  const description = model.description.slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/modelos/${model.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: model.thumbnail_url ? [{ url: model.thumbnail_url, alt: model.title }] : undefined,
    },
  };
}

export default function ModelPage({ params }: PageProps<"/modelos/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Suspense fallback={<div className="aspect-square max-w-xl animate-pulse rounded-2xl bg-muted" />}>
        <ModelDetails params={params} />
      </Suspense>
    </div>
  );
}

async function ModelDetails({ params }: Pick<PageProps<"/modelos/[slug]">, "params">) {
  const { slug } = await params;
  const model = await getModelBySlug(slug);
  if (!model) notFound();

  const license = licenses[model.license];
  const dims = [model.size_x_mm, model.size_y_mm, model.size_z_mm];

  return (
    <>
      <ProductJsonLd model={model} />
      <nav aria-label="Migas" className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/modelos" className="hover:text-foreground">Catálogo</Link>
        <ChevronRight className="size-4" />
        <Link href={`/modelos?categoria=${encodeURIComponent(model.category)}`} className="hover:text-foreground">
          {model.category}
        </Link>
      </nav>

      <ProductConfigurator model={model}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="accent">{model.category}</Badge>
            {model.tags.map((t) => (
              <Badge key={t} variant="outline">#{t}</Badge>
            ))}
          </div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{model.title}</h1>
          <p className="font-display text-2xl font-semibold">
            {model.base_price != null ? (
              <>
                <span className="text-base font-normal text-muted-foreground">desde </span>
                {formatPrice(model.base_price, site.currency)}
              </>
            ) : (
              "A cotizar"
            )}
          </p>
          <p className="text-lg text-muted-foreground">{model.description}</p>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            {dims.every((d) => d != null) && (
              <div className="rounded-xl border-2 border-foreground/10 p-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground"><Ruler className="size-4" /> Ancho × prof. × alto</dt>
                <dd className="font-mono font-semibold">{dims.map((d) => Number(d)).join(" × ")} mm</dd>
              </div>
            )}
            <div className="rounded-xl border-2 border-foreground/10 p-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground"><Scale className="size-4" /> Licencia</dt>
              <dd className="font-semibold">
                {license.url ? (
                  <a href={license.url} target="_blank" rel="noopener noreferrer license" className="underline-offset-4 hover:underline">
                    {license.short}
                  </a>
                ) : (
                  license.short
                )}
              </dd>
            </div>
          </dl>

          {license.needsAttribution && model.author_name && (
            <p className="text-sm text-muted-foreground">
              Diseño de{" "}
              {model.author_url ? (
                <a href={model.author_url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4">
                  {model.author_name}
                </a>
              ) : (
                <span className="font-medium text-foreground">{model.author_name}</span>
              )}
              {model.source_url && (
                <>
                  {" · "}
                  <a href={model.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    original
                  </a>
                </>
              )}
              . {license.label}.
            </p>
          )}
        </div>
      </ProductConfigurator>
    </>
  );
}

function ProductJsonLd({ model }: { model: Model }) {
  const url = new URL(`/modelos/${model.slug}`, site.url).toString();
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: model.title,
    description: model.description,
    category: model.category,
    url,
    image: model.thumbnail_url ? new URL(model.thumbnail_url, site.url).toString() : undefined,
    brand: { "@type": "Brand", name: site.name },
    ...(model.base_price != null && {
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: site.currency,
        price: model.base_price,
        availability: "https://schema.org/MadeToOrder",
      },
    }),
  };
  return (
    <script
      type="application/ld+json"
      // Escapa "<" para que el JSON no pueda cerrar el <script>.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
