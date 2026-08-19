/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { BRANCHES, type Branch } from "@/data/branches";
import pin from "@/assets/branch-pin.png";

export function BranchesMap({
  active,
  onSelect,
}: {
  active: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;

        const map = new g.maps.Map(containerRef.current, {
          center: { lat: BRANCHES[0].lat, lng: BRANCHES[0].lng },
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          styles: DARK_STYLE,
        });
        mapRef.current = map;

        const icon: google.maps.Icon = {
          url: pin,
          scaledSize: new g.maps.Size(42, 59),
          anchor: new g.maps.Point(21, 59),
        };

        const bounds = new g.maps.LatLngBounds();
        BRANCHES.forEach((b: Branch) => {
          const marker = new g.maps.Marker({
            position: { lat: b.lat, lng: b.lng },
            map,
            icon,
            title: b.name,
          });
          marker.addListener("click", () => onSelect(b.id));
          markersRef.current[b.id] = marker;
          bounds.extend({ lat: b.lat, lng: b.lng });
        });
        map.fitBounds(bounds, 64);

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

  useEffect(() => {
    if (!active || !mapRef.current) return;
    const b = BRANCHES.find((x) => x.id === active);
    if (!b) return;
    mapRef.current.panTo({ lat: b.lat, lng: b.lng });
    mapRef.current.setZoom(15);
    const m = markersRef.current[active];
    if (m && window.google) {
      m.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => m.setAnimation(null), 1400);
    }
  }, [active]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border shadow-card">
      <div ref={containerRef} className="h-[60vh] min-h-80 w-full bg-secondary" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/80">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
          {error}
        </div>
      )}
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
