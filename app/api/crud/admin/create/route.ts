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
        const pidUser = formData.get('pidUser') as string;
        const pidCategory = formData.get('pidCategory') as string;
        const categoryName = formData.get('categoryName') as string;
        const categoryInfo = formData.get('categoryInfo') as string;
        // const categorySeq = formData.get('categorySeq') as string;
        // const categoryAdditionalInfo = formData.get('categoryAdditionalInfo') as string;
        // const categoryTags = formData.get('categoryTags') as string;



  //GET FILE FROM FROM
  //const file = formData.get('file') as File;

  //CHECK IF FILE IS UPLOADED
  // if (!file) {
  //   const responsex = {
  //     message:
  //       'No Image file has been selected',
  //     status: 'NO_IMAGE_SELECTED',
  //   };
  //   return NextResponse.json(
  //     { responsex, successx: true, userx: null },
  //     { status: 401 },
  //   );
  // }

  const productCode:string = randomGenerator(20);

  //SET FILE NAME & GET FILE PARAMS
  // const originalFileName = file.name;
  // const fileType = file.type;
  // const fileExt = getFileExt(originalFileName);
  // const fileSize = file.size;
  // const newFileName = "IMG"+productCode;

  //CHECK FILE VALIDITY
  // const allowedExt: string[] = ['png', 'jpg', 'jpeg', 'PNG', 'JPG', 'JPEG'];//enter only permitted extensions
  // const fileOK = fileFilter(fileExt, allowedExt);

  // if(fileOK){}else{
  //       const responsex = {
  //         message:
  //           'Please select only valid images '+fileExt+' is not allowed',
  //         status: 'INVALID_IMAGE_UPLOAD',
  //       };
  //       return NextResponse.json(
  //         { responsex, successx: true, userx: null },
  //         { status: 401 },
  //       );
  // }


  //GENERATE PRODUCT ID AND SLUG STRING
  //const pidProduct = "PRD"+productCode;
  //const categorySlug = generateSlug(categoryName);


  //UPLOAD PRODUCT DETAILS
  const category = await prisma.buy_category.create({
    data: { 
            pidUser: pidUser, 
            pidCategory: productCode, 
            categoryName: categoryName, 
            categoryInfo: categoryInfo, 
            createdAt: new Date(),
         }
  })


      //CHECK IF PRODUCT DETAILS HAVE BEEN SUCCESSFULY UPLOADED THEN UPLOAD IMAGE
      if(category && category.id)
          {
              return NextResponse.json(
              { statusx:'SUCCESS', message: 'Category was successfuly created.'},
              { status: 200 },
            );
          }else{
            return NextResponse.json(
              { statusx:'FAILED', message: 'Category Creation Failed!'},
              { status: 401 },
            );
          }
 

  //END
}