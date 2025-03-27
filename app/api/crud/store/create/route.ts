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
import bcrypt from "bcryptjs"

const prisma = new PrismaClient();


export async function POST(request: Request) {

        const formData = await request.formData();
        const productName = formData.get('productName') as string;
        const productCategory = formData.get('productCategory') as string;
        const productBrand = formData.get('productBrand') as string;
        const productPrice = formData.get('productPrice') as string;
        const productMOQ = formData.get('productMOQ') as string;
        const productDescription = formData.get('productDescription') as string;
        const productFeatures = formData.get('productFeatures') as string;
        const productSpecification = formData.get('productSpecification') as any;

console.log(formData)

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

  //const productCode:string = randomGenerator(20);

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


const existingUser = await prisma.admin.findUnique({ where: { userEmail:email } })
if (existingUser) {
            return NextResponse.json(
              { statusx:'USER_EXISTS', message: 'Admin User already exists!'},
              { status: 401 },
            );
}


const hashedPassword = await bcrypt.hash(password, 10)

  //UPLOAD PRODUCT DETAILS
  const admin = await prisma.admin.create({
    data: { 
            pidUser: pidAdminUser, 
            userFirstname: firstName, 
            userLastname: lastName, 
            userEmail: email, 
            userPhone: parseInt(phone), 
            userPassword: hashedPassword, 
            userStatus: authorizationLevel, 
            userExt1: accountName,
            createdAt: new Date(),
         }
  })


      //CHECK IF PRODUCT DETAILS HAVE BEEN SUCCESSFULY UPLOADED THEN UPLOAD IMAGE
      if(admin && admin.id)
          {
              return NextResponse.json(
              { statusx:'SUCCESS', message: 'Admin User was successfuly created.'},
              { status: 200 },
            );
          }else{
            return NextResponse.json(
              { statusx:'FAILED', message: 'Admin User Creation Failed!'},
              { status: 401 },
            );
          }
 

  //END
}