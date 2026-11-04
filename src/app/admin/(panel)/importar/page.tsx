import Link from "next/link";
import { ExternalLink, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { requireAdmin } from "@/lib/auth";
import {
  getSketchfabToken,
  isAllowedSketchfabLicense,
  searchSketchfab,
  sketchfabLicenses,
  type ImportCandidate,
} from "@/lib/importers/sketchfab";

export default async function ImportPage({ searchParams }: PageProps<"/admin/importar">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).trim().slice(0, 100);
  const licenseParam = one(sp.license);
  const license = isAllowedSketchfabLicense(licenseParam) ? licenseParam : "by";
  const cursor = one(sp.cursor).slice(0, 200);

  let results: ImportCandidate[] = [];
  let nextCursor: string | null = null;
  let error: string | null = null;
  try {
    ({ results, nextCursor } = await searchSketchfab({ q, license, cursor: cursor || undefined }));
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // Marca los que ya están en el catálogo (se guardan con la URL de Sketchfab como source_url).
  const imported = new Set<string>();
  if (results.length) {
    const { data } = await supabase.from("models").select("source_url").in("source_url", results.map((r) => r.sourceUrl));
    for (const row of data ?? []) if (row.source_url) imported.add(row.source_url);
  }
  const hasToken = Boolean(await getSketchfabToken());
  const nextHref = nextCursor
    ? `/admin/importar?${new URLSearchParams({ q, license, cursor: nextCursor })}`
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Importar modelos gratuitos</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Busca en Sketchfab con su API oficial, solo modelos descargables con licencias que permiten vender impresiones
          (CC0, CC BY y CC BY-SA). Al agregar uno se precarga el formulario con autor, licencia y link al original, y vos
          revisás precio, categoría y medidas antes de guardar.
        </p>
      </div>

      {!hasToken && (
        <p className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-3 text-sm">
          Falta el secreto <code>SKETCHFAB_API_TOKEN</code>: podés buscar, pero no descargar. Copiá tu token de{" "}
          <a href="https://sketchfab.com/settings/password" target="_blank" rel="noopener noreferrer" className="underline">
            Sketchfab → Settings → Password &amp; API
          </a>{" "}
          y agregalo en Cloudflare (Worker → Settings → Variables and secrets).
        </p>
      )}

      <form className="flex flex-wrap items-end gap-3" action="/admin/importar">
        <Input name="q" defaultValue={q} placeholder="maceta, llavero, dragón…" className="max-w-sm" />
        <NativeSelect name="license" defaultValue={license} aria-label="Licencia">
          {Object.entries(sketchfabLicenses).map(([slug, l]) => (
            <option key={slug} value={slug}>
              {l.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit"><Search /> Buscar</Button>
      </form>

      {error && <p className="text-destructive">{error}</p>}
      {!error && results.length === 0 && <p className="text-muted-foreground">Sin resultados para esa búsqueda.</p>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((m) => {
          const allowed = isAllowedSketchfabLicense(m.licenseSlug);
          const already = imported.has(m.sourceUrl);
          return (
            <li key={m.uid} className="flex flex-col overflow-hidden rounded-xl border-2 border-foreground/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.thumbnailUrl ?? ""} alt="" loading="lazy" className="aspect-video w-full bg-muted object-cover" />
              <div className="flex flex-1 flex-col gap-2 p-3">
                <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-display font-semibold hover:underline">
                  {m.title} <ExternalLink className="inline size-3.5" />
                </a>
                <p className="text-sm text-muted-foreground">
                  de{" "}
                  {m.authorUrl ? (
                    <a href={m.authorUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                      {m.authorName}
                    </a>
                  ) : (
                    m.authorName
                  )}
                  {m.faceCount ? ` · ${m.faceCount.toLocaleString("es")} caras` : ""}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-1">
                  <Badge variant={allowed ? "secondary" : "destructive"}>{m.licenseLabel ?? m.licenseSlug}</Badge>
                  {already ? (
                    <Badge variant="outline" className="ml-auto">Ya en el catálogo</Badge>
                  ) : allowed ? (
                    <Button asChild size="sm" variant="extrude" className="ml-auto">
                      <Link href={`/admin/modelos/nuevo?sketchfab=${m.uid}`}><Plus /> Agregar al catálogo</Link>
                    </Button>
                  ) : (
                    <span className="ml-auto text-xs text-muted-foreground">No permite venta</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {nextHref && (
        <Button asChild variant="outline"><Link href={nextHref}>Más resultados</Link></Button>
      )}

      <section className="space-y-2 rounded-xl border-2 border-foreground/10 p-4 text-sm">
        <h2 className="font-display text-lg font-semibold">Otras fuentes (carga manual)</h2>
        <p className="text-muted-foreground">
          Thingiverse, Printables y MyMiniFactory no permiten importar automáticamente para un catálogo propio (sin API
          pública o con términos que lo prohíben sin permiso). Buscá ahí, filtrá por licencia CC0 / CC BY / CC BY-SA,
          descargá el archivo y subilo con <Link href="/admin/modelos/nuevo" className="underline">Nuevo modelo</Link>{" "}
          completando autor, licencia y link al original.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ["Printables", `https://www.printables.com/search/models?q=${encodeURIComponent(q)}`],
            ["Thingiverse", `https://www.thingiverse.com/search?q=${encodeURIComponent(q)}&type=things`],
            ["MyMiniFactory", `https://www.myminifactory.com/search/?query=${encodeURIComponent(q)}`],
          ].map(([name, href]) => (
            <Button key={name} asChild variant="ghost" size="sm">
              <a href={href} target="_blank" rel="noopener noreferrer">{name} <ExternalLink /></a>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
