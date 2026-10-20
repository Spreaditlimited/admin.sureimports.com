"use client";
import { useCallback, useEffect, useState } from "react";
import { Film, ExternalLink, Loader2 } from "lucide-react";
import { defaultVideoUrl, youtubeVideoId } from "@/lib/website-videos/policy";
export default function WebsiteVideoSettings() {
  const [url, setUrl] = useState(defaultVideoUrl),
    [savedUrl, setSavedUrl] = useState(defaultVideoUrl),
    [revision, setRevision] = useState(0),
    [canEdit, setCanEdit] = useState(false),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [conflict, setConflict] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/website-videos", {
        cache: "no-store",
        signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.message || "Unable to load video settings.");
      if (signal?.aborted) return;
      setUrl(data.videoUrl);
      setSavedUrl(data.videoUrl);
      setRevision(data.revision);
      setCanEdit(data.canEdit);
      setConflict(false);
    } catch (e) {
      if (!signal?.aborted) setError((e as Error).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const id = youtubeVideoId(url);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!id || !canEdit || saving || conflict) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/website-videos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: url, revision }),
      });
      const data = await response.json();
      if (response.status === 409) setConflict(true);
      if (!response.ok)
        throw Error(data.message || "Unable to save the video.");
      setUrl(data.videoUrl);
      setSavedUrl(data.videoUrl);
      setRevision(data.revision);
      setNotice(data.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      id="website-videos"
      className="scroll-mt-24 rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="mb-5 flex items-start gap-3">
        <Film
          className="mt-1 h-5 w-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-lg font-semibold">Website videos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Buy from Chinese websites · Step by step video guide
          </p>
        </div>
      </div>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label
            htmlFor="procurement-video-url"
            className="mb-2 block text-sm font-medium"
          >
            YouTube video link
          </label>
          <input
            id="procurement-video-url"
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setNotice("");
            }}
            disabled={loading || saving || !canEdit}
            aria-describedby="procurement-video-hint"
            className="w-full rounded-lg border border-border bg-background px-3 py-3 text-base text-foreground"
            placeholder="https://youtu.be/…"
          />
          <p
            id="procurement-video-hint"
            className="mt-2 text-xs text-muted-foreground"
          >
            Paste the watch or share link. The preview below lets you check the
            video before saving. The video must allow embedding.
          </p>
        </div>
        {id && (
          <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-border">
            <iframe
              key={id}
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
              title="Preview of the buy from Chinese websites walkthrough"
              loading="lazy"
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        )}
        {!id && (
          <p role="alert" className="text-sm text-destructive">
            Enter a valid YouTube video link.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-primary">
            {notice}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {canEdit && (
            <button
              type="submit"
              disabled={
                loading || saving || !id || conflict || url === savedUrl
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving && (
                <Loader2
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              )}
              {saving ? "Saving…" : "Save video"}
            </button>
          )}
          {error && (
            <button
              type="button"
              disabled={loading || saving}
              onClick={() => void load()}
              className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm"
            >
              Reload saved setting
            </button>
          )}
          <a
            href="https://www.sureimports.com/buy-from-chinese-websites#how-it-works"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-primary"
          >
            View public page
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
        {!loading && !canEdit && !error && (
          <p className="text-xs text-muted-foreground">
            You have view-only access. A settings editor can update this video.
          </p>
        )}
      </form>
    </section>
  );
}
