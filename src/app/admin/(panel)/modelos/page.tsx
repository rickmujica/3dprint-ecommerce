import Link from "next/link";
import { Download } from "lucide-react";

import { toggleModelPublished } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { licenses } from "@/lib/options";
import type { Model } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export default async function AdminModelsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("models").select("*").order("created_at", { ascending: false });
  const models = (data ?? []) as Model[];

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Modelos</h1>
      {error && <p className="text-destructive">{error.message}</p>}
      <ul className="divide-y-2 divide-foreground/10 rounded-xl border-2 border-foreground/10">
        {models.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-4 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.thumbnail_url ?? ""} alt="" className="size-14 rounded-lg bg-muted object-contain" />
            <div className="min-w-0 flex-1">
              <Link href={`/modelos/${m.slug}`} className="font-display font-semibold hover:underline">{m.title}</Link>
              <p className="text-sm text-muted-foreground">
                {m.category} · {licenses[m.license].short} · {formatPrice(m.base_price)}
              </p>
            </div>
            {m.featured && <Badge variant="accent">Destacado</Badge>}
            {m.source_file_key && (
              <Button asChild variant="ghost" size="icon" aria-label="Descargar original">
                <a href={`/api/admin/file?key=${encodeURIComponent(m.source_file_key)}`}><Download /></a>
              </Button>
            )}
            <form action={toggleModelPublished}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="published" value={String(!m.published)} />
              <Button type="submit" size="sm" variant={m.published ? "outline" : "default"}>
                {m.published ? "Despublicar" : "Publicar"}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
