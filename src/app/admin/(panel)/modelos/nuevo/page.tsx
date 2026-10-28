import { NewModelForm } from "@/components/admin/new-model-form";

export default function NewModelPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nuevo modelo</h1>
      <NewModelForm />
    </div>
  );
}
