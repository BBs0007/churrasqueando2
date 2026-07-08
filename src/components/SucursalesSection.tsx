import { useState } from "react";
import { MapPin, Navigation, Flame } from "lucide-react";
import { BranchesMap } from "@/components/BranchesMap";
import { BRANCHES } from "@/data/branches";

export function SucursalesSection() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section id="sucursales" className="border-t border-border bg-card/40 scroll-mt-24">
      <div className="px-4 pt-14 sm:px-6">
        <div className="mx-auto mb-6 flex max-w-7xl items-center gap-3">
          <Flame className="h-6 w-6 text-primary" />
          <h2 className="font-display text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
            Nuestras <span className="text-gradient-fire">sucursales</span>
          </h2>
        </div>
      </div>

      <div className="w-full">
        <BranchesMap active={active} onSelect={setActive} />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BRANCHES.map((b) => (
              <button
                key={b.id}
                onClick={() => setActive(b.id)}
                className={`flex w-full gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  active === b.id
                    ? "border-primary bg-card"
                    : "border-border/70 bg-card/60 hover:border-primary/60"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-fire text-primary-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-cond text-base font-semibold uppercase tracking-wide text-foreground">
                    {b.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{b.address}</p>
                  <p className="text-xs text-muted-foreground/80">{b.city}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Navigation className="h-3.5 w-3.5" /> Cómo llegar
                  </a>
                </div>
              </button>
            ))}
        </div>
      </div>
    </section>

  );
}
