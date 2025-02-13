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
  //GET FORM DATA ##
  const formData = await request.formData();
  const pidUser = formData.get('pidUser') as string;
  const pidOrder = formData.get('pidOrder') as string;
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



    //UPDATE SERVICE STATUS 
    const updatex = await prisma.orders.update({
      where: {  
                pidUser: pidUser, 
                pidOrder: pidOrder 
             },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });


    //INSERT RECORDS TO MESSAGES
    const post = await prisma.messages.create({
      data: {
      pidMessage: pidMessage,
      pidOrder: pidOrder,
      pidFrom: 'admin@sureimports.com',
      pidTo: user?.userEmail,
      fullName: user?.userFirstname,
      messageTitle: 'Admin Message: '+newStatus.toUpperCase(),
      messageContent: message,
      messageStatus:    'unread'
      // messageStatusUser    String?
      // delStatus    String?
      // status          String?
      // ext1            String?
      // ext2            String?
      // xStatus            String?
      // createdAt          DateTime  @default(now())
      // updatedAt          DateTime?
      },
    });



    if(updatex) {
    //SEND EMAIL TO USER
  try {
    ////////////////////// SEND BANK PAYMENT EMAIL BLOCK STARTS //////////////////////
    //import { xMail } from '@/lib/email/xMail';

    // .................... SAVED(DECLINED) STAGE MAIL
    if(newStatus == "on-hold"){
    const xEmail = user?.userEmail as string;
    const xTitle = `Order is Declined`;
    const xBodyTitle = `Order has been Declined`;
    const xBody1 = `Dear ` + user?.userFirstname; + `,` +
      `<br />Your Order with ID:`+pidOrder+` has been declined, and is currently placed On-hold.`;
    const xBody2 = `You are to contact the admin for closure, a refund will also been generated for you to request withdrawal if order process cannot continue. <br /> You may check your dashboard status for progress.<br /> Thank you.`;
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
    ////////////////////// SEND REGISTRATION EMAIL BLOCK STARTS //////////////////////
    console.log('Email was Successfully sent!');

        //success update
        const responsex = {
            message:
              'Order has been successfully moved to Pending.',
            status: 'SUCCESS',
          };
          return NextResponse.json(
            { responsex, successx: true, userx: null },
            { status: 200 },
          );
    }



        // .................... APPROVED STAGE MAIL
        if(newStatus == "approved"){
            const xEmail = user?.userEmail as string;
            const xTitle = `Order is Approved`;
            const xBodyTitle = `Order has been Approved`;
            const xBody1 = 'Dear ' + user?.userFirstname; + ', <br />Your Order with ID:`+pidOrder+` has been approved, and is currently being processed.';
            const xBody2 = `You will be notified of the next processing stage of your order. <br /> You may check your dashboard status for progress.<br /> Thank you.`;
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
            ////////////////////// SEND REGISTRATION EMAIL BLOCK STARTS //////////////////////
            console.log('Email was Successfully sent!');
        
                //success update
                const responsex = {
                    message:
                      'Order has been successfully moved to Pending.',
                    status: 'SUCCESS',
                  };
                  return NextResponse.json(
                    { responsex, successx: true, userx: null },
                    { status: 200 },
                  );
            }


    // .................... PAY FOR SHIPPING STAGE MAIL
    if(newStatus == "pay-for-shipping"){
        const xEmail = user?.userEmail as string;
        const xTitle = `Pay for Shipping`;
        const xBodyTitle = `Pay for Order Shippment`;
        const xBody1 = `Dear ` + user?.userFirstname; + `,` +
          `<br />Your Order with ID:`+pidOrder+` has been moved to the next stage, and you are requested to pay for shipping.`;
        const xBody2 = `You can log into your dashboard to make payment. <br /> You may also check your dashboard status for progress.<br /> Thank you.`;
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
        ////////////////////// SEND REGISTRATION EMAIL BLOCK STARTS //////////////////////
        console.log('Email was Successfully sent!');
    
            //success update
            const responsex = {
                message:
                  'Order has been successfully moved to Pending.',
                status: 'SUCCESS',
              };
              return NextResponse.json(
                { responsex, successx: true, userx: null },
                { status: 200 },
              );
        }


    // .................... IN-TRANSIT STAGE MAIL
    if(newStatus == "in-transit"){
        const xEmail = user?.userEmail as string;
        const xTitle = `Order In-Transit`;
        const xBodyTitle = `Order now In-Transit`;
        const xBody1 = `Dear ` + user?.userFirstname; + `,` +
          `<br />Your Order with ID:`+pidOrder+` has been moved to the next stage, and is currently in-transit to your destination.`;
        const xBody2 = `You will be notified of the next processing stage of your order. <br /> You may also check your dashboard status for progress.<br /> Thank you.`;
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
        ////////////////////// SEND REGISTRATION EMAIL BLOCK STARTS //////////////////////
        console.log('Email was Successfully sent!');
    
            //success update
            const responsex = {
                message:
                  'Order has been successfully moved to Pending.',
                status: 'SUCCESS',
              };
              return NextResponse.json(
                { responsex, successx: true, userx: null },
                { status: 200 },
              );
        }


            // .................... READY FOR PICKUP STAGE MAIL
            if(newStatus == "ready-for-pickup"){
                const xEmail = user?.userEmail as string;
                const xTitle = `Order is Ready for PickUp`;
                const xBodyTitle = `Order is now Ready for PickUp`;
                const xBody1 = `Dear ` + user?.userFirstname; + `,` +
                  `<br />Your Order with ID:`+pidOrder+` has been moved to the next stage, and is currently Ready for PickUp at your destination.`;
                const xBody2 = `You will be notified of the next processing stage of your order. <br /> You may also check your dashboard status for progress.<br /> Thank you.`;
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
                ////////////////////// SEND REGISTRATION EMAIL BLOCK STARTS //////////////////////
                console.log('Email was Successfully sent!');
            
                    //success update
                    const responsex = {
                        message:
                          'Order has been successfully moved to Pending.',
                        status: 'SUCCESS',
                      };
                      return NextResponse.json(
                        { responsex, successx: true, userx: null },
                        { status: 200 },
                      );
                }



            // .................... COMPLETED STAGE MAIL
            if(newStatus == "completed"){
                const xEmail = user?.userEmail as string;
                const xTitle = `Order process is Completed!`;
                const xBodyTitle = `Order process has not been Completed`;
                const xBody1 = `Dear ` + user?.userFirstname; + `,` +
                  `<br />Your Order with ID:`+pidOrder+` has been moved to the next stage, and is order process is now completed.`;
                const xBody2 = `You will be notified of the next processing stage of your order. <br /> You may also check your dashboard status for progress.<br /> Thank you.`;
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
                ////////////////////// SEND REGISTRATION EMAIL BLOCK STARTS //////////////////////
                console.log('Email was Successfully sent!');
            
                    //success update
                    const responsex = {
                        message:
                          'Order has been successfully moved to Pending.',
                        status: 'SUCCESS',
                      };
                      return NextResponse.json(
                        { responsex, successx: true, userx: null },
                        { status: 200 },
                      );
                }




  } catch (error) {
    console.error('Failed to send email:', error);
    const responsex = {
        message:
          'Action Failed! You may need to try again, or contact the Admin.',
        status: 'ACTION_FAILED',
      };
      return NextResponse.json(
        { responsex, successx: true, userx: null },
        { status: 401 },
      );
  }



  } else {
    const responsex = {
      message:
        'Action Failed! You may need to try again, or contact the Admin.',
      status: 'ACTION_FAILED',
    };
    return NextResponse.json(
      { responsex, successx: true, userx: null },
      { status: 401 },
    );
  }

  //END
}
