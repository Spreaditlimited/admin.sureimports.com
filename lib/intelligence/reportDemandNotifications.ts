import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import xMail from '@/lib/email/xMail2';
import {
  reportDemandMatches,
  reportNotificationKey,
  reportReadyEmail,
} from './reportNotificationPolicy';

// Mirrored in admin.sureimports.com: publication and scheduled retries share
// one database queue. SMTP acceptance is recorded; inbox delivery is not assumed.
export async function reconcileReportDemandNotifications(onlySlug?: string) {
  const reports = await prisma.$queryRaw<
    Array<{ slug: string; nicheSlug: string }>
  >`
    SELECT p.slug, n.slug AS nicheSlug
    FROM intelligence_report_products p
    INNER JOIN intelligence_report_versions v ON v.pidVersion = p.currentVersionId
    INNER JOIN intelligence_niches n ON n.pidNiche = p.nicheId
    WHERE p.status = 'published' AND v.status = 'published'
      AND (${onlySlug || null} IS NULL OR p.slug = ${onlySlug || null})
  `;
  const requests = await prisma.$queryRaw<
    Array<{ pidRequest: string; query: string; resultSlug: string | null }>
  >`
    SELECT r.pidRequest, r.query, s.resultSlug
    FROM intelligence_report_requests r
    LEFT JOIN intelligence_search_requests s ON s.pidSearch = r.queueSearchRequestId
    WHERE r.publishedReportSlug IS NULL AND r.status NOT IN ('published', 'archived')
  `;
  let matched = 0;
  for (const request of requests) {
    const report = reports.find((r) =>
      reportDemandMatches(request.query, r.nicheSlug, request.resultSlug),
    );
    if (!report) continue;
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.$executeRaw`
        UPDATE intelligence_report_requests SET status = 'published', publishedReportSlug = ${report.slug}, updatedAt = ${new Date()}
        WHERE pidRequest = ${request.pidRequest} AND publishedReportSlug IS NULL
      `;
      if (!claimed) return;
      const voters = await tx.$queryRaw<Array<{ email: string }>>`
        SELECT DISTINCT LOWER(TRIM(email)) AS email FROM intelligence_report_request_votes WHERE requestId = ${request.pidRequest}
      `;
      for (const voter of voters) {
        // Never substitute the research queue's internal address for a voter.
        reportReadyEmail(request.query, report.slug, voter.email);
        await tx.$executeRaw`
          INSERT INTO intelligence_report_notifications
            (notificationKey, requestId, reportSlug, email, query, status, attempts, nextAttemptAt, createdAt, updatedAt)
          VALUES (${reportNotificationKey(report.slug, voter.email)}, ${request.pidRequest}, ${report.slug}, ${voter.email}, ${request.query}, 'pending', 0, ${new Date()}, ${new Date()}, ${new Date()})
          ON DUPLICATE KEY UPDATE notificationKey = notificationKey
        `;
      }
      matched++;
    });
  }
  return { matched, ...(await sendPendingReportNotifications(onlySlug)) };
}

export async function sendPendingReportNotifications(onlySlug?: string) {
  const now = new Date();
  const stale = new Date(now.getTime() - 10 * 60 * 1000);
  const pending = await prisma.$queryRaw<
    Array<{
      notificationKey: string;
      query: string;
      reportSlug: string;
      email: string;
      attempts: number;
    }>
  >`
    SELECT q.notificationKey, q.query, q.reportSlug, q.email, q.attempts
    FROM intelligence_report_notifications q
    INNER JOIN intelligence_report_products p ON p.slug = q.reportSlug
    INNER JOIN intelligence_report_versions v ON v.pidVersion = p.currentVersionId
    WHERE q.sentAt IS NULL AND q.nextAttemptAt <= ${now}
      AND (q.lockedAt IS NULL OR q.lockedAt < ${stale})
      AND p.status = 'published' AND v.status = 'published'
      AND (${onlySlug || null} IS NULL OR q.reportSlug = ${onlySlug || null})
    ORDER BY q.createdAt ASC LIMIT 20
  `;
  let sent = 0;
  let failed = 0;
  for (const notice of pending) {
    const lockToken = randomUUID();
    const claimed = await prisma.$executeRaw`
      UPDATE intelligence_report_notifications
      SET status = 'sending', lockToken = ${lockToken}, lockedAt = ${now}, attempts = attempts + 1, updatedAt = ${now}
      WHERE notificationKey = ${notice.notificationKey} AND sentAt IS NULL
        AND nextAttemptAt <= ${now} AND (lockedAt IS NULL OR lockedAt < ${stale})
    `;
    if (!claimed) continue;
    try {
      await xMail(
        reportReadyEmail(notice.query, notice.reportSlug, notice.email),
      );
      await prisma.$executeRaw`
        UPDATE intelligence_report_notifications
        SET status = 'sent', sentAt = ${new Date()}, lockedAt = NULL, lockToken = NULL, lastError = NULL, updatedAt = ${new Date()}
        WHERE notificationKey = ${notice.notificationKey} AND lockToken = ${lockToken}
      `;
      sent++;
    } catch (error) {
      const retryAt = new Date(
        Date.now() +
          Math.min(24 * 60, 15 * 2 ** Math.min(notice.attempts, 7)) * 60000,
      );
      await prisma.$executeRaw`
        UPDATE intelligence_report_notifications
        SET status = 'pending', lockedAt = NULL, lockToken = NULL, nextAttemptAt = ${retryAt},
          lastError = ${String(error instanceof Error ? error.message : 'Email could not be sent').slice(0, 1000)}, updatedAt = ${new Date()}
        WHERE notificationKey = ${notice.notificationKey} AND lockToken = ${lockToken}
      `;
      failed++;
    }
  }
  return { sent, failed };
}
