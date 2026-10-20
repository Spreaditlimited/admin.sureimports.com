import 'server-only';
import type { PrismaClient } from '@prisma/client';
import {
  defaultVideoUrl,
  videoSettingKey,
  youtubeVideoId,
  validVideoMetadata,
  defaultVideoMetadata,
  type VideoMetadata,
} from './policy';
type VideoSetting = {
  metadataJson: string | null;
  videoUrl: string;
  revision: number;
  updatedAt: Date | null;
};
export class VideoSettingConflict extends Error {}
export function websiteVideos(db: PrismaClient) {
  return {
    async read(): Promise<VideoSetting> {
      const rows = await db.$queryRaw<
        VideoSetting[]
      >`SELECT videoUrl,metadataJson,revision,updatedAt FROM website_video_settings WHERE settingKey=${videoSettingKey}`;
      return (
        rows[0] || {
          videoUrl: defaultVideoUrl,
          metadataJson: JSON.stringify(defaultVideoMetadata),
          revision: 0,
          updatedAt: null,
        }
      );
    },
    async save(
      videoUrl: string,
      revision: number,
      adminId: string,
      metadata: VideoMetadata,
    ) {
      const id = youtubeVideoId(videoUrl);
      if (
        !id ||
        !validVideoMetadata(metadata, id) ||
        !Number.isSafeInteger(revision) ||
        revision < 0
      )
        throw new Error('Invalid video settings');
      const normalized = `https://www.youtube.com/watch?v=${id}`;
      await db.$transaction(async (tx) => {
        await tx.$executeRaw`INSERT IGNORE INTO website_video_settings (settingKey,videoUrl,revision) VALUES (${videoSettingKey},${defaultVideoUrl},0)`;
        const changed =
          await tx.$executeRaw`UPDATE website_video_settings SET videoUrl=${normalized},metadataJson=${JSON.stringify(metadata)},revision=revision+1,updatedBy=${adminId},updatedAt=NOW(3) WHERE settingKey=${videoSettingKey} AND revision=${revision}`;
        if (changed !== 1)
          throw new VideoSettingConflict(
            'Another admin updated this video. Reload the saved setting before saving again.',
          );
      });
      return { videoUrl: normalized, revision: revision + 1 };
    },
  };
}
