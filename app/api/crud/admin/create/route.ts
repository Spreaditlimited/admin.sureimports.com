// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import getFileExt from '@/app/utils/fileExt'
import fileFilter from '@/app/utils/fileFilter'
import randomGenerator from "@/lib/helpers/randomGenerator";
import { NextResponse } from 'next/server';
import { generateSlug } from '@/app/utils/slugGenerator'
import bcrypt from "bcryptjs"

const prisma = new PrismaClient();


export async function POST(request: Request) {

        const formData = await request.formData();
        const pidUser = formData.get('pidUser') as string;
        const pidAdminUser = formData.get('pidAdminUser') as string;
        const accountName = formData.get('accountName') as string;
        const firstName = formData.get('firstName') as string;
        const lastName = formData.get('lastName') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as any;
        const password = formData.get('password') as string;
        const authorizationLevel = formData.get('authorizationLevel') as string;

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
