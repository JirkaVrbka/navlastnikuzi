import { requireUser } from "@/lib/auth";
import { getProps } from "@/lib/db/props";
import { PropsBoard } from "./props-board";

export default async function PropsPage() {
  await requireUser();
  const props = await getProps();

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px]">
      <h1 className="font-display mt-1.5 text-[27px] leading-tight font-semibold tracking-[0.01em]">
        Rekvizity
      </h1>
      <p className="text-muted-foreground/80 mb-[18px] text-xs tracking-[0.16em] uppercase">
        Katalog rekvizit
      </p>

      <PropsBoard props={props} />
    </main>
  );
}
