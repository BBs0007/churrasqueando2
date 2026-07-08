import { Flame, Star } from "lucide-react";
import hero from "@/assets/hero-churrasco.jpg";
import { BUSINESS } from "@/data/business";
import { Button } from "@/components/ui/button";

export function Hero() {
  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden">
      <img
        src={hero}
        alt="Churrasco a la parrilla"
        width={1920}
        height={1024}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-20 sm:py-28 lg:py-36">
        <div className="flex items-center gap-1 text-ember">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
          <span className="font-cond ml-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Lo mejor para tu churrasco
          </span>
        </div>

        <h1 className="font-display max-w-2xl text-5xl uppercase leading-[0.95] tracking-wide text-foreground sm:text-7xl">
          Sabor de <span className="text-gradient-fire">parrilla</span> a tu puerta
        </h1>

        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
          Linguiças artesanales, matambres y todo lo que necesitas para el mejor churrasco.
          Pide en línea y recíbelo donde estés o recógelo en el local.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={scrollToMenu}
            className="font-cond text-base font-bold uppercase tracking-wide"
          >
            <Flame className="h-5 w-5" /> Ver el menú
          </Button>
          <span className="font-cond rounded-full border border-border bg-card/60 px-4 py-2 text-sm uppercase tracking-wide text-muted-foreground backdrop-blur">
            {BUSINESS.hours}
          </span>
        </div>
      </div>
    </section>
  );
}
