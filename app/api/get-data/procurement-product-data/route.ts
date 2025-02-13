// app/api/orders/total/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assuming you have Prisma setup in `lib/prisma.ts`

function replaceNullWithZero<T>(value: T | null): T | number {
  return value === null ? 0 : value;
}

export async function GET(request: NextRequest) {
  const pidOrder = request.nextUrl.searchParams.get('pidOrder');

  console.log('=============$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$=============' + pidOrder);
  try {
    //TOTAL PRODUCTS PRICE
    const price: any = await prisma.$queryRaw`
        SELECT pidOrder, SUM(productQuantity * productPrice) as totalPricex
        FROM products
        WHERE pidOrder = ${pidOrder}
      `;

    //TOTAL PRODUCTS WEIGHT
    const weight: any = await prisma.$queryRaw`
        SELECT pidOrder, SUM(productQuantity * productWeight) as totalWeightx
        FROM products
        WHERE pidOrder = ${pidOrder}
      `;

    //PRODUCTS TOTAL COUNT
    const count = await prisma.products.count({
      where: {
        pidOrder: pidOrder as any,
      },
    });

    //PRODUCTS ALL RECORDS
    const products = await prisma.products.findMany({
      where: {
        pidOrder: pidOrder as any,
      },
    });

    //ORDER CURRENCY, COUNTRY AND SHIPPING PLAN
    const orderRecord = await prisma.orders.findUnique({
      where: { pidOrder: pidOrder as string | undefined },
      select: {
        currencyType: true,
        destinationCountry: true,
        shippingPlan: true,
      },
    });

    //DESTINATION COUNTRY
    const destinationCountry: any = await prisma.country.findUnique({
      where: {
        pidCountry: orderRecord?.destinationCountry as string | undefined,
      },
      select: {
        countryName: true,
      },
    });

    //SHIPPING RATE
    const shippingRate: any = await prisma.shippingplan.findUnique({
      where: {
        countryId: orderRecord?.destinationCountry,
        pidShippingPlan: orderRecord?.shippingPlan,
      } as any,
      select: {
        shippingPlanRate: true,
      },
    });

    //EXCHANGE RATE
    const exRate = await prisma.exchange_rate.findUnique({
      where: { id: 1 as number },
      select: {
        currency_name1: true,
        currency_sign1: true,
        currency_name2: true,
        currency_sign2: true,
        currency_name3: true,
        currency_sign3: true,
        service_charge: true,
        vat: true,
        exNairaToDollar: true,
        exYuanToDollar: true,
        exNairaToYuan: true,
      },
    });

    const totalPriceValue = replaceNullWithZero(price[0].totalPricex);
    const totalWeight = replaceNullWithZero(weight[0].totalWeightx);
    const totalCount = replaceNullWithZero(count);

    //CURRENCY UPDATE
    let totalPrice = totalPriceValue;

    if (orderRecord?.currencyType == 'USD') {
      totalPrice = totalPriceValue;
    }
    if (orderRecord?.currencyType == 'CNY') {
      totalPrice = totalPriceValue / parseFloat(exRate?.exYuanToDollar as any);
    }

    console.log('JESUS CHRIST IS GREAT!!!');

    //CURRENCY UPDATE
    let currencyName = '';
    let currencyLogo = '';

    //currency name
    if (orderRecord?.currencyType == 'USD') {
      currencyName = 'USD';
    }
    if (orderRecord?.currencyType == 'CNY') {
      currencyName = 'Yuan';
    }
    if (orderRecord?.currencyType == 'NGN') {
      currencyName = 'Naira';
    }

    //currency logo
    if (orderRecord?.currencyType == 'USD') {
      currencyLogo = '$';
    }
    if (orderRecord?.currencyType == 'CNY') {
      currencyLogo = '¥';
    }
    if (orderRecord?.currencyType == 'NGN') {
      currencyLogo = '₦';
    }

    //Shipping Plan Name
    let shippingPlanName = orderRecord?.shippingPlan; //value in USD

    //Shipping rate per KG
    let shippingPlanRate = shippingRate.shippingPlanRate || 10; //value in USD

    //Domestic Shipping Cost within China
    let domesticShippingCost = 2; //value in USD

    //International Shipping Cost
    let internationalShippingCost =
      totalWeight * parseFloat(shippingRate.shippingPlanRate);

    //Estimated Total Weight of Order
    let estimatedTotalShippingCost =
      internationalShippingCost + domesticShippingCost;

    //Service Charge
    let serviceChargeValue =
      totalPrice * (parseFloat(exRate?.service_charge as any) / 100);

    //vat value
    let vatValue = serviceChargeValue * (parseFloat(exRate?.vat as any) / 100);

    //Grand Total Cost
    let grandTotalCost = parseFloat(
      totalPrice + estimatedTotalShippingCost + serviceChargeValue + vatValue,
    );

    //--------------------------------//RESPONSE//--------------------------------//
    return NextResponse.json({
      //PRODUCTS RECORD TABLE
      productsGetAll: products,

      //TOTAL PRICE
      productsTotalPrice: totalPrice,

      //PRODUCTS TOTAL COUNT
      productsTotalCount: totalCount,

      //TOTAL WEIGHT
      productsTotalWeight: totalWeight,

      //CURRENCY TYPE, NAME & LOGO
      currencyType: orderRecord?.currencyType,
      currencyName: currencyName,
      currencyLogo: currencyLogo,

      //NAIRA TO DOLLAR EX-RATE
      exNairaToDollar: exRate?.exNairaToDollar,

      //YUAN TO DOLLAR EX-RATE
      exYuanToDollar: exRate?.exYuanToDollar,

      //NAIRA TO YUAN EX-RATE
      exNairaToYuan: exRate?.exNairaToYuan,

      //SERVICE CHARGE PERCENTAGE & VALUE
      serviceCharge: exRate?.service_charge,
      serviceChargeValue: serviceChargeValue,

      //VAT PERCENTAGE & VALUE
      vat: exRate?.vat,
      vatValue: vatValue,

      //SHIPPING DESTINATION COUNTRY
      destinationCountry: destinationCountry.countryName,

      //SHIPPING PLAN NAME & RATE
      shippingPlanName: shippingPlanName,
      shippingPlanRate: shippingPlanRate,

      //DOMESTIC SHIPPING COST
      domesticShippingCost: domesticShippingCost,

      //INTERNATIONAL SHIPPING COST
      internationalShippingCost: internationalShippingCost,

      //ESTIMATED TOTAL SHIPPING COST
      estimatedTotalShippingCost: estimatedTotalShippingCost,

      //GRAND TOTAL COST IN DOLLARS
      grandTotalCost: grandTotalCost,
    });
  } catch (error) {
    console.error('Error calculating total amount:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
