import { prisma } from "@/lib/prisma"

/**
 * Interface representing the hierarchical structure of country logistics data.
 */
export interface ShippingPlan {
    id: number;
    pidShippingPlan: string;
    shippingPlanName: string | null;
    shippingPlanRate: number | null;
    shippingPlanUnit: string | null;
    shippingRateCurrency?: 'USD' | 'NGN';
    isGloballyManaged?: boolean;
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
        const [countries, financial] = await Promise.all([
            prisma.country.findMany({
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
            }),
            prisma.exchange_rate.findUnique({
                where: { id: 1 },
                select: { quotationSeaRateNgnPerCbm: true },
            }),
        ]);
        const nigeriaSeaRate = Number(financial?.quotationSeaRateNgnPerCbm || 0);

        return countries.map((country) => ({
            ...country,
            shippingPlans: country.shippingPlans.map((plan) => {
                const isNigeriaSea =
                    country.countryName?.trim().toLowerCase() === 'nigeria' &&
                    plan.shippingPlanName?.trim().toUpperCase() === 'SEA_SHIPPING';
                return {
                    ...plan,
                    shippingPlanRate: isNigeriaSea ? nigeriaSeaRate : plan.shippingPlanRate,
                    shippingPlanUnit: isNigeriaSea ? 'CBM' : plan.shippingPlanUnit,
                    shippingRateCurrency: isNigeriaSea ? 'NGN' as const : 'USD' as const,
                    isGloballyManaged: isNigeriaSea,
                };
            }),
        })) as CountryWithPlans[];
    } catch (error) {
        console.error("[LOGISTICS_FETCHER_ERROR]:", error);
        return [];
    }
}
