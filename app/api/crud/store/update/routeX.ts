// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import getFileExt from '@/app/utils/fileExt'
import fileFilter from '@/app/utils/fileFilter'
import randomGenerator from "@/lib/helpers/randomGenerator";
import { NextResponse } from 'next/server';
import { generateSlug } from '@/app/utils/slugGenerator'
import bcrypt from "bcryptjs"
import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';

const prisma = new PrismaClient();


export async function POST(request: Request) {

        const formData = await request.formData();
        const productImage = formData.get('file') as File;
        const pidProduct = formData.get('pidProduct') as string;
        const productName = formData.get('productName') as string;
        const productCategory = formData.get('productCategory') as string;
        const productBrand = formData.get('productBrand') as string;
        const productPrice = formData.get('productPrice') as string;
        const productMOQ = formData.get('productMOQ') as string;
        const productDescription = formData.get('productDescription') as string;
        const productFeature = formData.get('productFeatures') as string;
        const productSpecification = formData.get('productSpecification') as any;

        console.log(formData)
        

  //GET FILE FROM FROM
  const file = formData.get('file') as File;

  //CHECK IF FILE IS UPLOADED
  if (!file) {

    return NextResponse.json(
      { statusx:'NO_IMAGE_SELECTED', message: 'No Image file has been selected'},
      { status: 401 },
    );

  }
  
  //const productCode:string = randomGenerator(20);
  const productCode:string = pidProduct;

  //SET FILE NAME & GET FILE PARAMS
  const originalFileName = file.name;
  const fileType = file.type;
  const fileExt = getFileExt(originalFileName);
  const fileSize = file.size;
  const newFileName = "IMG"+productCode;

  //CHECK FILE VALIDITY
  const allowedExt: string[] = ['png', 'jpg', 'jpeg', 'PNG', 'JPG', 'JPEG'];//enter only permitted extensions
  const fileOK = fileFilter(fileExt, allowedExt);

  if(fileOK){}else{
    return NextResponse.json(
      { statusx:'INVALID_IMAGE_UPLOAD', message: 'Please select only valid images '+fileExt+' is not allowed'},
      { status: 401 },
    );

  }


  //GENERATE PRODUCT ID AND SLUG STRING
  const productSlug = generateSlug(productName);


  //UPLOAD PRODUCT DETAILS
  const product = await prisma.store.create({
    data: { 
            pidProduct: pidProduct, 
            productName: productName, 
            productSlug: productSlug, 
            productCategory: productCategory,
            productBrand: productBrand,
            productPrice: parseFloat(productPrice),
            productMOQ: parseFloat(productMOQ),
            productDescription: productDescription,
            productFeature: productFeature,
            productSpecification: productSpecification,
            productVisibility: true,
            productImage: newFileName,
            productImageType: fileType,
            productImageExt: fileExt,
            createdAt: new Date(),
         }
  })


      //CHECK IF PRODUCT DETAILS HAVE BEEN SUCCESSFULY UPLOADED THEN UPLOAD IMAGE
      if(product && product.id)
          {


                ///////////// IMAGE UPLOAD TO R2 STARTS /////////////
                try {
                        //GET FILE PAYLOAD
                        const buffer = await file.arrayBuffer();

                        await uploadBufferToCloudinary(Buffer.from(buffer), {
                          folder: 'admin-sureimports/store',
                          publicId: newFileName,
                          useFilename: false,
                          uniqueFilename: false,
                          overwrite: true,
                        });

                        //RETURN SUCCESS ON FILE UPLOAD
                        return NextResponse.json(
                          { statusx:'SUCCESS', message: 'Product was successfuly added'},
                          { status: 200 },
                        );


                } catch (error) {
                        //CATCH ANY ERRORS ON FAILED UPLOAD
                        return NextResponse.json(
                          { statusx:'IMAGE_UPLOAD_FAILED', message: 'Product Uploaded but failed image upload, please contact your admin for issue resolution. ERROR::'+error},
                          { status: 401 },
                        );
                }
              ///////////// IMAGE UPLOAD TO R2 STOPS /////////////

          }else{
                //GET RESPONSE MESSAGE FOR THE FORM FEEDBACK
                return NextResponse.json(
                  { statusx:'ACTION_FAILED', message: 'Failed saving record! Please contact the admin.'},
                  { status: 401 },
                );
          }
 


  //END
}
