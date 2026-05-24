/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');
const crypto = require('crypto');

const prisma = new PrismaClient();

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function isCloudinaryUrl(value) {
  const url = String(value || '').trim();
  return url.includes('res.cloudinary.com/') && url.includes('/upload/');
}

function isHttpUrl(value) {
  const url = String(value || '').trim();
  return url.startsWith('http://') || url.startsWith('https://');
}

function makeLegacyUrl(value) {
  const base = String(process.env.LEGACY_MEDIA_BASE_URL || '').trim().replace(/\/$/, '');
  if (!base) return null;
  return `${base}/${String(value || '').replace(/^\//, '')}`;
}

async function uploadUrlToCloudinary(sourceUrl, folder, publicId) {
  return cloudinary.uploader.upload(sourceUrl, {
    folder,
    public_id: publicId,
    overwrite: true,
    use_filename: false,
    unique_filename: false,
    resource_type: 'image',
  });
}

async function runBackfill() {
  requireEnv('CLOUDINARY_CLOUD_NAME');
  requireEnv('CLOUDINARY_API_KEY');
  requireEnv('CLOUDINARY_API_SECRET');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const dryRun = String(process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
  console.log(`[backfill] dryRun=${dryRun}`);

  const targets = [
    { model: 'users', key: 'pidUser', imageField: 'userImage', folder: 'admin-sureimports/users' },
    { model: 'store', key: 'pidProduct', imageField: 'productImage', folder: 'admin-sureimports/store' },
    { model: 'posts', key: 'pidPost', imageField: 'image', folder: 'admin-sureimports/posts' },
    { model: 'blog', key: 'pidBlog', imageField: 'blogImage', folder: 'admin-sureimports/blog' },
    { model: 'blog_publisher', key: 'pidPublisher', imageField: 'publisherImage', folder: 'admin-sureimports/blog-publisher' },
  ];

  for (const target of targets) {
    const delegate = prisma[target.model];
    if (!delegate || typeof delegate.findMany !== 'function') {
      console.log(`[skip] model ${target.model} not found in prisma client`);
      continue;
    }

    const rows = await delegate.findMany({
      select: { [target.key]: true, [target.imageField]: true },
    });

    for (const row of rows) {
      const id = String(row[target.key] || '').trim();
      const current = String(row[target.imageField] || '').trim();
      if (!id || !current) continue;
      if (isCloudinaryUrl(current)) continue;

      const sourceUrl = isHttpUrl(current) ? current : makeLegacyUrl(current);
      if (!sourceUrl) {
        console.log(`[skip] ${target.model}.${target.imageField} missing LEGACY_MEDIA_BASE_URL for ${id}`);
        continue;
      }

      const hash = crypto.createHash('md5').update(current).digest('hex').slice(0, 10);
      const publicId = `${id}-${target.imageField}-${hash}`;

      if (dryRun) {
        console.log(`[dry-run] ${target.model}:${id} ${target.imageField} -> ${target.folder}/${publicId}`);
        continue;
      }

      try {
        const uploaded = await uploadUrlToCloudinary(sourceUrl, target.folder, publicId);
        await delegate.update({
          where: { [target.key]: row[target.key] },
          data: { [target.imageField]: uploaded.secure_url },
        });
        console.log(`[ok] ${target.model}:${id} ${target.imageField}`);
      } catch (error) {
        console.error(`[fail] ${target.model}:${id} ${target.imageField}`, error.message || error);
      }
    }
  }
}

runBackfill()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
