import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("LoginPage");

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-[0.03] dark:opacity-[0.05]">
        <svg
          className="absolute -left-20 -top-20 h-[600px] w-[600px] text-primary"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.3" />
          <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.3" />
          <path
            d="M100 20 L100 180 M20 100 L180 100"
            stroke="currentColor"
            strokeWidth="0.3"
          />
          <path
            d="M43 43 L157 157 M157 43 L43 157"
            stroke="currentColor"
            strokeWidth="0.2"
          />
        </svg>
        <svg
          className="absolute -bottom-32 -right-32 h-[800px] w-[800px] text-primary"
          viewBox="0 0 200 200"
          fill="none"
        >
          <polygon
            points="100,10 190,60 190,140 100,190 10,140 10,60"
            stroke="currentColor"
            strokeWidth="0.3"
          />
          <polygon
            points="100,30 170,65 170,135 100,170 30,135 30,65"
            stroke="currentColor"
            strokeWidth="0.2"
          />
          <polygon
            points="100,50 150,70 150,130 100,150 50,130 50,70"
            stroke="currentColor"
            strokeWidth="0.15"
          />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Logo & Branding */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/5 ring-1 ring-primary/20">
            <svg
              className="h-8 w-8 text-primary dark:text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 5V3" />
              <path d="M12 21v-2" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-6 shadow-xl shadow-black/5 dark:shadow-black/20 backdrop-blur-sm space-y-4">
          {/* Google Button */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button
              variant="outline"
              className="w-full h-11 gap-3 rounded-xl text-sm font-medium"
              type="submit"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t("google")}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card/50 px-3 text-muted-foreground/60 backdrop-blur-sm">
                or
              </span>
            </div>
          </div>

          {/* Discord Button */}
          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: "/" });
            }}
          >
            <Button
              className="w-full h-11 gap-3 rounded-xl text-sm font-medium bg-[#5865F2] hover:bg-[#4752C4] text-white border-0"
              type="submit"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              {t("discord")}
            </Button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground/50">
          Spoil responsibly. Read at your own risk.
        </p>
      </div>
    </div>
  );
}
