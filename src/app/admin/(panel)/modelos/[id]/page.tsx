import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { EditModelForm } from "@/components/admin/edit-model-form";
import { requireAdmin } from "@/lib/auth";
import { getCapacity } from "@/lib/capacity";
import type { Model } from "@/lib/types";

export default async function EditModelPage({ params }: PageProps<"/admin/modelos/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data }, capacity] = await Promise.all([
    supabase.from("models").select("*").eq("id", id).maybeSingle(),
    getCapacity().catch(() => null),
  ]);
  if (!data) notFound();
  const model = data as Model;

  return (
    <div className="space-y-6">
      <Link href="/admin/modelos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Modelos
      </Link>
      <h1 className="text-3xl font-bold">Editar: {model.title}</h1>
      <EditModelForm
        model={model}
        pricing={
          capacity && {
            multicolor_price_factor: capacity.multicolor_price_factor,
            size_price_factors: capacity.size_price_factors,
          }
        }
      />
    </div>
  );
}
