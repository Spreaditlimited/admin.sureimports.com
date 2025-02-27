import {prisma} from "@/lib/prisma"

export async function CountryDataFetcher() {
    const countries = await prisma.country.findMany({
      include: {
        shippingPlans: true,
      },
    })
  
    return countries
  }
  
