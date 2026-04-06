import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { markAllRead } from "@/actions/notification";
import { Button } from "@/components/ui/button";

export default async function NotificationsPage() {
  const session = await requireAuth();
  const notifs = await db.select().from(notifications)
    .where(eq(notifications.userId, session.user.id)).orderBy(desc(notifications.createdAt)).limit(50);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <form action={markAllRead}><Button variant="outline" size="sm" type="submit">Mark all read</Button></form>
      </div>
      {notifs.length === 0 ? (
        <p className="text-muted-foreground">No notifications.</p>
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
