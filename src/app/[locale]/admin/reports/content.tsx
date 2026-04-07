import { requireAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { reports, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { resolveReport, dismissReport } from "@/actions/report";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

export async function AdminReportsContent() {
  await requireAdmin();
  const t = await getTranslations("AdminReports");

  const allReports = await db.select({
    id: reports.id, targetType: reports.targetType, targetId: reports.targetId,
    reason: reports.reason, status: reports.status, createdAt: reports.createdAt, reporterName: users.name,
  }).from(reports).innerJoin(users, eq(reports.reporterId, users.id)).orderBy(desc(reports.createdAt));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {allReports.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{r.targetType}</Badge>
                <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>{r.status}</Badge>
              </div>
              <p className="mt-1 text-sm">{r.reason}</p>
              <p className="text-xs text-muted-foreground">{t("by", { name: r.reporterName })} — {new Date(r.createdAt).toLocaleDateString("th-TH")}</p>
            </div>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <form action={resolveReport.bind(null, r.id)}><Button size="sm" type="submit">{t("resolve")}</Button></form>
                <form action={dismissReport.bind(null, r.id)}><Button size="sm" variant="outline" type="submit">{t("dismiss")}</Button></form>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
