import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { UniversalSearch, MobileSearchToggle } from "./universal-search";

export async function Navbar() {
  const session = await auth();
  const t = await getTranslations("Navbar");

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        {/* Left: brand + nav links */}
        <div className="flex shrink-0 items-center gap-6">
          <Link href="/" className="text-xl font-bold text-primary">
            {t("brand")}
          </Link>
          <nav className="hidden gap-4 md:flex">
            <Link href="/browse" className="text-sm text-muted-foreground hover:text-foreground">
              {t("browse")}
            </Link>
          </nav>
        </div>

        {/* Universal Search — center of navbar, desktop only */}
        <div className="hidden flex-1 max-w-md md:block">
          <UniversalSearch />
        </div>

        {/* Right: controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Mobile search toggle */}
          <MobileSearchToggle />
          <LocaleSwitcher />
          <ThemeToggle />
          {session?.user ? (
            <>
              <Link href="/create">
                <Button size="sm">{t("writeSpoiler")}</Button>
              </Link>
              <UserMenu user={session.user} />
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline">{t("signIn")}</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
