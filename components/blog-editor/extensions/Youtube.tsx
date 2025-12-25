import { Node, mergeAttributes } from '@tiptap/core';

export interface YoutubeOptions {
  addPasteHandler: boolean;
  allowFullscreen: boolean;
  autoplay: boolean;
  ccLanguage?: string;
  ccLoadPolicy?: boolean;
  controls: boolean;
  disableKBcontrols: boolean;
  enableIFrameApi: boolean;
  endTime: number;
  height: number;
  interfaceLanguage?: string;
  ivLoadPolicy: number;
  loop: boolean;
  modestBranding: boolean;
  nocookie: boolean;
  origin: string;
  playlist: string;
  progressBarColor?: string;
  width: number;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtube: {
      setYoutubeVideo: (options: { src: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

const getEmbedUrlFromYoutubeUrl = (options: {
  url: string;
  allowFullscreen: boolean;
  autoplay: boolean;
  ccLanguage?: string;
  ccLoadPolicy?: boolean;
  controls: boolean;
  disableKBcontrols: boolean;
  enableIFrameApi: boolean;
  endTime: number;
  interfaceLanguage?: string;
  ivLoadPolicy: number;
  loop: boolean;
  modestBranding: boolean;
  nocookie: boolean;
  origin: string;
  playlist: string;
  progressBarColor?: string;
  startTime: number;
}) => {
  const {
    url,
    allowFullscreen,
    autoplay,
    ccLanguage,
    ccLoadPolicy,
    controls,
    disableKBcontrols,
    enableIFrameApi,
    endTime,
    interfaceLanguage,
    ivLoadPolicy,
    loop,
    modestBranding,
    nocookie,
    origin,
    playlist,
    progressBarColor,
    startTime,
  } = options;

  // Already an embed URL
  if (url.includes('/embed/')) {
    return url;
  }

  // Extract video ID from various YouTube URL formats
  const videoIdMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/
  );

  if (!videoIdMatch || !videoIdMatch[1]) {
    return null;
  }

  const videoId = videoIdMatch[1];
  const host = nocookie ? 'www.youtube-nocookie.com' : 'www.youtube.com';

  const embedUrl = new URL(`https://${host}/embed/${videoId}`);

  if (autoplay) embedUrl.searchParams.set('autoplay', '1');
  if (!controls) embedUrl.searchParams.set('controls', '0');
  if (disableKBcontrols) embedUrl.searchParams.set('disablekb', '1');
  if (enableIFrameApi) embedUrl.searchParams.set('enablejsapi', '1');
  if (ccLanguage) embedUrl.searchParams.set('cc_lang_pref', ccLanguage);
  if (ccLoadPolicy) embedUrl.searchParams.set('cc_load_policy', '1');
  if (interfaceLanguage) embedUrl.searchParams.set('hl', interfaceLanguage);
  if (ivLoadPolicy) embedUrl.searchParams.set('iv_load_policy', ivLoadPolicy.toString());
  if (loop) {
    embedUrl.searchParams.set('loop', '1');
    embedUrl.searchParams.set('playlist', playlist || videoId);
  }
  if (modestBranding) embedUrl.searchParams.set('modestbranding', '1');
  if (origin) embedUrl.searchParams.set('origin', origin);
  if (progressBarColor) embedUrl.searchParams.set('color', progressBarColor);
  if (startTime) embedUrl.searchParams.set('start', startTime.toString());
  if (endTime) embedUrl.searchParams.set('end', endTime.toString());

  return embedUrl.toString();
};

export const Youtube = Node.create<YoutubeOptions>({
  name: 'youtube',

  addOptions() {
    return {
      addPasteHandler: true,
      allowFullscreen: true,
      autoplay: false,
      ccLanguage: undefined,
      ccLoadPolicy: undefined,
      controls: true,
      disableKBcontrols: false,
      enableIFrameApi: false,
      endTime: 0,
      height: 480,
      interfaceLanguage: undefined,
      ivLoadPolicy: 0,
      loop: false,
      modestBranding: false,
      nocookie: false,
      origin: '',
      playlist: '',
      progressBarColor: undefined,
      width: 854,
      HTMLAttributes: {},
    };
  },

  inline: false,

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      start: {
        default: 0,
      },
      width: {
        default: this.options.width,
      },
      height: {
        default: this.options.height,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-video] iframe',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const embedUrl = getEmbedUrlFromYoutubeUrl({
      url: HTMLAttributes.src,
      allowFullscreen: this.options.allowFullscreen,
      autoplay: this.options.autoplay,
      ccLanguage: this.options.ccLanguage,
      ccLoadPolicy: this.options.ccLoadPolicy,
      controls: this.options.controls,
      disableKBcontrols: this.options.disableKBcontrols,
      enableIFrameApi: this.options.enableIFrameApi,
      endTime: this.options.endTime,
      interfaceLanguage: this.options.interfaceLanguage,
      ivLoadPolicy: this.options.ivLoadPolicy,
      loop: this.options.loop,
      modestBranding: this.options.modestBranding,
      nocookie: this.options.nocookie,
      origin: this.options.origin,
      playlist: this.options.playlist,
      progressBarColor: this.options.progressBarColor,
      startTime: HTMLAttributes.start || 0,
    });

    HTMLAttributes.src = embedUrl;

    return [
      'div',
      {
        'data-youtube-video': '',
        class: 'youtube-video-wrapper my-4',
        style: 'position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 0.5rem;',
      },
      [
        'iframe',
        mergeAttributes(
          this.options.HTMLAttributes,
          {
            width: HTMLAttributes.width,
            height: HTMLAttributes.height,
            allowfullscreen: this.options.allowFullscreen,
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            style: 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;',
          },
          HTMLAttributes
        ),
      ],
    ];
  },

  addCommands() {
    return {
      setYoutubeVideo:
        (options) =>
        ({ commands }) => {
          if (!getEmbedUrlFromYoutubeUrl({
            url: options.src,
            allowFullscreen: this.options.allowFullscreen,
            autoplay: this.options.autoplay,
            ccLanguage: this.options.ccLanguage,
            ccLoadPolicy: this.options.ccLoadPolicy,
            controls: this.options.controls,
            disableKBcontrols: this.options.disableKBcontrols,
            enableIFrameApi: this.options.enableIFrameApi,
            endTime: this.options.endTime,
            interfaceLanguage: this.options.interfaceLanguage,
            ivLoadPolicy: this.options.ivLoadPolicy,
            loop: this.options.loop,
            modestBranding: this.options.modestBranding,
            nocookie: this.options.nocookie,
            origin: this.options.origin,
            playlist: this.options.playlist,
            progressBarColor: this.options.progressBarColor,
            startTime: 0,
          })) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addPasteRules() {
    if (!this.options.addPasteHandler) {
      return [];
    }

    return [
      {
        find: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S+)?/g,
        handler: ({ match, chain, range }) => {
          const url = match[0];

          if (getEmbedUrlFromYoutubeUrl({
            url,
            allowFullscreen: this.options.allowFullscreen,
            autoplay: this.options.autoplay,
            ccLanguage: this.options.ccLanguage,
            ccLoadPolicy: this.options.ccLoadPolicy,
            controls: this.options.controls,
            disableKBcontrols: this.options.disableKBcontrols,
            enableIFrameApi: this.options.enableIFrameApi,
            endTime: this.options.endTime,
            interfaceLanguage: this.options.interfaceLanguage,
            ivLoadPolicy: this.options.ivLoadPolicy,
            loop: this.options.loop,
            modestBranding: this.options.modestBranding,
            nocookie: this.options.nocookie,
            origin: this.options.origin,
            playlist: this.options.playlist,
            progressBarColor: this.options.progressBarColor,
            startTime: 0,
          })) {
            chain()
              .deleteRange(range)
              .setYoutubeVideo({ src: url })
              .run();
          }
        },
      },
    ];
  },
});

export default Youtube;
