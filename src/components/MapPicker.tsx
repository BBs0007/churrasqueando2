/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { BUSINESS } from "@/data/business";
import { Button } from "@/components/ui/button";

export type LatLng = { lat: number; lng: number };

export function MapPicker({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        const center = value ?? { lat: BUSINESS.pickup.lat, lng: BUSINESS.pickup.lng };
        const map = new g.maps.Map(containerRef.current, {
          center,
          zoom: value ? 16 : 13,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          styles: DARK_STYLE,
        });
        mapRef.current = map;

        const placeMarker = (pos: LatLng) => {
          if (markerRef.current) {
            markerRef.current.setPosition(pos);
          } else {
            markerRef.current = new g.maps.Marker({
              position: pos,
              map,
              draggable: true,
            });
            markerRef.current.addListener("dragend", () => {
              const p = markerRef.current!.getPosition();
              if (p) onChange({ lat: p.lat(), lng: p.lng() });
            });
          }
          onChange(pos);
        };

        if (value) placeMarker(value);

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) placeMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });

        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? "Error al cargar el mapa");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (mapRef.current) {
        mapRef.current.setCenter(p);
        mapRef.current.setZoom(16);
      }
      if (markerRef.current) markerRef.current.setPosition(p);
      else if (mapRef.current && window.google)
        markerRef.current = new window.google.maps.Marker({
          position: p,
          map: mapRef.current,
          draggable: true,
        });
      onChange(p);
    });
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-border">
        <div ref={containerRef} className="h-64 w-full bg-secondary" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/80">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
            {error}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          {value
            ? "Punto de entrega marcado. Arrastra el pin para ajustar."
            : "Toca el mapa para marcar dónde quieres recibir tu pedido."}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} className="shrink-0">
          <Navigation className="h-3.5 w-3.5" /> Mi ubicación
        </Button>
      </div>
    </div>
  );
}

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#242021" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242021" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a89c95" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#3a3334" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#c9bfba" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];
