/** Se muestra al instante al cambiar de vista mientras el servidor arma la página. */
export default function PanelLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/70" />
        ))}
      </div>
    </div>
  );
}
