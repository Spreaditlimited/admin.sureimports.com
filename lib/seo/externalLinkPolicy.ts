const SUREIMPORTS_HOST_PATTERN = /(^|\.)sureimports\.com$/i

export type ExternalLinkChange = {
  originalUrl: string
  action: 'retained' | 'replaced'
  replacementUrl: string
  reason: string
}

export function normalizeExternalUrl(value: unknown): string | null {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return null

  try {
    const parsed = new URL(raw)
    if (!/^https?:$/.test(parsed.protocol)) return null
    if (SUREIMPORTS_HOST_PATTERN.test(parsed.hostname)) return null
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return null
  }
}

export function extractExternalUrls(html: string | null | undefined): string[] {
  const urls = new Set<string>()
  const hrefPattern = /\shref\s*=\s*(["'])(.*?)\1/gi

  for (const match of String(html || '').matchAll(hrefPattern)) {
    const normalized = normalizeExternalUrl(match[2])
    if (normalized) urls.add(normalized)
  }

  return [...urls]
}

export function validateExternalLinkContinuity(input: {
  originalHtml: string | null | undefined
  rewrittenHtml: string
  changes?: ExternalLinkChange[]
}) {
  const originalUrls = extractExternalUrls(input.originalHtml)
  const rewrittenUrls = new Set(extractExternalUrls(input.rewrittenHtml))
  const changes = Array.isArray(input.changes) ? input.changes : []
  const errors: string[] = []

  for (const originalUrl of originalUrls) {
    if (rewrittenUrls.has(originalUrl)) continue

    const decision = changes.find(
      (change) => normalizeExternalUrl(change.originalUrl) === originalUrl,
    )
    const replacementUrl = normalizeExternalUrl(decision?.replacementUrl)

    if (
      decision?.action !== 'replaced' ||
      !replacementUrl ||
      !rewrittenUrls.has(replacementUrl)
    ) {
      errors.push(
        `External link ${originalUrl} was removed without a documented replacement present in the rewrite.`,
      )
    }
  }

  if (errors.length) {
    throw new Error(`External link preservation failed: ${errors.join(' ')}`)
  }

  return {
    originalUrls,
    rewrittenUrls: [...rewrittenUrls],
    addedUrls: [...rewrittenUrls].filter((url) => !originalUrls.includes(url)),
  }
}
