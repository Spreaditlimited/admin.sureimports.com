import 'server-only';
import { validVideoMetadata, type VideoMetadata } from './policy';
// YouTube's public player response supplies the actual publication date and duration.
export function parsePlayerResponse(html: string): Record<string, any> {
  const marker = html.indexOf('var ytInitialPlayerResponse = ');
  const start = marker < 0 ? -1 : html.indexOf('{', marker);
  if (start < 0)
    throw new Error('YouTube metadata is unavailable. Please try again.');
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0)
      return JSON.parse(html.slice(start, i + 1));
  }
  throw new Error('Unable to read YouTube metadata. Please try again.');
}
export async function fetchVideoMetadata(id: string): Promise<VideoMetadata> {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id))
    throw new Error('Invalid YouTube video.');
  const response = await fetch(`https://www.youtube.com/watch?v=${id}`, {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error('Unable to verify this YouTube video. Please try again.');
  const player = parsePlayerResponse(await response.text());
  const details = player.videoDetails,
    micro = player.microformat?.playerMicroformatRenderer;
  if (
    player.playabilityStatus?.status !== 'OK' ||
    player.playabilityStatus?.playableInEmbed === false ||
    details?.videoId !== id
  )
    throw new Error('Use a public YouTube video that allows embedding.');
  const result = {
    videoId: id,
    title: String(details.title || '')
      .trim()
      .slice(0, 200),
    description: String(details.shortDescription || details.title || '')
      .trim()
      .slice(0, 5000),
    uploadDate: micro?.publishDate || micro?.uploadDate,
    durationSeconds: Number(details.lengthSeconds),
  };
  if (!validVideoMetadata(result, id))
    throw new Error(
      'YouTube did not provide the video publication details. Please try again.',
    );
  return result;
}
