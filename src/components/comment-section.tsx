"use client";

import { addComment } from "@/actions/comment";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRef } from "react";

interface Comment { id: string; content: string; createdAt: Date; authorName: string | null; authorImage: string | null }

export function CommentSection({ spoilerId, comments, isLoggedIn }: { spoilerId: string; comments: Comment[]; isLoggedIn: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useTranslations("Comments");

  async function handleSubmit(formData: FormData) {
    await addComment(spoilerId, formData);
    formRef.current?.reset();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t("heading", { count: comments.length })}</h3>
      {isLoggedIn && (
        <form ref={formRef} action={handleSubmit} className="space-y-2">
          <Textarea name="content" placeholder={t("placeholder")} rows={3} required />
          <Button type="submit" size="sm">{t("submit")}</Button>
        </form>
      )}
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={c.authorImage ?? undefined} />
              <AvatarFallback>{c.authorName?.charAt(0) ?? "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{c.authorName ?? "Anonymous"}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("th-TH")}</span>
              </div>
              <p className="mt-1 text-sm">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
