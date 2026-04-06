import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-primary">
            SpoilerHub
          </Link>
          <nav className="hidden gap-4 md:flex">
            <Link
              href="/browse"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Browse
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              <Link href="/create">
                <Button size="sm">Write Spoiler</Button>
              </Link>
              <UserMenu user={session.user} />
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
