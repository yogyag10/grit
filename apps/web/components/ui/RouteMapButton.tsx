"use client";

import "leaflet/dist/leaflet.css";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ROUTES } from "@/lib/routes";
import { SPOTS, type SceneKind } from "@/lib/spots";

/** Wraps the small map thumbnail: tap it to open the recommended trail for this spot on a real map. */
export function RouteMapButton({ spot, className = "", children }: { spot: SceneKind; className?: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const route = ROUTES[spot];
  const name = SPOTS[spot].name;

  useEffect(() => {
    if (!open || !mapEl.current) return;
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    const el = mapEl.current;
    void import("leaflet").then((L) => {
      if (cancelled) return;
      map = L.map(el, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const lines = route.segments.map((s) => L.polyline(s, { color: "#2f8f2a", weight: 6, opacity: 0.95 }).addTo(map!));
      map.fitBounds(L.featureGroup(lines).getBounds(), { padding: [24, 24] });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [open, route]);

  function show() {
    setOpen(true);
    dialog.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={`Open the recommended trail map for ${name}`}
        className={`rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath ${className}`}
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-label={`Recommended trail at ${name}`}
        className="m-auto w-[min(100vw-24px,28rem)] max-w-none overflow-hidden rounded-[20px] bg-card p-0 text-ink backdrop:bg-black/70"
      >
        <div className="flex items-start justify-between gap-3 p-4">
          <div>
            <h2 className="text-xl font-bold">{name}</h2>
            <p className="text-sm text-muted">
              Recommended trail: {route.trail}, about {(route.meters / 1000).toFixed(1)} km
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close map"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div ref={mapEl} role="region" aria-label={`Map of the ${route.trail}`} className="h-[360px] w-full bg-[#e6e9e0]" />
        <p className="p-4 text-xs text-muted">
          A suggested route from OpenStreetMap trail data, not a measured pact course. Any run you do still counts from your Strava GPS. Check conditions first; some
          trails include stairs.
        </p>
      </dialog>
    </>
  );
}
