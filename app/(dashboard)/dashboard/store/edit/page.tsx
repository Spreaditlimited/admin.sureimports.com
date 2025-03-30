import { notFound } from "next/navigation"
import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
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
    // include: {
    //   category: true,
    // },
  })

  if (!product) {
    notFound()
  }
  
  return (
      <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">Edit Products</h1>
          <EditProduct product={product as any} />
      </DashboardLayout>
  )
}

