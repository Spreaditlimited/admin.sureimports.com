import { notFound } from "next/navigation"
import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
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
    // include: {
    //   category: true,
    // },
  })

  if (!product) {
    notFound()
  }
  
  return (
      <>
          <h1 className="text-2xl font-bold mb-6">Products Details </h1>
          <ProductDetails product={product as any} />
      </>
  )
}

