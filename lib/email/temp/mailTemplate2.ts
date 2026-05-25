interface Props {
  zTitle?: any;
  zBodyTitle: any;
  zBody1: any;
  zBody2: any;
  zButtonTitle: any;
  zButtonLink: any;
}

const brandAddress = `
Lagos, Nigeria: 5 Olutosin Ajayi Street, Ajao Estate, Lagos<br/>
Guangzhou, China: 广州市白云区机场路111号建发广场3FB3-1.<br/>
Phone: +234 803 764 9956, +234 806 458 3664
`;

export const mailTemplate: React.FC<Props> = ({
  zTitle,
  zBodyTitle,
  zBody1 = '',
  zBody2 = '',
  zButtonTitle = '',
  zButtonLink = '',
}) => {
  const hasButton = Boolean(zButtonTitle && zButtonLink);

  return (`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${zTitle || 'Sure Imports Notification'}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fb;font-family:Calibri,Arial,sans-serif;color:#111827;">
  <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f3f6fb;padding:24px 10px;">
    <tr>
      <td align="center">
        <table cellspacing="0" cellpadding="0" border="0" width="680" style="max-width:680px;background:#ffffff;border:1px solid #dbe2ea;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#ffffff;border-bottom:1px solid #dbe2ea;padding:18px 24px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:top;">
                    <img src="https://sureimports.com/images/logo.png" height="36" alt="Sure Imports" style="display:block;" />
                    <div style="margin-top:10px;color:#0f172a;font-size:12px;line-height:1.55;font-weight:600;">${brandAddress}</div>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <div style="display:inline-block;background:#0b3b88;color:#ffffff;padding:8px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;">SURE IMPORTS</div>
                    <div style="margin-top:10px;font-size:12px;">
                      <a href="https://www.sureimports.com" style="color:#0b3b88;text-decoration:none;font-weight:700;">www.sureimports.com</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 28px 22px 28px;">
              <h2 style="margin:0 0 14px 0;color:#0f172a;font-size:24px;line-height:1.25;">${zBodyTitle || 'Notification'}</h2>
              <div style="margin:0 0 14px 0;color:#334155;font-size:15px;line-height:1.7;">${zBody1}</div>
              <div style="margin:0;color:#334155;font-size:15px;line-height:1.7;">${zBody2}</div>
            </td>
          </tr>

          ${hasButton ? `
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <a href="${zButtonLink}" style="display:inline-block;background:#165ef0;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-size:14px;font-weight:700;">${zButtonTitle}</a>
            </td>
          </tr>
          ` : ''}

          <tr>
            <td style="border-top:1px solid #e5e7eb;padding:18px 28px 24px 28px;background:#fafbfd;">
              <div style="font-size:12px;line-height:1.7;color:#64748b;">
                This is an automated email from Sure Imports.<br/>
                Website: <a href="https://www.sureimports.com" style="color:#1558b0;text-decoration:none;">www.sureimports.com</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`) as any;
};

export default mailTemplate;
