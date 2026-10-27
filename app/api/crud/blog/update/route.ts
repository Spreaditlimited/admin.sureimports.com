import { requireAdminServiceAccess } from "@/app/api/_lib/adminAccess";
import { PrismaClient } from "@prisma/client";
import getFileExt from "@/app/utils/fileExt";
import fileFilter from "@/app/utils/fileFilter";
import randomGenerator from "@/lib/helpers/randomGenerator";
import { NextResponse } from "next/server";
import { generateSlug } from "@/app/utils/slugGenerator";
import { uploadBufferToCloudinary } from "@/lib/cloudinary/upload";
import { BLOG_IMAGE_FOLDER, getBlogImageUrl } from "@/lib/blogImage";
import {
  findBlogPublicationIssues,
  verifyBlogFeatureImage,
} from "@/lib/blogPublicationValidation";

const prisma = new PrismaClient();

export async function PUT(request: Request) {
  try {
    const access = await requireAdminServiceAccess("blog_management", "edit");
    if (!access.ok) return access.response;
    const formData = await request.formData();

    const pidBlog = formData.get("pidBlog") as string;
    const blogTitle = formData.get("blogTitle") as string;
    const blogContent = formData.get("blogContent") as string;
    const blogBy = "Tochukwu Nkwocha";
    const blogPublished = formData.get("blogPublished") === "true";
    const blogFeatured = formData.get("blogFeatured") === "true";
    const blogExt1 = (formData.get("blogExt1") as string) || "";
    const blogExt2 = (formData.get("blogExt2") as string) || "";
    const categoryId = (formData.get("categoryId") as string) || null;
    const publisherId =
      (formData.get("publisherId") as string) || "PUB1767167254459";

    if (!pidBlog) {
      return NextResponse.json(
        {
          responsex: {
            message: "Blog ID is required",
            status: "VALIDATION_ERROR",
          },
          successx: false,
        },
        { status: 400 },
      );
    }

    // Check if blog exists
    const existingBlog = await prisma.blog.findUnique({
      where: { pidBlog },
    });

    if (!existingBlog) {
      return NextResponse.json(
        {
          responsex: {
            message: "Blog not found",
            status: "NOT_FOUND",
          },
          successx: false,
        },
        { status: 404 },
      );
    }

    const expectedUpdatedAt = formData.get("expectedUpdatedAt");
    if (
      expectedUpdatedAt === null ||
      String(expectedUpdatedAt) !==
        (existingBlog.updatedAt?.toISOString() || "")
    ) {
      return NextResponse.json(
        {
          successx: false,
          responsex: {
            status: "EDIT_CONFLICT",
            message:
              "This article changed after you opened it. Reload the current version before saving.",
          },
        },
        { status: 409 },
      );
    }
    // Changing a title must never silently move an indexed article.
    const blogSlug = existingBlog.blogSlug || generateSlug(blogTitle);
    if (blogPublished) {
      const publicationIssues = await findBlogPublicationIssues({
        prisma,
        html: blogContent,
        publishAt:
          existingBlog.createdAt && existingBlog.createdAt > new Date()
            ? existingBlog.createdAt
            : new Date(),
        currentSlug: blogSlug,
        publication: {
          title: blogTitle,
          publisherId,
          categoryId,
          seoJson: blogExt2,
          image: (formData.get("file") as File | null)?.size
            ? "pending-upload"
            : existingBlog.blogImage,
          newPublication:
            !existingBlog.blogPublished ||
            Boolean(
              existingBlog.createdAt && existingBlog.createdAt > new Date(),
            ),
        },
      });
      if (publicationIssues.length) {
        return NextResponse.json(
          {
            responsex: {
              message: publicationIssues.join(" "),
              status: "PUBLICATION_VALIDATION_ERROR",
            },
            successx: false,
            issues: publicationIssues,
          },
          { status: 400 },
        );
      }
    }

    // Handle image upload if new file is provided
    const file = formData.get("file") as File | null;
    let newFileName = existingBlog.blogImage || "";

    if (file) {
      const imageCode: string = randomGenerator(20);
      const originalFileName = file.name;
      const fileExt = getFileExt(originalFileName);

      const allowedExt: string[] = [
        "png",
        "jpg",
        "jpeg",
        "PNG",
        "JPG",
        "JPEG",
        "webp",
        "gif",
      ];
      const fileOK = fileFilter(fileExt, allowedExt);

      if (!fileOK) {
        return NextResponse.json(
          {
            responsex: {
              message: `Please select only valid images. ${fileExt} is not allowed`,
              status: "INVALID_IMAGE_UPLOAD",
            },
            successx: false,
          },
          { status: 400 },
        );
      }

      const publicId = `BLOG_${imageCode}`;

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadedImage = await uploadBufferToCloudinary(buffer, {
          folder: BLOG_IMAGE_FOLDER,
          publicId,
          useFilename: false,
          uniqueFilename: false,
          overwrite: true,
        });

        newFileName = uploadedImage.publicId;
      } catch (error) {
        return NextResponse.json(
          {
            responsex: {
              message: `Image upload failed. ERROR: ${error}`,
              status: "IMAGE_UPLOAD_FAILED",
            },
            successx: false,
          },
          { status: 500 },
        );
      }
    }

    if (blogPublished) {
      try {
        await verifyBlogFeatureImage(getBlogImageUrl(newFileName));
      } catch (error) {
        return NextResponse.json(
          {
            successx: false,
            responsex: {
              status: "PUBLICATION_VALIDATION_ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Image validation failed.",
            },
          },
          { status: 400 },
        );
      }
    }
    const selectedCategory = categoryId
      ? await prisma.blog_category.findUnique({
          where: { pidCategory: categoryId },
        })
      : null;
    const metadata = JSON.parse(blogExt2 || "{}");
    const normalizedSeo = JSON.stringify({
      ...metadata,
      canonicalUrl: `https://www.sureimports.com/blog/${blogSlug}`,
      category: selectedCategory?.categoryName || metadata.category,
      ogImage: getBlogImageUrl(newFileName),
      twitterImage: getBlogImageUrl(newFileName),
    });

    // Update blog post
    const updateResult = await prisma.blog.updateMany({
      where: {
        pidBlog,
        updatedAt: existingBlog.updatedAt,
        blogContent: existingBlog.blogContent,
      },
      data: {
        blogTitle,
        blogContent,
        blogSlug,
        blogPublished,
        blogFeatured,
        blogImage: newFileName,
        blogBy,
        blogExt1,
        blogExt2: normalizedSeo,
        categoryId: categoryId || null,
        publisherId: publisherId || null,
        updatedAt: new Date(),
      },
    });

    if (updateResult.count !== 1)
      return NextResponse.json(
        {
          successx: false,
          responsex: {
            status: "EDIT_CONFLICT",
            message:
              "A concurrent edit was detected. Your changes were not applied; reload the article.",
          },
        },
        { status: 409 },
      );
    const updatedBlog = await prisma.blog.findUnique({ where: { pidBlog } });
    // Keep the previous asset available for rollback and owner reuse.

    return NextResponse.json(
      {
        responsex: {
          message: "Blog post was successfully updated",
          status: "SUCCESS",
        },
        successx: true,
        data: updatedBlog,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error updating blog:", error);
    return NextResponse.json(
      {
        responsex: {
          message: "Failed to update blog post",
          status: "ACTION_FAILED",
        },
        successx: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
