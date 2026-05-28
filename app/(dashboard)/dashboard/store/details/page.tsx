import { notFound } from "next/navigation"
import ProductDetails from "./components/ProductDetails"
import { db } from "@/lib/db"

export default async function ProductDetailsPage({
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
  
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Product Details
        </h1>
        <p className="text-sm text-muted-foreground">
          Viewing <span className="font-medium text-foreground">{product.productName}</span> — ID: {product.pidProduct}
        </p>
      </div>

      {/* Page Content */}
      {/* We pass the product data to the details component which handles the specific UI cards */}
      <ProductDetails product={product as any} />
      
    </div>
  )
}