import Link from "next/link";
import { Box } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { licenses } from "@/lib/options";
import type { Model } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function ModelCard({ model }: { model: Model }) {
  return (
    <Link
      href={`/modelos/${model.slug}`}
      className="tilt-card group flex flex-col overflow-hidden rounded-xl border-2 border-foreground bg-card shadow-extrude dark:border-extrude/60"
    >
      <div className="relative aspect-square overflow-hidden border-b-2 border-foreground/10 bg-muted">
        <div className="print-bed absolute inset-0 opacity-70" />
        {model.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.thumbnail_url}
            alt={model.title}
            loading="lazy"
            className="relative size-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2"
          />
        ) : (
          <div className="relative flex size-full items-center justify-center text-muted-foreground">
            <Box className="size-12" />
          </div>
        )}
        <Badge variant="outline" className="absolute left-3 top-3 bg-background/80 backdrop-blur">
          {model.category}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-display text-lg font-semibold leading-tight">{model.title}</h3>
        <div className="mt-auto flex items-center justify-between pt-2 text-sm">
          <span className="font-semibold">
            {model.base_price != null ? <>desde {formatPrice(model.base_price)}</> : "A cotizar"}
          </span>
          <span className="text-xs text-muted-foreground">{licenses[model.license].short}</span>
        </div>
      </div>
    </Link>
  );
}

export function ModelGrid({ models }: { models: Model[] }) {
  if (models.length === 0) {
    return <p className="rounded-xl border-2 border-dashed p-10 text-center text-muted-foreground">Todavía no hay modelos acá.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {models.map((m) => (
        <ModelCard key={m.id} model={m} />
      ))}
    </div>
  );
}
