/** Shared Sure Imports email design. Keep copies in all sending apps identical. */
export interface EmailTemplateProps {
  zTitle?: string;
  zBrandName?: string;
  zSupportEmail?: string;
  zBodyTitle?: string;
  zBody1?: string;
  zBody2?: string;
  zButtonTitle?: string;
  zButtonLink?: string;
  zButtonStyle?: string; // Retained for caller compatibility; branding is centrally controlled.
  zLabel?: string;
  zPreheader?: string;
  zFooter?: string;
  zAfterButton?: string;
}
export function escapeEmailText(value: unknown) {
  return String(value ?? '').replace(/&(?!(?:amp|lt|gt|quot|#\d+|#x[\da-f]+);)|[<>"']/gi, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
}
function actionUrl(value: string) {
  const decoded = value.replace(/&amp;/g, '&');
  try { const url = new URL(decoded); return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? escapeEmailText(decoded) : ''; } catch { return ''; }
}
export function mailTemplate({zBrandName = 'Sure Imports', zSupportEmail = 'hello@sureimports.com', zTitle = 'Sure Imports', zBodyTitle = 'Your Sure Imports update', zBody1 = '', zBody2 = '', zButtonTitle = '', zButtonLink = '', zLabel = 'SURE IMPORTS', zPreheader = '', zFooter = '', zAfterButton = ''}: EmailTemplateProps) {
  const href = actionUrl(zButtonLink);
  const hasButton = Boolean(zButtonTitle && href);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${escapeEmailText(zTitle)}</title>
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark}
.si-copy p{margin:0 0 16px}.si-copy a{color:#4c419c}.si-copy img{max-width:100%;height:auto}.si-copy table{max-width:100%}.si-copy{overflow-wrap:anywhere;word-break:break-word}.si-logo-dark{display:none;max-height:0;overflow:hidden;mso-hide:all}
@media(max-width:600px){.si-outer{padding:24px 12px!important}.si-card{padding:26px 20px!important}.si-heading{font-size:26px!important}}
@media(prefers-color-scheme:dark){
.si-bg{background:#11131a!important}.si-card{background:#1c1f2b!important;border-color:#35384a!important;border-top-color:#b7abff!important}.si-heading,.si-signature{color:#f2f1fa!important}.si-copy,.si-copy p,.si-copy div,.si-copy td,.si-copy span{color:#c3c7d6!important}.si-muted{color:#a3a8b9!important}.si-label,.si-copy a,.si-link{color:#b7abff!important}.si-email-button{background:#6f5bd3!important;border-color:#6f5bd3!important;color:#fff!important}.si-panel{background:#252537!important;border-color:#3b3753!important}.si-rule{border-color:#35384a!important}.si-logo-light{display:none!important}.si-logo-dark{display:block!important;max-height:none!important;overflow:visible!important}}
[data-ogsc] .si-bg{background:#11131a!important}[data-ogsc] .si-card{background:#1c1f2b!important;border-color:#35384a!important}[data-ogsc] .si-heading,[data-ogsc] .si-copy{color:#f2f1fa!important}[data-ogsc] .si-link{color:#b7abff!important}
</style></head><body class="si-bg" style="margin:0;padding:0;background:#f7f6f2;color:#1c263d;font-family:Arial,Helvetica,sans-serif">
<!-- sureimports-standard-email-template --><!-- sureimports-email-design-v2 -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeEmailText(zPreheader || zTitle)}</div>
<table role="presentation" class="si-bg" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2"><tr><td class="si-outer" align="center" style="padding:40px 16px">
<!--[if mso]><table role="presentation" width="560"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 25px">${zBrandName === 'Sure Imports' ? `<img class="si-logo-light" src="https://www.sureimports.com/email/sureimports-logo-light.png" alt="Sure Imports" width="198" style="display:block;width:198px;max-width:100%;height:auto;border:0"><!--[if !mso]><!--><img class="si-logo-dark" src="https://www.sureimports.com/email/sureimports-logo-dark.png" alt="Sure Imports" width="198" style="display:none;width:198px;max-width:100%;height:auto;border:0;max-height:0;overflow:hidden;mso-hide:all"><!--<![endif]-->` : `<strong class="si-heading" style="font-size:26px;color:#1c263d">${escapeEmailText(zBrandName)}</strong>`}<p class="si-muted" style="margin:12px 0 0;font-size:12px;color:#6b7280">${zBrandName === 'Sure Imports' ? 'From China to your doorstep.' : 'Account update'}</p></td></tr>
<tr><td class="si-card" style="padding:32px 28px;background:#ffffff;border:1px solid #e4e2ec;border-top:4px solid #4c419c;border-radius:12px">
<p class="si-label" style="margin:0 0 17px;color:#4c419c;font-size:11px;letter-spacing:1.7px;font-weight:bold">${escapeEmailText(zLabel)}</p>
<h1 class="si-heading" style="margin:0 0 22px;font-size:30px;line-height:1.2;letter-spacing:-.7px;color:#1c263d">${escapeEmailText(zBodyTitle)}</h1>
<div class="si-copy" style="font-size:16px;line-height:1.75;color:#505b70">${zBody1}</div>
${zBody2 ? `<div class="si-copy" style="margin-top:20px;font-size:15px;line-height:1.75;color:#505b70">${zBody2}</div>` : ''}
${hasButton ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px"><tr><td class="si-email-button" bgcolor="#4c419c" style="border-radius:7px;mso-padding-alt:16px 24px"><a class="si-email-button" href="${href}" style="display:inline-block;padding:16px 24px;border:1px solid #4c419c;border-radius:7px;background:#4c419c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;line-height:1.3">${escapeEmailText(zButtonTitle)}</a></td></tr></table><p class="si-muted" style="margin:14px 0 0;font-size:12px;line-height:1.7;color:#7b8190">${zAfterButton || `Button not working? <a class="si-link" href="${href}" style="color:#4c419c;word-break:break-all">Open this link</a>.`}</p>` : ''}
</td></tr><tr><td class="si-muted" style="padding:22px 4px;color:#7c8190;font-size:12px;line-height:1.8"><strong class="si-signature" style="color:#41495b">The ${escapeEmailText(zBrandName)} team</strong><br><a class="si-link" href="https://www.sureimports.com" style="color:#4c419c;text-decoration:none">sureimports.com</a> &nbsp;·&nbsp; <a class="si-link" href="mailto:${escapeEmailText(zSupportEmail)}" style="color:#4c419c;text-decoration:none">${escapeEmailText(zSupportEmail)}</a>${zFooter ? `<div style="margin-top:8px;font-size:11px">${zFooter}</div>` : ''}</td></tr></table>
<!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
}
export default mailTemplate;
