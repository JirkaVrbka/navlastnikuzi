import { requireUser } from "@/lib/auth";
import {
  getDaysWithEvents,
  getUsersForPicker,
  getExistingBlocks,
} from "@/lib/db/itinerary";
import { DayCreateDialog } from "./day-create-dialog";
import { ItineraryView } from "./itinerary-view";

export default async function ItineraryPage() {
  await requireUser();
  const [days, users, blocks] = await Promise.all([
    getDaysWithEvents(),
    getUsersForPicker(),
    getExistingBlocks(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px] pt-5">
      <h1 className="font-display text-[27px] font-semibold tracking-[0.01em]">
        Itinerář
      </h1>
      <div className="mb-5 flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
          Průběh večera
        </p>
        <DayCreateDialog />
      </div>

      {days.length === 0 ? (
        <p className="text-muted-foreground mt-4">
          Zatím žádné dny. Přidejte první den tlačítkem „+ Nový den“.
        </p>
      ) : (
        <ItineraryView days={days} users={users} blocks={blocks} />
      )}
    </main>
  );
}
