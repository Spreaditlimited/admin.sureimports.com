// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextResponse } from 'next/server';
import { generateSlug } from '@/utils/slugGenerator';
//import r2ImageUpload from '@/lib/helpers/r2ImageUpload';
import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';
import { rmbPriceNgn, updateStoreWithRmbPricing } from '@/lib/shop/rmb-pricing.mjs';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

const prisma = new PrismaClient();


export async function POST(request: Request) {
        const access = await requireAdminServiceAccess('store_mgt', 'edit');
        if (!access.ok) return access.response;

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

        const affiliatePayout = formData.get('affiliatePayout') as any;
        const superAffiliatePayout = formData.get('superAffiliatePayout') as any;
        const productCondition = formData.get('productCondition') as any;
        const warrantyPeriod = formData.get('warrantyPeriod') as any;

        const isProductVisible = formData.get('isProductVisible') as any;

        const supplierRmb = formData.get('supplierRmb');
        const markupRmb = formData.get('markupRmb');
        let rmbSource: { supplierRmb: number; markupRmb: number } | undefined;
        if (supplierRmb !== null || markupRmb !== null) {
          try {
            if (typeof supplierRmb !== 'string' || !supplierRmb.trim() ||
                typeof markupRmb !== 'string' || !markupRmb.trim()) throw new Error('Both RMB fields are required.');
            rmbPriceNgn(supplierRmb, markupRmb, 1);
            rmbSource = { supplierRmb: Number(supplierRmb), markupRmb: Number(markupRmb) };
          } catch {
            return NextResponse.json({ statusx: 'INVALID_INPUT', message: 'Enter a positive RMB supplier price and a non-negative RMB markup.' }, { status: 400 });
          }
        }

  //CHECK IF PRODUCTS EXISTS
  const product = await prisma.store.findUnique({
    where: {
        pidProduct: pidProduct,
    },
  });


  //GET FILE FROM FROM
  const file = formData.get('file') as File;


          const productCode:string = pidProduct;

        
          //GENERATE PRODUCT ID AND SLUG STRING
          const productSlug = generateSlug(productName);


  const updateData: any = {
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

    affiliatePayout: parseFloat(affiliatePayout),
    superAffiliatePayout: parseFloat(superAffiliatePayout),
    productCondition: productCondition,
    warrantyPeriod: warrantyPeriod,

    updatedAt: new Date(),
  };

  let imageStatus = 'YES';

  //CHECK IF IMAGE IS SELECTED OR IF IMAGE EXISTS IN DB
  if (!file || !(file instanceof File)) {
    if (product?.productImage == null) {
          return NextResponse.json(
            { statusx:'NO_IMAGE_SELECTED', message: 'No Image file has been selected'},
            { status: 401 },
          );
    } else {
      imageStatus = 'NO';
    }
  }

  if (imageStatus == 'NO') {
    await prisma.$transaction((tx) => updateStoreWithRmbPricing(tx, pidProduct, updateData, rmbSource));

    //RETURN SUCCESS CONTENT UPLOAD
    return NextResponse.json(
      { statusx:'SUCCESS', message: 'Product was successfuly updated'},
      { status: 200 },
    );
  } else {
      //FILE DETAILS (NAME, SIZE, TYPE)
      const originalFileName = file.name;
      const fileSize = file.size;
      const fileType = file.type;
      const productCode: string = randomGenerator(20);
      const fileExt = getFileExt(originalFileName);
      const newFileName = 'IMG' + productCode;

      //CHECK FILE VALIDITY
      const allowedExt: string[] = ['png', 'jpg', 'jpeg', 'PNG', 'JPG', 'JPEG', 'webp', 'WEBP', 'svg', 'SVG']; //enter only permitted extensions
      const fileOK = fileFilter(fileExt, allowedExt);

      if (fileOK) {
      } else {
            return NextResponse.json(
              { statusx:'INVALID_IMAGE_UPLOAD', message: 'Please select only valid images, ' + fileExt + ' is not allowed'},
              { status: 401 },
            );
      }

    ///////////// IMAGE UPLOAD TO R2 STARTS /////////////
    try {
      //GET FILE PAYLOAD
      const buffer = await file.arrayBuffer();

      const uploadResult = await uploadBufferToCloudinary(Buffer.from(buffer), {
        folder: 'admin-sureimports/store',
        publicId: newFileName,
        useFilename: false,
        uniqueFilename: false,
        overwrite: true,
      });

      await prisma.$transaction((tx) => updateStoreWithRmbPricing(tx, pidProduct, {
          ...updateData,
          productImage: uploadResult.publicId,
          productImageType: fileType,
          productImageExt: fileExt,
        }, rmbSource));

      //RETURN SUCCESS ON FILE UPLOAD
      return NextResponse.json(
        { statusx:'SUCCESS', message: 'Product was successfuly updated'},
        { status: 200 },
      );
    } catch (error) {
      //CATCH ANY ERRORS ON FAILED UPLOAD
          return NextResponse.json(
            { statusx:'IMAGE_UPLOAD_FAILED', message: 'Product Uploaded but failed image upload, please contact your admin for issue resolution. ERROR::' +
              error,},
            { status: 401 },
          );
    }
    ///////////// IMAGE UPLOAD TO R2 STOPS /////////////
  }



  //END
}
