import { prisma } from "@/lib/prisma"

/**
 * Interface representing the hierarchical structure of country logistics data.
 */
export interface ShippingPlan {
    id: number;
    pidShippingPlan: string;
    shippingPlanName: string | null;
    shippingPlanRate: number | null;
}

export interface CountryWithPlans {
    id: number;
    pidCountry: string;
    countryName: string | null;
    shippingPlans: ShippingPlan[];
}

/**
 * Server-side data fetcher to retrieve global shipping configurations.
 * Utilizes Prisma's relational mapping to include nested plans.
 */
export async function CountryDataFetcher(): Promise<CountryWithPlans[]> {
    try {
        const countries = await prisma.country.findMany({
            include: {
                shippingPlans: {
                    orderBy: {
                        shippingPlanName: 'asc'
                    }
                },
            },
            orderBy: {
                countryName: 'asc'
            }
        });

        return countries as CountryWithPlans[];
    } catch (error) {
        console.error("[LOGISTICS_FETCHER_ERROR]:", error);
        return [];
    }
}