import SupplierCategoriesClient from './SupplierCategoriesClient';

export default function SupplierIntelligenceCategoriesPage() {
  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Supplier Intelligence
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Product Categories
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          See existing product categories, suppliers under each category, and
          the product lines those suppliers manufacture. Use auto-link to list
          one supplier under other relevant categories without duplicating the
          supplier record.
        </p>
      </div>

      <SupplierCategoriesClient />
    </main>
  );
}
