export function PageHeader({ title, eyebrow, description }: { title: string; eyebrow: string; description: string }) {
  return (
    <header className="mb-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </header>
  );
}
