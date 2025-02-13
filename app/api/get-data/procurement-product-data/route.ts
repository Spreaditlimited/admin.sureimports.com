// app/api/orders/total/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assuming you have Prisma setup in `lib/prisma.ts`

function replaceNullWithZero<T>(value: T | null): T | number {
  return value === null ? 0 : value;
}

export async function GET(request: NextRequest) {
  const pidOrder = request.nextUrl.searchParams.get('pidOrder');

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

    //ORDER CURRENCY TYPE
    const orderRecord = await prisma.orders.findUnique({
      where: { pidOrder: pidOrder as string | undefined },
      select: {
        currencyType: true,
        destinationCountry: true,
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



    const totalPrice = replaceNullWithZero(price[0].totalPricex);
    const totalWeight = replaceNullWithZero(weight[0].totalWeightx);
    const totalCount = replaceNullWithZero(count);

    console.log('JESUS CHRIST IS GREAT! ' + totalWeight);


    //CURRENCY UPDATE
    let currencyName = '';
    let currencyLogo = '';

    //currency name
    if(orderRecord?.currencyType == 'USD') {currencyName = 'USD'};
    if(orderRecord?.currencyType == 'CNY') {currencyName = 'Yuan'};
    if(orderRecord?.currencyType == 'NGN') {currencyName = 'Naira'};

    //currency logo
    if(orderRecord?.currencyType == 'USD') {currencyLogo = '$'};
    if(orderRecord?.currencyType == 'CNY') {currencyLogo = '¥'};
    if(orderRecord?.currencyType == 'NGN') {currencyLogo = '₦'};

    //shipping plans and rates
    let normalShipping = 10; //$10 per kg
    let specialShipping = 11; //$11 per kg
    let expressShipping = 15; //$15 per kg
    let seaShipping = 0; //N500,000/CBM (FOR ONLY NIGERIAN BOUND SHIPPING) *defaults to zero rate per kg

    //currency logo
    // if(orderRecord?.currencyType == 'NORMAL_SHIPPING') {currencyLogo = '$'};
    // if(orderRecord?.currencyType == 'SPECIAL_SHIPPIING') {currencyLogo = '¥'};
    // if(orderRecord?.currencyType == 'EXPRESS_SHIPPING') {currencyLogo = '₦'};
    // if(orderRecord?.currencyType == 'SEA_SHIPPING') {currencyLogo = '₦'};

    
    // setProductsGrandTotalPriceNAIRA(
    //   totalPrice * exNairToDollar +
    //     serviceChargeNAIRA * exNairToDollar +
    //     vatValueNAIRA * exNairToDollar +
    //     estimatedShippingCost * exNairToDollar,
    // );

    //Shipping rate per KG
    let shippingRate = 10; //value in USD

    //Domestic Shipping Cost within China
    let domesticShippingCost = 10; //value in USD

    //International Shipping Cost
    let internationalShippingCost = totalWeight * shippingRate;

    //Estimated Total Weight of Order
    let estimatedShippingCost = internationalShippingCost + domesticShippingCost;

    //Service Charge
    let serviceChargeValue = totalPrice * (parseFloat(exRate?.service_charge as any) / 100);

    //vat value
    let vatValue = serviceChargeValue * parseFloat(exRate?.vat as any);

    //Grand Total Cost
    let grandTotalCost = parseFloat(totalPrice + estimatedShippingCost + serviceChargeValue + vatValue);



    //RESPONSE
    const box = NextResponse.json({
          productsGetAll: products,
          productsTotalPrice: totalPrice,
          productsTotalWeight: totalWeight,
          productsTotalCount: totalCount,
          currencyType: orderRecord?.currencyType,
          currencyName: currencyName,
          currencyLogo: currencyLogo,
          exNairaToDollar: exRate?.exNairaToDollar,
          exYuanToDollar: exRate?.exYuanToDollar,
          exNairaToYuan: exRate?.exNairaToYuan,
          serviceCharge: exRate?.service_charge,
          vat: exRate?.vat,
          serviceChargeValue: serviceChargeValue,
          vatValue: vatValue,
          grandTotalCost: grandTotalCost,
          domesticShippingCost: domesticShippingCost,
          internationalShippingCost: internationalShippingCost,
          estimatedShippingCost: estimatedShippingCost,
          destinationCountry: orderRecord?.destinationCountry,
    });

console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'+JSON.stringify(box));
  } catch (error) {
    console.error('Error calculating total amount:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
