"use client";

import { PlayerPhoto } from "@/components/player-photo";

// A candidate's photo (from the public player-photos bucket) or initials
// fallback. Mirrors the player card avatar so the two features look consistent.
export function CandidateAvatar({
  name,
  picturePath,
}: {
  name: string;
  nickname: string | null;
  picturePath: string | null;
}) {
  return (
    <PlayerPhoto picturePath={picturePath} name={name} sizeClass="size-10" />
  );
}
