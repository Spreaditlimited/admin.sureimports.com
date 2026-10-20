export const videoSettingKey = 'buy-from-chinese-websites';
export const defaultVideoId = 'HJVlH0XT0ok';
export const defaultVideoUrl = `https://www.youtube.com/watch?v=${defaultVideoId}`;
export function youtubeVideoId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    let id: string | null = null;
    if (host === 'youtu.be' && parts.length === 1) id = parts[0];
    else if (
      ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)
    ) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (
        ['embed', 'shorts', 'live'].includes(parts[0]) &&
        parts.length === 2
      )
        id = parts[1];
    } else if (
      ['youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host) &&
      parts[0] === 'embed' &&
      parts.length === 2
    )
      id = parts[1];
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export type VideoMetadata = {
  videoId: string;
  title: string;
  description: string;
  uploadDate: string;
  durationSeconds: number;
};
export const defaultVideoMetadata: VideoMetadata = {
  videoId: defaultVideoId,
  title: 'How Buy From Chinese Websites Works at Sure Imports',
  description:
    'A guided walkthrough showing how to submit Chinese product links, create or access a Sure Imports account, and continue the saved order through the customer dashboard.',
  uploadDate: '2026-09-04T05:31:28-07:00',
  durationSeconds: 1133,
};
export function validVideoMetadata(
  value: unknown,
  id: string,
): value is VideoMetadata {
  if (!value || typeof value !== 'object') return false;
  const v = value as VideoMetadata;
  return (
    v.videoId === id &&
    typeof v.title === 'string' &&
    v.title.length > 0 &&
    v.title.length <= 200 &&
    typeof v.description === 'string' &&
    v.description.length > 0 &&
    v.description.length <= 5000 &&
    typeof v.uploadDate === 'string' &&
    !Number.isNaN(Date.parse(v.uploadDate)) &&
    Number.isSafeInteger(v.durationSeconds) &&
    v.durationSeconds > 0
  );
}
export function videoSchema(video: VideoMetadata) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description,
    thumbnailUrl: [`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`],
    uploadDate: video.uploadDate,
    duration: `PT${video.durationSeconds}S`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.videoId}`,
    url: 'https://www.sureimports.com/buy-from-chinese-websites/video',
  };
}
