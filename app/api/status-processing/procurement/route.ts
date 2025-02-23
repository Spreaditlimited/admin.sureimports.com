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
  console.log('++++++++++++++++++++++++++mmmmm+++++++++++++++++++++++++++=');
  //GET FORM DATA
  const formData = await request.formData();
  const pidUser = formData.get('pidUser') as string;
  const pidOrder = formData.get('pidOrder') as string;
  const currentStatus = formData.get('currentStatus') as string;
  const newStatus = formData.get('newStatus') as string;
  const message = formData.get('message') as string;
  const pidMessage = formData.get('pidMessage') as string;


// return NextResponse.json(
//   { statusx: 'SUCCESS_MESSAGE', message: 'TEST 123 Order has been successfully moved to Pending.'+currentStatus},
//   { status: 200 },
// );


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

    //success update
    return NextResponse.json(
      { statusx: 'SUCCESS', message: 'Order has been successfully moved to Pending.' },
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





              
                
 //*************************************** MESSAGING BLOCK STARTS ***************************************//
    if(updatex) {
    //SEND EMAIL TO USER
  try {
    // .................... ON-HOLD(DECLINED) STAGE MAIL ....................//
    if(newStatus == "on-hold"){
    const xEmail = user?.userEmail as string;
    const xTitle = `Order is Declined`;
    const xBodyTitle = `Order has been placed On-Hold`;
    const xBody1 = `Hello ` + user?.userFirstname + `,` +
`<p>Unfortunately, your order with ID :<b>`+pidOrder+`</b> has been <b>Declined and Placed On-Hold</b>.</p>
<p>You will have to review and update this order.</p>
<p>Log into your Spreadit account, go to <b>On-Hold Orders</b> to view this order.</p>` +
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
      { statusx: 'SUCCESS', message: 'Order has been successfully moved to Pending.' },
      { status: 200 },
    );
    }





    
            // .................... SAVED STAGE MAIL ....................//
            if(newStatus == "saved"){
              const xEmail = user?.userEmail as string;
              const xTitle = `Order is Ready for PickUp`;
              const xBodyTitle = `Order is now Ready for PickUp`;
              const xBody1 = `Hello ` + user?.userFirstname + `,` +
              `<p>Unfortunately Your Bank Payment for order with ID :<b>`+pidOrder+`</b> has been declined, the order has been sent back to <b>Saved Stage</b> awaiting your review.</p>
              <p>You may be required to confirm this payment transaction with your processing bank.</p>
              <p>Log into your Spreadit account, go back to <b>Saved Orders</b> to view this order.</p>` +
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
                  { statusx: 'SUCCESS', message: 'Order has been successfully moved to Cancelled Order.' },
                  { status: 200 },
                );
              }




        // .................... APPROVED STAGE MAIL ....................//
        if(newStatus == "approved"){
            const xEmail = user?.userEmail as string;
            const xTitle = `Order is Approved`;
            const xBodyTitle = `Order has been Approved`;
            const xBody1 = `Hello ` + user?.userFirstname + `,` +
            `<p>Congratulations!</p>

            <p>We have concluded our first level checks of your order with ID :<b>`+pidOrder+`</b> and have approved it for purchase by our procurement agents in China.</p>
            
            <p>
            While we do our best to deliver every order within the time frame stated on our website, kindly note that a few things could cause delays:</p><br>
            
            <p><strong>(1) The actual availability of what you have ordered</strong></p>
            <div>Some suppliers do not always have what they say they have. This could lead to delays as we either wait for them or have to cancel an order.</div>
            
            <p><strong>(2) The sheer distance between the suppliers and our office in Guangzhou</strong></p>
            <div>The farther a supplier is from us, the longer it takes for goods sent to us to arrive.</div>
            
            <p><strong>(3) The number of products in this order</strong></p>
            <div>If this order has multiple products, note that some suppliers may not ship out to us as fast as others. We will have to wait for all your orders to arrive.</div>
            
            <p><strong>(4) 
            If we do not find exactly what you have ordered</strong></p>
            <div> The supplier may not have the exact colours you ordered, we will have to communicate this to you. To ensure a smooth and timely resolution of this kind of issues, please, check your email often and respond to issues as fast they arise. Keep your phone lines open for our calls should we decide to follow up with a call. </div>
            
            <p>
            Apart from the above, we expect to deliver within the timeline we have given. </p>` +
            
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
                { statusx: 'SUCCESS', message: 'Order has been successfully moved to Approved.' },
                { status: 200 },
              );
            }





    // .................... PENDING STAGE MAIL ....................//
    if(newStatus == "pending"){
      const xEmail = user?.userEmail as string;
      const xTitle = `Payment Verified`;
      const xBodyTitle = `Order moved to Pending`;
      const xBody1 = `Hello ` + user?.userFirstname + `,` +
      `<p>Congratulations! Your Bank Payment for order with ID: <b>`+pidOrder+`</b> has been verified and confirmed, the order is now in <b>Pending Stage</b> awaiting approval.</p>
      <p>Log into your Spreadit account, go to <b>Pending Stage</b> to view this order.</p>` +
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
          { statusx: 'SUCCESS', message: 'Order has been successfully moved to Pay for Shipping.' },
          { status: 200 },
        );
      }






    // .................... PAY FOR SHIPPING STAGE MAIL ....................//
    if(newStatus == "pay-for-shipping"){
        const xEmail = user?.userEmail as string;
        const xTitle = `Pay for Shipping`;
        const xBodyTitle = `Pay for Order Shippment`;
        const xBody1 = `Hello ` + user?.userFirstname + `,` +
        `<p>Unfortunately, your order with ID :<b>`+pidOrder+`</b> has been <b>Declined and Placed On-Hold</b>.</p>
        <p>You will have to review and update this order.</p>
        <p>Log into your Spreadit account, go to <b>On-Hold Orders</b> to view this order.</p>` +
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
            { statusx: 'SUCCESS', message: 'Order has been successfully moved to Pay for Shipping.' },
            { status: 200 },
          );
        }






    // .................... IN-TRANSIT STAGE MAIL ....................//
    if(newStatus == "in-transit"){
        const xEmail = user?.userEmail as string;
        const xTitle = `Order In-Transit`;
        const xBodyTitle = `Order now In-Transit`;
        const xBody1 = `Hello ` + user?.userFirstname + `,` +
        `<p>Congratulations!, Your Bank Payment for order with ID :<b>`+pidOrder+`</b> has been verified and confirmed, the order is now <b>In-Transit </b>.</p>
        <p>You will have to review and update this order.</p>
        <p>Log into your Spreadit account, go back to <b>Readty to Ship Orders</b> to view this order.</p>` +
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
            { statusx: 'SUCCESS', message: 'Order has been successfully moved to In-Transit.' },
            { status: 200 },
          );
        }






            // .................... READY FOR PICKUP STAGE MAIL ....................//
            if(newStatus == "ready-for-pickup"){
                const xEmail = user?.userEmail as string;
                const xTitle = `Order is Ready for PickUp`;
                const xBodyTitle = `Order is now Ready for PickUp`;
                const xBody1 = `Hello ` + user?.userFirstname + `,` +
                `<p>Congratulations!, your order with ID :<b>`+pidOrder+`</b> is now <b>ready for Pickup</b>.</p>
                <p>Log into your Spreadit account, go to <b>ready for Pickup</b> to view this order.</p>` +
                `<br><b> - The Spreadit Order Review Team</b><br>`+
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
                    { statusx: 'SUCCESS', message: 'Order has been successfully moved to Ready for Pickup.' },
                    { status: 200 },
                  );
                }







            // .................... CANCELLED STAGE MAIL ....................//
            if(newStatus == "cancelled"){
              const xEmail = user?.userEmail as string;
              const xTitle = `Order is Ready for PickUp`;
              const xBodyTitle = `Order is now Ready for PickUp`;
              const xBody1 = `Hello ` + user?.userFirstname + `,` +
              `<p>Unfortunately, your order with ID :<b>`+pidOrder+`</b> has been <b>Cancelled</b>.</p>
              <p>You will be getting a refund for this order within 48hours.</p>
              <p>Log into your Spreadit account, go to <b>Cancelled Orders</b> to view this order.</p>` +
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
                  { statusx: 'SUCCESS', message: 'Order has been successfully moved to Cancelled Order.' },
                  { status: 200 },
                );
              }







            // .................... COMPLETED STAGE MAIL ....................//
            if(newStatus == "completed"){
                const xEmail = user?.userEmail as string;
                const xTitle = `Order process is Completed!`;
                const xBodyTitle = `Order process has not been Completed`;
                const xBody1 = `Hello ` + user?.userFirstname + `,` +
                `<p>Thank you for your business, your order with ID :<b>`+pidOrder+`</b> has completed it\'s process.</p>
                <p>You will have to review and update this order.</p>
                <p>Log into your Spreadit account, go to <b>On-Hold Orders</b> to view this order.</p>` +
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
                ////////////////////// SEND REGISTRATION EMAIL BLOCK ENDS //////////////////////
                  //success update
                  return NextResponse.json(
                    { statusx: 'SUCCESS', message: 'Order has been successfully moved to Completed.' },
                    { status: 200 },
                  );
                }


        } catch (error) {
                //success update
                return NextResponse.json(
                  { statusx: 'ACTION_FAILED', message: 'Action Failed! You may need to try again, or contact the Admin. Error MSG:'+error },
                  { status: 401 },
                );
        }


  } else {
          //success update
          return NextResponse.json(
            { statusx: 'ACTION_FAILED', message: 'Action Failed! You may need to try again, or contact the Admin.' },
            { status: 401 },
          );
  }

  //END
}
