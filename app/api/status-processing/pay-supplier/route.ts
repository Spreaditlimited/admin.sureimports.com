// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import { getR2Client } from '@/app/utils/r2Client';
import { Upload } from '@aws-sdk/lib-storage';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextResponse } from 'next/server';
import { generateSlug } from '@/utils/slugGenerator';
import xMail from '@/lib/email/xMail2';

const prisma = new PrismaClient();


export async function POST(request: Request) {

  return NextResponse.json(
    { statusx: 'SUCCESS_MESSAGE', message: 'Message has been successfuly sent!' },
    { status: 200 },
  );
  
  //GET FORM DATA
  const formData = await request.formData();
  const pidUser = formData.get('pidUser') as string;
  const pidOrder = formData.get('pidOrder') as string;
  const currentStatus = formData.get('currentStatus') as string;
  const newStatus = formData.get('newStatus') as string;
  const message = formData.get('message') as string;
  const pidMessage = formData.get('pidMessage') as string;




  //CHECK IF USER PID AND CID EXISTS
  const user = await prisma.users.findUnique({
    where: {
      pidUser: pidUser,
      //userEmail: email,
    },
  });



  //SEND ONLY MESSAGE NOTIFICATION
  if(newStatus == 'message'){
    const messagex = await prisma.messages.create({
      data: {
              pidMessage: pidMessage,
              pidOrder: pidOrder,
              pidFrom: 'hello@sureimports.com',
              pidTo: user?.userEmail,
              fullName: user?.userFirstname,
              messageTitle: 'Admin Message: '+newStatus.toUpperCase(),
              messageContent: message,
              messageStatus:    'unread',
              createdAt:       new Date(),
              updatedAt:       new Date(),
            },
          });
 
  
    // .................... SPECIAL ADMIN MESSAGE STAGE MAIL ....................//
      const xEmail = user?.userEmail as string;
      const xTitle = `SureImports`;
      const xBodyTitle = `Special Admin Message`;
      const xBody1 = `Hello ` + user?.userFirstname + `,` +
  `<p>Find the admin message below for your order with ID :<b>`+pidOrder+`</b>. This is a special Admin Message.</p>
  <p>You may contact the admin fo further clarification.</p>
  <p>You may also Log into your SureImports account, go to the dashboard to view the specific order.</p>` +
  `<br /><br /> <b>::::: Admin Message :::::</b><br />`+ (message != ''  ? message : 'No message available.');
      const xBody2 = ``;
      const xButtonTitle = '';
      const xButtonLink = '';
      await xMail({
        xEmail,
        xTitle,
        xBodyTitle,
        xBody1,
        xBody2,
        xButtonTitle,
        xButtonLink,
      });
      //success update
      return NextResponse.json(
        { statusx: 'SUCCESS_MESSAGE', message: 'Message has been successfuly sent!' },
        { status: 200 },
      );
  }


  //SEND GENERAL MESSAGE
  const messagex = await prisma.messages.create({
    data: {
      pidMessage: pidMessage,
      pidOrder: pidOrder,
      pidFrom: 'admin@sureimports.com',
      pidTo: user?.userEmail,
      fullName: user?.userFirstname,
      messageTitle: 'Admin Message: '+newStatus.toUpperCase(),
      messageContent: message,
      messageStatus:    'unread',
      createdAt:       new Date(),
      updatedAt:       new Date(),
    },
  });




    //UPDATE SERVICE STATUS 
    const updatex = await prisma.pay_supplier.update({
      where: {  
                pidUser: pidUser, 
                pidPaySupplier: pidOrder 
             },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });




              
                
 //*************************************** MESSAGING BLOCK STARTS ***************************************//
    if(updatex) {


    // .................... PAID SUPPLIER STAGE MAIL ....................//
    if(newStatus == "paid-supplier"){

        //SEND EMAIL TO USER
        const xEmail = user?.userEmail as string;
        const xTitle = `Supplier has been paid`;
        const xBodyTitle = `Supplier has been paid`;
        const xBody1 = `Hello ` + user?.userFirstname + `,` +
        `<p>Your Pay Supplier order with ID :<b>`+pidOrder+`</b>  has been successfuly made to your Supplier.</p>
        <p>Thank you for doing buisness with SureImports Pay Supplier.</p>
        <p>Log into your SureImports account, to view this order.</p>` +
        `<br /><br /> <b>::::: Admin Message :::::</b><br />`+ (message != ''  ? message : 'No message available.');
        const xBody2 = ``;
        const xButtonTitle = '';
        const xButtonLink = '';
        await xMail({
          xEmail,
          xTitle,
          xBodyTitle,
          xBody1,
          xBody2,
          xButtonTitle,
          xButtonLink,
        });
          //success update
          return NextResponse.json(
            { statusx: 'SUCCESS', message: 'Order has been successfully moved to Paid Supplier stage.' },
            { status: 200 },
          );
        }else{
          //success update
          return NextResponse.json(
            { statusx: 'ACTION_FAILED', message: 'Action Failed! You may need to try again, or contact the Admin.' },
            { status: 401 },
          );
        }






        // .................... REQUEST CANCELLED STAGE MAIL ....................//
        if(newStatus == "request-cancelled"){

          //SEND EMAIL TO USER
        const xEmail = user?.userEmail as string;
        const xTitle = `Request Cancelled`;
        const xBodyTitle = `Pay Supplier Request has been cancelled`;
        const xBody1 = `Hello ` + user?.userFirstname + `,` +
        `<p>Your Pay Supplier order with ID :<b>`+pidOrder+`</b> has been cancelled.</p>
        <p>You may contact the SureImports Processing Team for further clarity on this cancellation.</p>
        <p>Log into your SureImports account, go to <b>Pay Supplier Services</b> to view this order.</p>` +
        `<br /><br /> <b>::::: Admin Message :::::</b><br />`+ (message != ''  ? message : 'No message available.');
        const xBody2 = ``;
        const xButtonTitle = '';
        const xButtonLink = '';
        await xMail({
          xEmail,
          xTitle,
          xBodyTitle,
          xBody1,
          xBody2,
          xButtonTitle,
          xButtonLink,
        });
          //success update
          return NextResponse.json(
            { statusx: 'CANCELLED', message: 'Order has been successfully cancelled.' },
            { status: 200 },
          );
        }else{
          //success update
          return NextResponse.json(
            { statusx: 'ACTION_FAILED', message: 'Action Failed! You may need to try again, or contact the Admin.' },
            { status: 401 },
          );
        }









  //END
}
}