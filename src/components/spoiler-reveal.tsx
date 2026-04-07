"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

export function SpoilerReveal({ spoilerId, seriesTitle, chapter }: { spoilerId: string; seriesTitle: string; chapter: string }) {
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
    return <div className="prose dark:prose-invert max-w-none"><ReactMarkdown>{content}</ReactMarkdown></div>;
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="mb-2 text-lg font-medium">{t("hiddenTitle")}</p>
        <p className="mb-4 text-sm text-muted-foreground">{t("hiddenSubtitle", { series: seriesTitle, chapter })}</p>
        <Button onClick={() => setShowDialog(true)}>{t("viewButton")}</Button>
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("warningTitle")}</DialogTitle>
            <DialogDescription>
              {t("warningDescription", { series: seriesTitle, chapter })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{t("cancel")}</Button>
            <Button onClick={handleReveal} disabled={loading}>{loading ? t("loading") : t("confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
