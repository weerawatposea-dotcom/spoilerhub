"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

export function SpoilerReveal({ spoilerId, seriesTitle, chapter }: { spoilerId: string; seriesTitle: string; chapter: string }) {
  const [showDialog, setShowDialog] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReveal() {
    setLoading(true);
    const res = await fetch(`/api/spoiler/${spoilerId}/content`);
    const data = await res.json();
    setContent(data.content);
    setShowDialog(false);
    setLoading(false);
  }

  if (content) {
    return <div className="prose prose-invert max-w-none"><ReactMarkdown>{content}</ReactMarkdown></div>;
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="mb-2 text-lg font-medium">Spoiler content is hidden</p>
        <p className="mb-4 text-sm text-muted-foreground">Click to reveal the spoiler for {seriesTitle} Ch. {chapter}</p>
        <Button onClick={() => setShowDialog(true)}>View Spoiler</Button>
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spoiler Warning</DialogTitle>
            <DialogDescription>
              You are about to read the spoiler for <strong>{seriesTitle}</strong> chapter <strong>{chapter}</strong>. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleReveal} disabled={loading}>{loading ? "Loading..." : "Yes, show me"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
