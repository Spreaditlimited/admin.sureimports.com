import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const product = await prisma.products.findUnique({ where: { id: parseInt(params.id) } })
  if (product) {
    return NextResponse.json(product)
  } else {
    return NextResponse.json({ message: 'Product not found' }, { status: 404 })
  }
}

// export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
//   const body = await request.json()
//   const { name, description, price, stock } = body
//   const product = await prisma.products.update({
//     where: { id: parseInt(params.id) },
//     data: { name, description, price: parseFloat(price), stock: parseInt(stock) },
//   })
//   return NextResponse.json(product)
// }

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.products.delete({ where: { id: parseInt(params.id) } })
  return new NextResponse(null, { status: 204 })
}