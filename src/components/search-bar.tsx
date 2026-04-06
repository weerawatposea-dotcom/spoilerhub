"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) { params.set("q", query); } else { params.delete("q"); }
      router.push(`/browse?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return <Input placeholder="Search series..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-md" />;
}
