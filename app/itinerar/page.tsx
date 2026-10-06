import { requireUser } from "@/lib/auth";
import { getDaysWithEvents, getUsersForPicker } from "@/lib/db/itinerary";
import { DayCreateForm } from "./day-create-form";
import { DaySection } from "./day-section";

export default async function ItineraryPage() {
  await requireUser();
  const [days, users] = await Promise.all([
    getDaysWithEvents(),
    getUsersForPicker(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px] pt-5">
      <h1 className="font-display text-[27px] font-semibold tracking-[0.01em]">
        Itinerář
      </h1>
      <p className="text-muted-foreground mb-5 text-xs tracking-[0.16em] uppercase">
        Průběh večera
      </p>

      <DayCreateForm />

      {days.length === 0 ? (
        <p className="text-muted-foreground mt-4">
          Zatím žádné dny. Vytvořte první den výše.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3.5">
          {days.map((day) => (
            <DaySection key={day.id} day={day} users={users} />
          ))}
        </div>
      )}
    </main>
  );
}
