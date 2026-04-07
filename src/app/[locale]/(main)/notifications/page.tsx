import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { markAllRead } from "@/actions/notification";
import { Button } from "@/components/ui/button";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireAuth();
  const t = await getTranslations("NotificationsPage");
  const notifs = await db.select().from(notifications)
    .where(eq(notifications.userId, session.user.id)).orderBy(desc(notifications.createdAt)).limit(50);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <form action={markAllRead}><Button variant="outline" size="sm" type="submit">{t("markAllRead")}</Button></form>
      </div>
      {notifs.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={n.id} className={`block rounded-lg border p-3 ${n.isRead ? "opacity-60" : "border-primary/30 bg-primary/5"}`}>
              <p className="text-sm">{n.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString("th-TH")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
