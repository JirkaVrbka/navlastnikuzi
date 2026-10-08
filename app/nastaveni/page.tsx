import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { NameForm } from "./name-form";
import { PasswordForm } from "./password-form";

export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-[440px] px-[18px] pt-5">
      <h1 className="font-display text-[27px] leading-tight font-semibold tracking-[0.01em]">
        Nastavení účtu
      </h1>
      <p className="text-muted-foreground/80 text-xs tracking-[0.16em] uppercase">
        Můj účet
      </p>
      <p className="text-muted-foreground/70 mt-1 mb-[18px] text-sm">
        Přihlášen jako {profile.email}
      </p>

      <div className="flex flex-col gap-4">
        <NameForm currentName={profile.displayName ?? ""} />
        <PasswordForm />
      </div>
    </main>
  );
}
