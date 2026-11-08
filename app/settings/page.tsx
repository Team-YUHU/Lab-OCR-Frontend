"use client";

import { useSyncExternalStore } from "react";
import { CheckIcon, MonitorCogIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { AccountCard } from "@/components/account-menu";

const themes = [
  {
    id: "light",
    name: "Light",
    description: "Bright surfaces and crisp contrast.",
  },
  {
    id: "dark",
    name: "Dark",
    description: "A comfortable, low-light workspace.",
  },
  {
    id: "retro",
    name: "Retro",
    description: "Pixel lettering with muted sage and olive tones.",
  },
  {
    id: "mgr",
    name: "MRG",
    description: "Navy, white, and light green inspired by MRG Laboratories.",
  },
] as const;

const subscribeToMount = () => () => {};
const getMountedSnapshot = () => true;
const getServerSnapshot = () => false;

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getMountedSnapshot,
    getServerSnapshot,
  );
  const activeTheme = mounted ? theme : "dark";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">PREFERENCES</p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Personalize the look and feel of your workspace.
        </p>
      </header>

      <AccountCard />

      <section
        aria-labelledby="appearance-heading"
        className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm sm:p-7"
      >
        <div className="mb-6 flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
            <MonitorCogIcon className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="appearance-heading" className="text-lg font-semibold">
              Appearance
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose a theme for the entire website. Your choice is saved on this device.
            </p>
          </div>
        </div>

        <div role="radiogroup" aria-label="Choose a website theme" className="grid gap-3 sm:grid-cols-2">
          {themes.map((option) => {
            const selected = activeTheme === option.id;

            return (
              <label
                key={option.id}
                className={`theme-option${selected ? " is-selected" : ""}`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="appearance-theme"
                  value={option.id}
                  checked={selected}
                  onChange={(event) => setTheme(event.currentTarget.value)}
                />
                <span className={`theme-preview theme-preview-${option.id}`} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="theme-option-copy">
                  <span className="theme-option-name">{option.name}</span>
                  <span className="theme-option-description">{option.description}</span>
                </span>
                <span className="theme-option-check" aria-hidden="true">
                  {selected && <CheckIcon />}
                </span>
              </label>
            );
          })}
        </div>
        <p className="sr-only" aria-live="polite">
          {mounted
            ? `${themes.find((option) => option.id === activeTheme)?.name ?? "Dark"} theme selected.`
            : ""}
        </p>
      </section>
    </main>
  );
}
