"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface SeriesOption {
  id: string;
  title: string;
  type: string;
}

export function SeriesSearch({ onSelect }: { onSelect: (series: SeriesOption) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SeriesOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/series/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <Input
        placeholder="Search series..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          {results.map((s) => (
            <li
              key={s.id}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
              onClick={() => {
                onSelect(s);
                setQuery(s.title);
                setOpen(false);
              }}
            >
              <span className="font-medium">{s.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">{s.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
