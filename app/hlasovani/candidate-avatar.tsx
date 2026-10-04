import { publicPhotoUrl } from "@/lib/photos";
import { initials } from "@/app/hraci/labels";

// A candidate's photo (from the public player-photos bucket) or initials
// fallback. Mirrors the player card avatar so the two features look consistent.
export function CandidateAvatar({
  name,
  nickname,
  picturePath,
}: {
  name: string;
  nickname: string | null;
  picturePath: string | null;
}) {
  const label = nickname?.trim() || name;
  return picturePath ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={publicPhotoUrl(picturePath)}
      alt={label}
      className="size-10 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
      {initials(name) || "?"}
    </span>
  );
}
