"use client";

import { vote } from "@/actions/vote";
import { Button } from "@/components/ui/button";
import { useOptimistic, useTransition } from "react";

interface VoteButtonProps { spoilerId: string; upvoteCount: number; userVote: 1 | -1 | null }

export function VoteButton({ spoilerId, upvoteCount, userVote }: VoteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { count: upvoteCount, vote: userVote },
    (state, newVote: 1 | -1) => {
      if (state.vote === newVote) return { count: state.count - newVote, vote: null };
      const diff = state.vote ? newVote - state.vote : newVote;
      return { count: state.count + diff, vote: newVote };
    }
  );

  function handleVote(value: 1 | -1) {
    startTransition(async () => { setOptimistic(value); await vote(spoilerId, value); });
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant={optimistic.vote === 1 ? "default" : "outline"} size="sm" onClick={() => handleVote(1)} disabled={isPending}>+</Button>
      <span className="min-w-[3ch] text-center text-sm font-medium">{optimistic.count}</span>
      <Button variant={optimistic.vote === -1 ? "destructive" : "outline"} size="sm" onClick={() => handleVote(-1)} disabled={isPending}>-</Button>
    </div>
  );
}
