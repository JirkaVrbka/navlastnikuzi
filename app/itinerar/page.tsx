import { requireUser, getProfile } from "@/lib/auth";
import {
  getDaysWithEvents,
  getUsersForPicker,
  getExistingBlocks,
  getExistingTypesWithColor,
} from "@/lib/db/itinerary";
import { getPropsForPicker } from "@/lib/db/props";
import { DayCreateDialog } from "./day-create-dialog";
import { ItineraryView } from "./itinerary-view";

export default async function ItineraryPage() {
  await requireUser();
  const profile = await getProfile();
  const admin = profile?.role === "admin";
  const [days, users, props, blocks, types] = await Promise.all([
    getDaysWithEvents(),
    getUsersForPicker(),
    getPropsForPicker(),
    getExistingBlocks(),
    getExistingTypesWithColor(),
  ]);

  // Server wall-clock date ("YYYY-MM-DD"), threaded to the view so a freshly
  // created (empty) day dated today/future stays visible and actionable.
  const n = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  const today = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px] pt-5">
      <h1 className="font-display text-[27px] font-semibold tracking-[0.01em]">
        Itinerář
      </h1>
      <div className="mb-5 flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
          Průběh večera
        </p>
        {admin && <DayCreateDialog />}
      </div>

      {days.length === 0 ? (
        <p className="text-muted-foreground mt-4">
          Zatím žádné dny. Přidejte první den tlačítkem „+ Nový den“.
        </p>
      ) : (
        <ItineraryView
          days={days}
          users={users}
          props={props}
          blocks={blocks}
          types={types}
          today={today}
          isAdmin={admin}
        />
      )}
    </main>
  );
}
