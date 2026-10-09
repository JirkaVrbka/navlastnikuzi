// Pure seating geometry for the rectangular table (feature "Stůl"). The physical
// table has 20 seats: 6 along each LONG side, 4 along each SHORT side, corners
// bare. Seat numbers 1..20 are assigned CLOCKWISE starting at the top-left
// corner and are permanent (never editable). This module is the single source of
// truth for that rule; the DB stores only seat_number + the seated player.

export const SEATS_PER_LONG_SIDE = 6;
export const SEATS_PER_SHORT_SIDE = 4;
export const SEAT_COUNT = SEATS_PER_LONG_SIDE * 2 + SEATS_PER_SHORT_SIDE * 2; // 20

// Fixed label shown on the top (head) short edge. Non-editable (a constant).
export const HEAD_LABEL = "Bar";

export type Edge = "top" | "right" | "bottom" | "left";

// Which edge a seat sits on. Clockwise from the top-left corner:
//   top    (short, 4): 1..4
//   right  (long,  6): 5..10
//   bottom (short, 4): 11..14
//   left   (long,  6): 15..20
export function edgeForSeat(seatNumber: number): Edge {
  if (seatNumber <= 4) return "top";
  if (seatNumber <= 10) return "right";
  if (seatNumber <= 14) return "bottom";
  return "left";
}

export interface BoardSlots {
  top: number[];
  right: number[];
  bottom: number[];
  left: number[];
}

// Seat numbers on each edge in on-SCREEN reading order, so the board can drop
// them straight into flex containers (top/bottom rows read left→right; left/right
// columns read top→bottom). Numbering runs clockwise, so the BOTTOM edge (numbered
// right→left) and the LEFT edge (numbered bottom→top) are reversed to read in
// screen order.
export function boardSlots(): BoardSlots {
  return {
    top: [1, 2, 3, 4],
    right: [5, 6, 7, 8, 9, 10],
    bottom: [14, 13, 12, 11],
    left: [20, 19, 18, 17, 16, 15],
  };
}
