import { z } from "zod";

// A seat number is always 1..20 (the fixed, generated numbering).
const seatNumberSchema = z.number().int().min(1).max(20);

// Assign (or change) a seat: drop a player into a seat. Move semantics are in the
// service — a player holds at most one seat.
export const assignSeatSchema = z.object({
  seatNumber: seatNumberSchema,
  playerId: z.uuid(),
});
export type AssignSeatInput = z.infer<typeof assignSeatSchema>;

// Empty a seat.
export const clearSeatSchema = z.object({ seatNumber: seatNumberSchema });
export type ClearSeatInput = z.infer<typeof clearSeatSchema>;

// Swap two different seats' occupants.
export const swapSeatsSchema = z
  .object({ seatA: seatNumberSchema, seatB: seatNumberSchema })
  .refine((d) => d.seatA !== d.seatB, {
    message: "Nelze prohodit stejné sedadlo.",
  });
export type SwapSeatsInput = z.infer<typeof swapSeatsSchema>;
