import { Link } from "@/i18n/navigation";

interface Crumb { label: string; href: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem", position: index + 1, name: item.label,
      item: `${process.env.NEXT_PUBLIC_APP_URL}${item.href}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <span key={item.href} className="flex items-center gap-1">
            {i > 0 && <span>/</span>}
            {i === items.length - 1 ? (
              <span className="text-foreground">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-foreground">{item.label}</Link>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
