"use client";

import { useState } from "react";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { publicPhotoUrl } from "@/lib/photos";
import { initials } from "@/app/hraci/labels";

// The one circular player-photo avatar used across the app (voting, konkláve,
// players). When a photo is present the circle is a button that opens a
// lightbox Dialog showing the photo enlarged (organizers need to see a face to
// find the player IRL — the small avatar is too small). The initials fallback
// is NOT clickable — there is nothing to enlarge. Eliminated players are
// desaturated/dimmed on the thumbnail (both photo and fallback), but the modal
// photo is shown full-strength so the face is clear.
export function PlayerPhoto({
  picturePath,
  name,
  sizeClass = "size-10",
  initialsTextClass = "text-base",
  eliminated = false,
  interactive = true,
}: {
  picturePath: string | null;
  name: string;
  sizeClass?: string;
  initialsTextClass?: string;
  eliminated?: boolean;
  interactive?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!picturePath) {
    return (
      <span
        className={cn(
          "font-display text-gold-bright flex shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[radial-gradient(circle_at_35%_30%,#2c211a,#140f0c)] font-semibold shadow-[inset_0_0_14px_rgba(0,0,0,0.6)]",
          sizeClass,
          initialsTextClass,
          eliminated && "opacity-50 grayscale",
        )}
      >
        {initials(name) || "?"}
      </span>
    );
  }

  const src = publicPhotoUrl(picturePath);

  // Non-interactive variant (e.g. inside a seat tile that is itself a button):
  // render just the image, no lightbox, no nested button.
  if (!interactive) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn(
          sizeClass,
          "shrink-0 rounded-full object-cover",
          eliminated && "opacity-50 grayscale",
        )}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Zvětšit fotku — ${name}`}
        className={cn(
          "focus-visible:ring-ring focus-visible:ring-offset-background shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          sizeClass,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className={cn(
            sizeClass,
            "shrink-0 rounded-full object-cover",
            eliminated && "opacity-50 grayscale",
          )}
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(92vw,520px)] p-2">
          <DialogHeader>
            <DialogTitle className="font-display px-1 text-center text-[17px]">
              {name}
            </DialogTitle>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Zavřít"
            className="cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={name}
              className="h-auto max-h-[80vh] w-full rounded-lg object-contain"
            />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
