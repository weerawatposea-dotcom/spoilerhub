import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "thai"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "th";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
