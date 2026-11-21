import { notFound } from "next/navigation"
import EditProduct from "./components/EditProduct"
import { db } from "@/lib/db"

export default async function EditProductPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams

  if (!id) {
    notFound()
  }

  // Fetch product from database using Prisma
  const product = await db.store.findUnique({
    where: {
      pidProduct: id,
    },
  })

  if (!product) {
    notFound()
  }
  const pricing = await db.$queryRaw<{ supplierRmb: unknown; markupRmb: unknown }[]>`SELECT supplierRmb, markupRmb FROM store_rmb_pricing WHERE pidProduct = ${id}`
  const rate = pricing.length ? await db.exchange_rate.findUnique({ where: { id: 1 }, select: { exNairaToYuan: true } }) : null
  
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Edit Product
        </h1>
        <p className="text-sm text-muted-foreground">
          Updating specifications for <span className="font-medium text-foreground">{product.productName}</span> — ID: {product.pidProduct}
        </p>
      </div>

      {/* Page Content */}
      <EditProduct product={product as any} rmbPricing={pricing[0] ? {
        supplierRmb: Number(pricing[0].supplierRmb), markupRmb: Number(pricing[0].markupRmb),
        rate: Number(rate?.exNairaToYuan),
      } : undefined} />
      
    </div>
  )
}
