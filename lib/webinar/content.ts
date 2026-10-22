export const WEBINAR_VIDEO_ID = '5nhM9Vv1V8M';
export const WEBINAR_URL =
  'https://www.sureimports.com/buy-from-chinese-websites/video';
export const WEBINAR_COOKIE = 'si_webinar_watched';
export function webinarWelcome(
  account: boolean,
  watched: boolean,
  subscribed: boolean,
) {
  const apps =
    'Download the official 1688 app for iPhone:\nhttps://apps.apple.com/app/id507097717\n\nDownload 1688 for Android:\nhttps://play.google.com/store/apps/details?id=com.alibaba.wireless\n\nPrefer your browser? Open https://www.1688.com/ in Google Chrome and use the Translate option to read pages in English. You can also use this option if the app is unavailable in your region.';
  const intro = account
    ? 'Welcome to Sure Imports! Your account is ready.'
    : 'Welcome to Sure Imports Insights! Thank you for subscribing.';
  const lesson = subscribed
    ? '\n\nI’ll send you a practical importing lesson each week to help you make more informed buying decisions.'
    : '';
  return {
    subject: account
      ? watched
        ? 'Your account is ready — let’s prepare your first order'
        : 'Welcome to Sure Imports — here’s how to get started'
      : watched
        ? 'Your next step after the buying walkthrough'
        : 'Your free webinar: How to buy from 1688, Taobao and Pinduoduo',
    title: watched
      ? 'Put the walkthrough into practice'
      : 'Your free buying-from-China webinar',
    previewText: watched
      ? 'Get the 1688 app, save your product links and take the next step.'
      : 'Watch the walkthrough, explore 1688 and prepare your first order.',
    bodyText: `Hi {{firstName}},\n\n${intro}\n\n${watched ? 'You’ve already spent some time with the buying walkthrough. Now you can put it into practice.\n\nChoose a few products and save their links. Note the price, quantity and options such as size or colour. When you’re ready, add them to your Sure Imports order.' : 'I’m Tochukwu Nkwocha, founder of Sure Imports. If you haven’t watched it yet, my free webinar shows you how to buy from 1688, Taobao and Pinduoduo from the UK, US, Nigeria and beyond.\n\nYou’ll see how to find products, collect their links and prepare your order with Sure Imports. You can pay in GBP, USD or NGN and combine purchases from multiple suppliers in one order. We handle supplier verification, purchasing, product checks, consolidation, shipping and customs clearance.'}\n\n${watched ? 'Keep 1688 handy' : 'Want to follow along on 1688?'}\n\n${apps}${watched ? `\n\nNeed a reminder? Revisit the webinar:\n${WEBINAR_URL}` : '\n\nStart by finding a few products that interest you and saving their links. The webinar will guide you through what to do next.'}${lesson}`,
    ctaLabel:
      watched && account
        ? 'Start Your Order'
        : watched
          ? 'Revisit the Webinar'
          : 'Watch the Free Webinar',
    ctaUrl:
      watched && account ? 'https://www.sureimports.com/start' : WEBINAR_URL,
  };
}
