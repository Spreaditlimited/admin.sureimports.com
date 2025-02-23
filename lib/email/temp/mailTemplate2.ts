import Logo from '@/public/assets/images/svg-logo.svg';

interface Props {
  zTitle?: any;
  zBodyTitle: any;
  zBody1: any;
  zBody2: any;
  zButtonTitle: any;
  zButtonLink: any;
}

export const mailTemplate: React.FC<Props> = ({
  zTitle,
  zBodyTitle,
  zBody1 = '',
  zBody2 = '',
  zButtonTitle = '',
  zButtonLink = '',
}) =>
  (`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>` +
    zTitle +
    `</title>
</head>
<body style="font-family: Calibri, sans-serif;">

  <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          <tr>
            <td align="center" style="padding: 10px 0;"><br />
              <h2 style="margin: 0; color: #222222;">` +
    zBodyTitle +
    `</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 20px;">
              <p style="margin-top: 30px; color: #666666; line-height: 1.6;">` +
    zBody1 +
    `</p>
              <p style="margin-top: 30px; color: #666666; line-height: 1.6;">` +
    zBody2 +
    `</p>
            </td>
          </tr>

          <hr />
          <tr>
          <td align="center" style="padding: 0 20px;">
          <img src="` +
    process.env.ROOT_URL +
    `/images/logo.png" height='35px' />
          <p style="margin-top: 10px; color: #666666; line-height: 1.6;"><i>Start your importation with peace of mind</i></p>
          
            <p style="margin-top: 10px; color: #666666; font-size:10px; line-height: 1.6;">
            <a href="https://www.facebook.com/spreaditng">Facebook</a>&nbsp; | &nbsp;
            <a href="https://www.youtube.com/@sureimports">Youtube</a>&nbsp; | &nbsp;
            <a href="https://www.tiktok.com/@tochukwunkwocha">Tiktok</a>&nbsp; | &nbsp;
            <a href="https://www.instagram.com/sureimport">Instagram</a> 
            </p>

            <p style="margin-top: 10px;margin-top: 10px; color: #666666; line-height: 1.6;"><a href="https://sureimports.com"><b>https://www.sureimports.com</a></b></p><br />
            </td>
        </tr>
        </table>
      </td>
    </tr>
  </table>

</body>
</html>

`) as any;

export default mailTemplate;
