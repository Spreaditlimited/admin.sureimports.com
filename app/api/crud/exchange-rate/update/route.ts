// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import { getR2Client } from '@/app/utils/r2Client';
import { Upload } from '@aws-sdk/lib-storage';
import getFileExt from '@/app/utils/fileExt'
import fileFilter from '@/app/utils/fileFilter'
import randomGenerator from "@/lib/helpers/randomGenerator";
import { NextResponse } from 'next/server';
import { generateSlug } from '@/app/utils/slugGenerator'

const prisma = new PrismaClient();


export async function POST(request: Request) {

    const formData = await request.formData();
        //const pidShippingPlan = formData.get('pidShippingPlan') as string;
        const pidCountry = formData.get('pidCountry') as string;
        const country = formData.get('country') as string;
        const shippingPlan = formData.get('shippingPlan') as string;
        const shippingRate = formData.get('shippingRate') as string;

        console.log(3+5);

        const pidShippingPlan:string = "SHP"+randomGenerator(10);
        //const pidCountry:string = "CTY"+randomGenerator(10);
        const countrySlug = generateSlug(country);


    // Lookup the user in database
    const checkCountry = await prisma.country.findFirst({
      where: {
        countryName:country,
      },
    });
    //Check if country exists
    if (checkCountry) {

                        // Lookup the record in database
                        const checkShippingPlan = await prisma.shippingplan.findFirst({
                          where: {
                            AND: [
                              { shippingPlanName:shippingPlan, },
                              { countryId:checkCountry.pidCountry,},
                            ],
                          },
                        });

                        //Check if country exists
                        if (checkShippingPlan) {
                                const responsex = {
                                  message:'Shipping Plan already exists. You may update the plan.',
                                  status: 'ALREADY_EXIST',
                                };
                                return NextResponse.json(
                                  { responsex, successx: true, userx: null },
                                  { status: 200 },
                                );  
                        }else{
                                    //ADD SHIPPING PLAN
                                    const addShippingPlan = await prisma.shippingplan.create({
                                      data: { 
                                              pidShippingPlan:pidShippingPlan,
                                              countryId:checkCountry.pidCountry,
                                              shippingPlanSlug:shippingPlan,
                                              shippingPlanName:shippingPlan,
                                              shippingPlanRate: parseFloat(shippingRate),
                                              updatedAt: new Date(),
                                              createdAt: new Date(),
                                          }
                                    });

                                    if(addShippingPlan){
                                      const responsex = {
                                        message:'Shipping Plan has been added! Country already exists.',
                                        status: 'SUCCESS',
                                      };
                                      return NextResponse.json(
                                        { responsex, successx: true, userx: null },
                                        { status: 200 },
                                      );  
                                    }
                        }
    }else{
        //ADD COUNTRY
        const addCountry = await prisma.country.create({
          data: { 
                  pidCountry: pidCountry,
                  countrySlug: countrySlug || null,
                  countryName: country || null,
                  updatedAt: new Date(),
                  createdAt: new Date(),
              }
        });


          //ADD SHIPPING PLAN
  const addShippingPlan = await prisma.shippingplan.create({
    data: { 
            pidShippingPlan:pidShippingPlan,
            countryId:pidCountry,
            shippingPlanSlug:shippingPlan,
            shippingPlanName:shippingPlan,
            shippingPlanRate: parseFloat(shippingRate),
            updatedAt: new Date(),
            createdAt: new Date(),
         }
  });

  if(addCountry && addShippingPlan){
          if(addShippingPlan){
            const responsex = {
              message:'Country and Shipping Plan has been added!.',
              status: 'SUCCESS',
            };
            return NextResponse.json(
              { responsex, successx: true, userx: null },
              { status: 200 },
            ); 
        }
    }



 

  }
  //END
}