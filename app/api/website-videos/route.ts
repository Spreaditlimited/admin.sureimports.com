import { fetchVideoMetadata } from "@/lib/website-videos/metadata";
import { requireAdminServiceAccess } from "@/app/api/_lib/adminAccess";
import { prisma } from "@/lib/prisma";
import { youtubeVideoId } from "@/lib/website-videos/policy";
import {
  websiteVideos,
  VideoSettingConflict,
} from "@/lib/website-videos/store";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export async function GET() {
  const access = await requireAdminServiceAccess("system_settings", "view");
  if (!access.ok) return access.response;
  try {
    const setting = await websiteVideos(prisma).read();
    const edit = await requireAdminServiceAccess("system_settings", "edit");
    return Response.json({ ...setting, canEdit: edit.ok }, { headers });
  } catch {
    return Response.json(
      { message: "Video settings are unavailable. Please try again." },
      { status: 503, headers },
    );
  }
}
export async function PUT(request: Request) {
  const access = await requireAdminServiceAccess("system_settings", "edit");
  if (!access.ok) return access.response;
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return Response.json(
      { message: "Please save from the admin dashboard." },
      { status: 403, headers },
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ message: "Use JSON." }, { status: 415, headers });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4096)
      return Response.json(
        { message: "The link is too long." },
        { status: 413, headers },
      );
    body = JSON.parse(raw);
  } catch {
    return Response.json(
      { message: "Invalid request." },
      { status: 400, headers },
    );
  }
  if (
    typeof body?.videoUrl !== "string" ||
    body.videoUrl.length > 2048 ||
    !youtubeVideoId(body.videoUrl) ||
    !Number.isSafeInteger(body.revision) ||
    body.revision < 0
  )
    return Response.json(
      { message: "Paste a valid YouTube video link." },
      { status: 400, headers },
    );
  try {
    let metadata;
    try {
      metadata = await fetchVideoMetadata(youtubeVideoId(body.videoUrl)!);
    } catch {
      return Response.json(
        {
          message:
            "Could not verify this video’s public title and publication date. Check it is public and allows embedding, then try again.",
        },
        { status: 422, headers },
      );
    }
    const saved = await websiteVideos(prisma).save(
      body.videoUrl,
      body.revision,
      access.admin.pidUser,
      metadata,
    );
    return Response.json(
      {
        ...saved,
        message:
          "Video saved. The public page updates within about a minute; refresh it to see the new video.",
      },
      { headers },
    );
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof VideoSettingConflict
            ? error.message
            : "Unable to save the video. Please try again.",
      },
      { status: error instanceof VideoSettingConflict ? 409 : 503, headers },
    );
  }
}
