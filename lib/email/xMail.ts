'use server';
import sendEmail from '@/lib/email/config/sendEmail';
import mailTemplate from '@/lib/email/temp/mailTemplate';

interface Props {
  xEmail: any;
  xTitle: any;
  xBodyTitle?: any;
  xBody1?: any;
  xBody2?: any;
  xButtonTitle?: any;
  xButtonLink?: any;
}

//EMAIL PROCESSOR
export default async function xMail({
  xEmail,
  xTitle,
  xBodyTitle,
  xBody1,
  xBody2,
  xButtonTitle,
  xButtonLink,
}: Props) {
  let zTitle: string = xTitle;
  let zBodyTitle: any = xBodyTitle;
  let zBody1: any = xBody1;
  let zBody2: any = xBody2;
  let zButtonTitle: any = xButtonTitle;
  let zButtonLink: any = xButtonLink;

  const mail = mailTemplate({
    zTitle,
    zBodyTitle,
    zBody1,
    zBody2,
    zButtonTitle,
    zButtonLink,
  }) as any;

  try {
    await sendEmail(xEmail, xTitle, mail);
  } catch (error) {
    //console.error("myThrowingFunction failed", error);
  }
}
