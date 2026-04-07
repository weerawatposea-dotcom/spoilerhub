import { requireAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { series, spoilers, reports, users } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireAdmin();
  const t = await getTranslations("AdminPage");

  const [seriesCount] = await db.select({ count: count() }).from(series);
  const [spoilerCount] = await db.select({ count: count() }).from(spoilers);
  const [userCount] = await db.select({ count: count() }).from(users);
  const [pendingReports] = await db
    .select({ count: count() })
    .from(reports)
    .where(eq(reports.status, "pending"));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link href="/admin/series/new">
          <Button>{t("addSeries")}</Button>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("series")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{seriesCount.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("spoilers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{spoilerCount.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("users")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userCount.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("pendingReports")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingReports.count}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
