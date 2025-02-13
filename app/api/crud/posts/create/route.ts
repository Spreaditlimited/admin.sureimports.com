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
        const pidPost = formData.get('pidPost') as string;
        const title = formData.get('title') as string;
        const category = formData.get('category') as string;
        const content = formData.get('content') as string;
        const tags = formData.get('tags') as string;



  //GET FILE FROM FROM
  const file = formData.get('file') as File;

  //CHECK IF FILE IS UPLOADED
  if (!file) {
    const responsex = {
      message:
        'No Image file has been selected',
      status: 'NO_IMAGE_SELECTED',
    };
    return NextResponse.json(
      { responsex, successx: true, userx: null },
      { status: 401 },
    );
  }

  const imageCode:string = randomGenerator(20);

  //SET FILE NAME & GET FILE PARAMS
  const originalFileName = file.name;
  const fileType = file.type;
  const fileExt = getFileExt(originalFileName);
  const fileSize = file.size;
  const newFileName = "IMG"+imageCode;

  //CHECK FILE VALIDITY
  const allowedExt: string[] = ['png', 'jpg', 'jpeg', 'PNG', 'JPG', 'JPEG'];//enter only permitted extensions
  const fileOK = fileFilter(fileExt, allowedExt);

  if(fileOK){}else{
        const responsex = {
          message:
            'Please select only valid images '+fileExt+' is not allowed',
          status: 'INVALID_IMAGE_UPLOAD',
        };
        return NextResponse.json(
          { responsex, successx: true, userx: null },
          { status: 401 },
        );
  }


  //GENERATE PRODUCT ID AND SLUG STRING
  //const pidProduct = "PRD"+productCode;
  const slug = generateSlug(title);


  //UPLOAD PRODUCT DETAILS
  const postx = await prisma.posts.create({
    data: { 
            pidPost:pidPost,
            title:title,
            slug:slug,
            category:category,
            content:content,
            tags:tags,
            image:newFileName,
            author:'Admin',
            updatedAt: new Date(),
            createdAt: new Date(),
         }
  })


      //CHECK IF PRODUCT DETAILS HAVE BEEN SUCCESSFULY UPLOADED THEN UPLOAD IMAGE
      if(postx && postx.id)
          {


                ///////////// IMAGE UPLOAD TO R2 STARTS /////////////
                try {
                        //GET FILE PAYLOAD
                        const buffer = await file.arrayBuffer();

                        //FILE UPLOAD DETAILS
                        const upload = new Upload({
                                client: getR2Client(),
                                params: {
                                          Bucket: process.env.R2_BUCKET_NAME,
                                          Key: newFileName,
                                          Body: Buffer.from(buffer),
                                          ContentType: fileType,
                                        },
                                });

                        //UPLOAD FILE
                        await upload.done();

                        //RETURN SUCCESS ON FILE UPLOAD
                        const responsex = {
                          message:
                            'Post was successfuly published',
                          status: 'SUCCESS',
                        };
                        return NextResponse.json(
                          { responsex, successx: true, userx: null },
                          { status: 401 },
                        );

                } catch (error) {
                        //CATCH ANY ERRORS ON FAILED UPLOAD
                        const responsex = {
                          message:
                            'Post Uploaded but failed image upload, please contact your admin for issue resolution. ERROR::'+error,
                          status: 'IMAGE_UPLOAD_FAILED',
                        };
                        return NextResponse.json(
                          { responsex, successx: true, userx: null },
                          { status: 401 },
                        );
                }
              ///////////// IMAGE UPLOAD TO R2 STOPS /////////////

          }else{
                //GET RESPONSE MESSAGE FOR THE FORM FEEDBACK
                const responsex = {
                  message:
                    'Failed saving record! Please contact the admin.',
                  status: 'ACTION_FAILED',
                };
                return NextResponse.json(
                  { responsex, successx: true, userx: null },
                  { status: 401 },
                );
          }
 



  //END
}