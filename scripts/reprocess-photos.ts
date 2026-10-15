// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME operational script: re-encode every existing player photo to WebP
// (≤1024px) and give it a 1-year immutable cache, bringing old uploads in line
// with the current upload paths (app/hraci/actions.ts + lib/mcp/tools.ts).
//
// ⚠️ DESTRUCTIVE / ENVIRONMENT-SENSITIVE: it reads, uploads, UPDATES rows and
// DELETES storage objects in WHATEVER database + bucket the loaded env points
// at (DATABASE_URL + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from
// .env.local). Point it at prod only on purpose.
//
// SAFE BY DEFAULT: runs as a DRY RUN unless you pass `--apply`. A dry run logs
// the planned changes (old path, old size, projected new size) and writes
// NOTHING. Usage:
//   tsx scripts/reprocess-photos.ts            # dry run (no writes)
//   tsx scripts/reprocess-photos.ts --dry-run  # dry run (explicit)
//   tsx scripts/reprocess-photos.ts --apply    # actually re-encode + rewrite
// ─────────────────────────────────────────────────────────────────────────────
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db, closeDb } from "../lib/db";
import { players } from "../lib/db/schema";
import { isExternalPhotoUrl } from "../lib/photos";
import { downscalePhoto } from "../lib/images/resize";

const BUCKET = "player-photos";

async function main() {
  // Default to a dry run unless --apply is explicitly given.
  const apply = process.argv.includes("--apply");
  const mode = apply ? "APPLY (writes enabled)" : "DRY RUN (no writes)";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  // Service-role Storage client (bypasses RLS), same pattern as the web action.
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`reprocess-photos — mode: ${mode}`);
  console.log(`target Supabase: ${url}`);

  const rows = await db
    .select({ id: players.id, picturePath: players.picturePath })
    .from(players);

  // Only bucket-stored objects are reprocessed; external URLs (MCP URL mode)
  // are not objects we own, so they are skipped untouched.
  const targets = rows.filter(
    (r) => r.picturePath && !isExternalPhotoUrl(r.picturePath),
  );

  console.log(
    `${rows.length} players, ${targets.length} with a bucket photo to reprocess.`,
  );

  let done = 0;
  let failed = 0;
  for (const row of targets) {
    const oldPath = row.picturePath!;
    try {
      const { data: blob, error: dlErr } = await admin.storage
        .from(BUCKET)
        .download(oldPath);
      if (dlErr || !blob) {
        throw dlErr ?? new Error("download returned no data");
      }
      const oldBytes = blob.size;
      const input = Buffer.from(await blob.arrayBuffer());
      const { data, contentType, ext } = await downscalePhoto(input);
      const newPath = `${oldPath.replace(/\.[^.]+$/, "")}.${ext}`;

      console.log(
        `  player ${row.id}: ${oldPath} (${oldBytes} B) → ${newPath} (${data.length} B)`,
      );

      if (!apply) continue;

      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(newPath, data, {
          contentType,
          cacheControl: "31536000",
          upsert: true,
        });
      if (upErr) throw upErr;

      await db
        .update(players)
        .set({ picturePath: newPath })
        .where(eq(players.id, row.id));

      // Remove the old object only when the name actually changed (e.g. a
      // ".jpg" became ".webp"); a same-name re-encode was already upserted.
      if (newPath !== oldPath) {
        const { error: rmErr } = await admin.storage
          .from(BUCKET)
          .remove([oldPath]);
        if (rmErr) {
          console.warn(`    warning: could not remove old object ${oldPath}`);
        }
      }
      done++;
    } catch (err) {
      failed++;
      console.error(`  player ${row.id}: FAILED (${oldPath}):`, err);
    }
  }

  if (apply) {
    console.log(`Done. reprocessed=${done} failed=${failed}`);
  } else {
    console.log(
      `Dry run complete — nothing written. Re-run with --apply to perform changes.`,
    );
  }
}

main()
  .then(async () => {
    await closeDb();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await closeDb();
    process.exit(1);
  });
