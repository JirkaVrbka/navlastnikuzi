import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDaysWithEvents, getUsersForPicker } from "@/lib/db/itinerary";
import { buttonVariants } from "@/components/ui/button";
import { DayCreateForm } from "./day-create-form";
import { DaySection } from "./day-section";

export default async function ItineraryPage() {
  await requireUser();
  const [days, users] = await Promise.all([
    getDaysWithEvents(),
    getUsersForPicker(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Itinerář</h1>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          Domů
        </Link>
      </div>

      <DayCreateForm />

      {days.length === 0 ? (
        <p className="text-muted-foreground">
          Zatím žádné dny. Vytvořte první den výše.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => (
            <DaySection key={day.id} day={day} users={users} />
          ))}
        </div>
      )}
    </main>
  );
}
