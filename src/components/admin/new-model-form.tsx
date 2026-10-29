"use client";

import { useActionState, useState } from "react";
import { FileUp, Loader2, Save } from "lucide-react";

import { createModel, type AdminFormState } from "@/app/actions/admin";
import { ModelViewer } from "@/components/model-viewer";
import { FormError } from "@/components/order-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { licenses } from "@/lib/options";
import { prepareModel, SUPPORTED_EXTENSIONS, type PreparedModel } from "@/lib/three/prepare-model";
import { slugify } from "@/lib/utils";

type Uploaded = PreparedModel & { glbKey: string; thumbKey: string; sourceKey: string; previewUrl: string };

async function upload(key: string, body: Blob) {
  const res = await fetch(`/api/admin/upload?key=${encodeURIComponent(key)}`, {
    method: "PUT",
    body,
    headers: { "content-type": body.type || "application/octet-stream" },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `Error ${res.status}`);
  }
}

export function NewModelForm() {
  const [state, action, saving] = useActionState<AdminFormState, FormData>(createModel, {});
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setUploaded(null);
    try {
      setStatus("Convirtiendo a GLB y generando miniatura…");
      const prepared = await prepareModel(file);
      const id = crypto.randomUUID();
      const ext = file.name.split(".").pop()!.toLowerCase();
      const keys = {
        glbKey: `public/models/${id}/model.glb`,
        thumbKey: `public/models/${id}/thumb.webp`,
        sourceKey: `private/models/${id}/original.${ext}`,
      };
      setStatus("Subiendo archivos a R2…");
      await Promise.all([
        upload(keys.glbKey, prepared.glb),
        upload(keys.thumbKey, prepared.thumbnail),
        upload(keys.sourceKey, file),
      ]);
      setUploaded({ ...prepared, ...keys, previewUrl: URL.createObjectURL(prepared.glb) });
      setStatus(
        `Listo: ${Math.round(prepared.triangles).toLocaleString("es")} triángulos, GLB de ${(prepared.glb.size / 1024 / 1024).toFixed(1)} MB.`,
      );
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-foreground/25 p-8 text-center transition-colors hover:border-primary hover:bg-primary/5">
          {busy ? <Loader2 className="size-8 animate-spin text-primary" /> : <FileUp className="size-8 text-primary" />}
          <span className="font-display font-semibold">Archivo del modelo</span>
          <span className="text-sm text-muted-foreground">
            {SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(", ")} en milímetros. El original queda privado.
          </span>
          <input
            type="file"
            accept={SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(",")}
            className="sr-only"
            disabled={busy}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
        {uploaded && (
          <div className="overflow-hidden rounded-2xl border-2 border-foreground shadow-extrude dark:border-extrude/60">
            <ModelViewer src={uploaded.previewUrl} alt="Vista previa" className="aspect-square" />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <input type="hidden" name="glb_key" value={uploaded?.glbKey ?? ""} />
        <input type="hidden" name="thumb_key" value={uploaded?.thumbKey ?? ""} />
        <input type="hidden" name="source_key" value={uploaded?.sourceKey ?? ""} />

        <Field label="Título">
          <Input name="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Slug (URL)">
          <Input name="slug" placeholder={slugify(title)} />
        </Field>
        <Field label="Descripción">
          <Textarea name="description" rows={4} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Input name="category" placeholder="Decoración" />
          </Field>
          <Field label="Precio base (vacío = a cotizar)">
            <Input name="base_price" inputMode="numeric" />
          </Field>
        </div>
        <Field label="Etiquetas (separadas por coma)">
          <Input name="tags" placeholder="maceta, low poly" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          {(["x", "y", "z"] as const).map((axis) => (
            <Field key={`${axis}-${uploaded?.glbKey}`} label={{ x: "Ancho mm", y: "Prof. mm", z: "Alto mm" }[axis]}>
              <Input name={`size_${axis}_mm`} inputMode="decimal" defaultValue={uploaded?.size[axis]} />
            </Field>
          ))}
        </div>

        <fieldset className="space-y-3 rounded-xl border-2 border-foreground/10 p-4">
          <legend className="px-1 text-sm font-semibold">Licencia y autor</legend>
          <Field label="Licencia">
            <NativeSelect name="license" defaultValue="own">
              {Object.entries(licenses).map(([id, l]) => (
                <option key={id} value={id}>
                  {l.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <p className="text-xs text-muted-foreground">
            Las licencias CC &quot;NC&quot; (no comercial) no aparecen: no permiten vender impresiones sin permiso del autor.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Autor">
              <Input name="author_name" />
            </Field>
            <Field label="Perfil del autor (URL)">
              <Input name="author_url" type="url" />
            </Field>
          </div>
          <Field label="Página original (URL)">
            <Input name="source_url" type="url" placeholder="https://www.printables.com/model/..." />
          </Field>
        </fieldset>

        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="published" defaultChecked className="size-4 accent-primary" /> Publicado
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="featured" className="size-4 accent-primary" /> Destacado
          </label>
        </div>

        <FormError message={state.error} />
        <Button type="submit" variant="extrude" size="lg" className="w-full" disabled={!uploaded || saving || busy}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />} Guardar modelo
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
