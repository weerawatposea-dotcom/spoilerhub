"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

export function SpoilerReveal({
  spoilerId,
  seriesTitle,
  chapter,
}: {
  spoilerId: string;
  seriesTitle: string;
  chapter: string;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useTranslations("SpoilerReveal");

  async function handleReveal() {
    setLoading(true);
    const res = await fetch(`/api/spoiler/${spoilerId}/content`);
    const data = await res.json();
    setContent(data.content);
    setShowDialog(false);
    setLoading(false);
  }

  if (content) {
    return (
      <div className="relative">
        {/* Top fade-in decoration */}
        <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground/50">
          <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          <span>spoiler content</span>
          <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
        </div>
        <div className="prose dark:prose-invert max-w-none prose-headings:font-bold prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-li:text-sm prose-ul:space-y-1">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Warning Gate */}
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/50 bg-gradient-to-b from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5">
        {/* Scan lines effect */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
          <svg className="h-full w-full">
            <defs>
              <pattern
                id="scan-lines"
                width="4"
                height="4"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="4"
                  y2="0"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#scan-lines)" />
          </svg>
        </div>

        <div className="relative flex flex-col items-center justify-center px-6 py-20 text-center">
          {/* Eye icon with glow */}
          <div className="relative mb-5">
            <div className="absolute inset-0 animate-pulse rounded-full bg-red-500/20 blur-xl" />
            <svg
              className="relative h-14 w-14 text-muted-foreground/40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
              <line x1="4" y1="4" x2="20" y2="20" className="text-red-400/60" />
            </svg>
          </div>

          <p className="text-lg font-semibold">{t("hiddenTitle")}</p>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {t("hiddenSubtitle", { series: seriesTitle, chapter })}
          </p>

          <Button
            onClick={() => setShowDialog(true)}
            className="mt-6 rounded-xl px-6 font-semibold"
            size="lg"
          >
            <svg
              className="mr-2 h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {t("viewButton")}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 dark:bg-red-500/20">
              <svg
                className="h-6 w-6 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <DialogTitle className="text-center">{t("warningTitle")}</DialogTitle>
            <DialogDescription className="text-center">
              {t("warningDescription", { series: seriesTitle, chapter })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setShowDialog(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              className="rounded-xl"
              onClick={handleReveal}
              disabled={loading}
            >
              {loading ? t("loading") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
