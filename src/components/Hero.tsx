import { Link } from "@tanstack/react-router";
import { Flame, Star } from "lucide-react";
import heroTeam from "@/assets/hero-team.webp";
import { BUSINESS } from "@/data/business";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[70%] lg:w-[60%]">
        <img
          src={heroTeam}
          alt="Equipo Churrasqueando"
          className="h-full w-full object-cover object-right"
        />
        {/* Left-to-right dark fade so text stays readable; central/right area kept lighter so the background person shows */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/35 via-[20%] to-transparent to-[50%]" />
        {/* Bottom fade for smooth blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>


      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-20 sm:py-28 lg:py-36">
        <div className="flex items-center gap-1 text-ember">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
          <span className="font-cond ml-2 text-xs uppercase tracking-[0.25em] text-primary">
            Lo mejor para tu churrasco
          </span>
        </div>

        <h1 className="font-display max-w-2xl text-5xl uppercase leading-[0.95] tracking-wide text-foreground sm:text-7xl">
          LA CARNE QUE TU <span className="text-primary">PARRILLA</span> ESTA ESPERANDO
        </h1>

        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
          Carnes de calidad, linguiças artesanales, matambres y todo lo que necesitas para el mejor churrasco.
          Pide en línea y recíbelo donde estés o recógelo en el local.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="font-cond text-base font-bold uppercase tracking-wide">
            <Link to="/reservar-catering">
              <Flame className="h-5 w-5" /> RESERVAR CATERING CHURRASQUERO
            </Link>
          </Button>
          <span className="font-cond rounded-full border border-border bg-card/60 px-4 py-2 text-sm uppercase tracking-wide text-muted-foreground backdrop-blur">
            {BUSINESS.hours}
          </span>
        </div>
      </div>
    </section>
  );
}


