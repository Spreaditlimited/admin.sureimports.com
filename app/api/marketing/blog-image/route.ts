import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';
import { destroyCloudinaryAsset } from '@/lib/cloudinary/destroy';
import { BLOG_IMAGE_FOLDER, normalizeBlogImagePublicId } from '@/lib/blogImage';

const prisma = new PrismaClient();

function clean(value: unknown, max = 1000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function stripHtml(value: string | null | undefined) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeFileName(value: unknown) {
  return clean(value, 140)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function getCreativeDirection(post: {
  blogTitle: string;
  blogSlug: string | null;
}) {
  const text = `${post.blogTitle || ''} ${post.blogSlug || ''}`.toLowerCase();

  if (text.includes('shipping') || text.includes('freight')) {
    return [
      'Concept: logistics decision scene without people.',
      'Show a clean tabletop scale model of sea freight versus air freight: miniature unbranded containers, a cargo plane silhouette model, sealed cartons, route pins, measuring tape, and CBM-style cube blocks.',
      'Make shipping method comparison the unmistakable subject.',
    ].join(' ');
  }

  if (text.includes('soncap') || text.includes('nafdac') || text.includes('customs') || text.includes('documentation')) {
    return [
      'Concept: import compliance and documentation scene without people.',
      'Show sealed product sample boxes, blank geometric approval cards, check-mark tiles, simple circular seal icons, a customs-inspired stamp pad with no letters, and neutral inspection tags.',
      'Do not show certificates, titled forms, official documents, headings, acronyms, or readable text.',
    ].join(' ');
  }

  if (text.includes('phone')) {
    return [
      'Concept: phone import quality-control scene without people.',
      'Show several unbranded smartphones on anti-static mats beside sealed accessory pouches, blank labels, protective foam inserts, a small inspection light, and cartons in the background.',
      'Phones must be generic with blank screens or abstract gradients, no app icons, no brand marks, and no readable packaging.',
    ].join(' ');
  }

  if (text.includes('laptop')) {
    return [
      'Concept: laptop import inspection scene without people.',
      'Show unbranded laptops partly open on a clean inspection bench with protective sleeves, foam inserts, power adapters, blank inventory stickers, sealed cartons, and a warehouse background.',
      'Laptop screens must be blank, softly glowing, or show abstract non-readable interface shapes only.',
    ].join(' ');
  }

  if (text.includes('machine') || text.includes('equipment') || text.includes('industrial')) {
    return [
      'Concept: industrial sourcing evaluation scene without people.',
      'Show a clean machine-specification planning table with generic metal components, calipers, sealed sample parts, blank specification cards, inspection tags, and an industrial warehouse background.',
      'Do not show readable machine labels, brand marks, or people.',
    ].join(' ');
  }

  if (text.includes('landed cost') || text.includes('cost') || text.includes('margin')) {
    return [
      'Concept: landed-cost calculation scene without people.',
      'Show a premium flat-lay arrangement of calculator, clean grid worksheet with blank cells, sealed cartons, measuring tape, scale, freight-cost tokens, and customs-inspired stamped shapes with no letters.',
      'Communicate cost planning through objects and tidy layout rather than readable documents.',
    ].join(' ');
  }

  if (text.includes('supplier')) {
    return [
      'Concept: supplier verification scene without people.',
      'Show product samples under inspection lights, factory checklist cards represented only by blank rows and check marks, sealed sample cartons, loupe, caliper, and neutral warehouse shelving.',
      'Make verification, sampling, and due diligence the subject without readable words.',
    ].join(' ');
  }

  if (text.includes('1688') || text.includes('taobao') || text.includes('alibaba') || text.includes('pinduoduo')) {
    return [
      'Concept: China website buying comparison without people.',
      'Show a clean comparison workspace with unbranded product samples in separate trays, generic blank browser windows on a screen, category tiles without text, cartons, and neutral color-coded tabs.',
      'No platform logos, no marketplace names, no readable interface text.',
    ].join(' ');
  }

  return [
    'Concept: distinctive import-business editorial still life without people.',
    'Choose objects specific to the article topic and avoid repeating the same laptop-calculator-carton composition unless the topic clearly requires it.',
    'Use a fresh camera angle, focal object, background, and object set for this article.',
  ].join(' ');
}

function buildPrompt(post: {
  blogTitle: string;
  blogSlug: string | null;
  blogContent: string | null;
  category?: { categoryName: string | null } | null;
}) {
  const excerpt = clean(stripHtml(post.blogContent), 420);
  const category = post.category?.categoryName || 'China to Nigeria import';

  return [
    `Premium editorial feature image for a Sure Imports blog article titled "${post.blogTitle}".`,
    `Topic category: ${category}. Article context: ${excerpt}`,
    getCreativeDirection(post),
    'Create a realistic, polished import-business still life for Nigerian importers, retailers, SMEs, and corporate buyers importing from China to Nigeria.',
    'Every image must feel conceptually different: vary scene type, focal object, camera angle, background, depth of field, object set, and color accents.',
    'Composition: landscape hero image, strong central subject, clear depth, balanced negative space, safe when cropped to 16:10, sharp foreground details, soft background.',
    'Mood: practical, trustworthy, modern import advisory, premium but not flashy.',
    'Color palette: clean whites, warm neutrals, subtle navy, slate, and restrained orange accents.',
    'No people. No faces. No hands. No arms. No body parts. No human figures. No mannequins. No reflections of people on screens or glass.',
    'If screens appear, they must show only abstract dashboards, charts, or blurred interface shapes.',
    'If papers, labels, forms, checklists, invoices, clipboards, packaging, or screens appear, they must contain only blank lines, abstract marks, simple grids, check marks, or blurred non-readable shapes.',
    'No letters, no words, no numbers, no fake gibberish text, no designed text overlays, no captions, no poster typography, no logos, no website addresses, no brand names, no watermarks, no flags, no currency symbols.',
    'Photorealistic, high-end editorial photography, natural light, crisp details, professional blog feature image.',
  ].join(' ');
}

async function generateImageBuffer(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY.');

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.BLOG_IMAGE_MODEL || 'gpt-image-1',
      prompt,
      size: process.env.BLOG_IMAGE_SIZE || '1536x1024',
      quality: process.env.BLOG_IMAGE_QUALITY || 'high',
      n: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenAI image request failed: ${response.status} ${clean(errorText, 240)}`);
  }

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI image response did not include image data.');
  return Buffer.from(b64, 'base64');
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const pidBlog = clean(body.pidBlog, 120);

    if (!pidBlog) {
      return NextResponse.json({ success: false, error: 'Blog ID is required.' }, { status: 400 });
    }

    const blog = await prisma.blog.findUnique({
      where: { pidBlog },
      include: { category: true },
    });

    if (!blog) {
      return NextResponse.json({ success: false, error: 'Blog post not found.' }, { status: 404 });
    }

    const prompt = buildPrompt(blog);
    const imageBuffer = await generateImageBuffer(prompt);
    const slug = safeFileName(blog.blogSlug || blog.blogTitle || blog.pidBlog) || blog.pidBlog;
    const publicId = `BLOG_GEN_${slug}_${Date.now()}`.slice(0, 150);

    const uploadedImage = await uploadBufferToCloudinary(imageBuffer, {
      folder: BLOG_IMAGE_FOLDER,
      publicId,
      overwrite: true,
      useFilename: false,
      uniqueFilename: false,
      tags: ['blog-generated-image', 'sureimports'],
    });

    const updatedBlog = await prisma.blog.update({
      where: { pidBlog },
      data: {
        blogImage: uploadedImage.publicId,
        updatedAt: new Date(),
      },
      select: {
        pidBlog: true,
        blogImage: true,
        updatedAt: true,
      },
    });

    if (blog.blogImage) {
      try {
        const oldPublicId = normalizeBlogImagePublicId(blog.blogImage);
        if (oldPublicId && oldPublicId !== uploadedImage.publicId) {
          await destroyCloudinaryAsset(oldPublicId);
        }
      } catch (error) {
        console.error('Generated blog image old asset cleanup failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedBlog,
        imageUrl: uploadedImage.url,
      },
    });
  } catch (error: any) {
    console.error('Blog image generation failed:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Blog image generation failed.' },
      { status: 500 },
    );
  }
}
