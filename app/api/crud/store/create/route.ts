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

import { createStoreWithRmbPricing, parseRmbSource } from '@/lib/shop/rmb-pricing.mjs';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

const prisma = new PrismaClient();


export async function POST(request: Request) {

        const access = await requireAdminServiceAccess('store_mgt', 'edit');
        if (!access.ok) return access.response;
        const formData = await request.formData();
        let rmbSource;
        try { rmbSource = parseRmbSource(formData); }
        catch { return NextResponse.json({ statusx: 'INVALID_INPUT', message: 'Enter a positive supplier RMB price and non-negative RMB markup.' }, { status: 400 }); }
        if (['laptop', 'laptops'].includes(String(formData.get('productCategory')).toLowerCase()) && !rmbSource) {
          return NextResponse.json({ statusx: 'INVALID_INPUT', message: 'Laptop supplier price and markup in RMB are required.' }, { status: 400 });
        }
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

        const affiliatePayout = formData.get('affiliatePayout') as any;
        const superAffiliatePayout = formData.get('superAffiliatePayout') as any;
        const productCondition = formData.get('productCondition') as any;
        const warrantyPeriod = formData.get('warrantyPeriod') as any;

        const isProductVisible = formData.get('isProductVisible') as any;




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
  const allowedExt: string[] = ['png', 'jpg', 'jpeg', 'PNG', 'JPG', 'JPEG', 'webp', 'WEBP', 'svg', 'SVG'];//enter only permitted extensions
  const fileOK = fileFilter(fileExt, allowedExt);

  if(fileOK){}else{
    return NextResponse.json(
      { statusx:'INVALID_IMAGE_UPLOAD', message: 'Please select only valid images '+fileExt+' is not allowed'},
      { status: 401 },
    );

  }


  //GENERATE PRODUCT ID AND SLUG STRING
  const productSlug = generateSlug(productName);


  try {
    const buffer = await file.arrayBuffer();
    const uploadResult = await uploadBufferToCloudinary(Buffer.from(buffer), {
      folder: 'admin-sureimports/store',
      publicId: newFileName,
      useFilename: false,
      uniqueFilename: false,
      overwrite: true,
    });

    const product = await prisma.$transaction(tx => createStoreWithRmbPricing(tx, {
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
        productVisibility: isProductVisible === 'true' ? true : false,
        productImage: uploadResult.publicId,
        productImageType: fileType,
        productImageExt: fileExt,

        affiliatePayout: parseFloat(affiliatePayout),
        superAffiliatePayout: parseFloat(superAffiliatePayout),
        productCondition: productCondition,
        warrantyPeriod: warrantyPeriod,

        createdAt: new Date(),
      }, rmbSource));

    if (product && product.id) {
      return NextResponse.json(
        { statusx:'SUCCESS', message: 'Product was successfuly added'},
        { status: 200 },
      );
    }

    return NextResponse.json(
      { statusx:'ACTION_FAILED', message: 'Failed saving record! Please contact the admin.'},
      { status: 401 },
    );
  } catch (error) {
    return NextResponse.json(
      { statusx:'IMAGE_UPLOAD_FAILED', message: 'Product image upload failed, please contact your admin for issue resolution. ERROR::'+error},
      { status: 401 },
    );
  }
 


  //END
}
