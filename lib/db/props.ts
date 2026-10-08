import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { props } from "@/lib/db/schema";
import type { PropInput } from "@/lib/validation/props";

// All catalog props, alphabetically by name (full rows) — the Rekvizity board.
export async function getProps() {
  return db.query.props.findMany({
    orderBy: (p, { asc }) => [asc(p.name)],
  });
}

// Props for the event picker (id + name only), alphabetically by name. Mirrors
// getUsersForPicker in lib/db/itinerary.ts.
export async function getPropsForPicker() {
  return db
    .select({ id: props.id, name: props.name })
    .from(props)
    .orderBy(asc(props.name));
}
export type PickableProp = Awaited<
  ReturnType<typeof getPropsForPicker>
>[number];

// ── Shared CRUD cores (used by BOTH the web actions and the MCP tools) ───────
// A unique-name collision (SQLSTATE 23505) is NOT caught here — it throws so the
// caller can map it to a friendly Czech message (web field error / MCP text).

// Insert a prop and return its id.
export async function createProp(data: PropInput): Promise<string> {
  const [row] = await db
    .insert(props)
    .values({
      name: data.name,
      count: data.count,
      haveIt: data.haveIt,
      note: data.note ?? null,
    })
    .returning({ id: props.id });
  return row.id;
}

// Update only the provided fields of a prop. Returns the number of rows updated
// (0 = the prop no longer exists). A no-op patch leaves the row untouched.
export async function updateProp(
  id: string,
  data: Partial<PropInput>,
): Promise<number> {
  const set: Partial<{
    name: string;
    count: number;
    haveIt: boolean;
    note: string | null;
  }> = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.count !== undefined) set.count = data.count;
  if (data.haveIt !== undefined) set.haveIt = data.haveIt;
  if (data.note !== undefined) set.note = data.note ?? null;
  if (Object.keys(set).length === 0) {
    const [row] = await db
      .select({ id: props.id })
      .from(props)
      .where(eq(props.id, id));
    return row ? 1 : 0;
  }
  const updated = await db
    .update(props)
    .set(set)
    .where(eq(props.id, id))
    .returning({ id: props.id });
  return updated.length;
}

// Delete a prop (event_items.prop_id is SET NULL by the FK). Returns the number
// of rows deleted (0 = the prop no longer exists).
export async function deleteProp(id: string): Promise<number> {
  const deleted = await db
    .delete(props)
    .where(eq(props.id, id))
    .returning({ id: props.id });
  return deleted.length;
}
