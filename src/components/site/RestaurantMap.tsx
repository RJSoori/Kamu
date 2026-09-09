"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { env } from "@/lib/env";

/**
 * Single-pin map for a restaurant's location. Renders a fallback instead of
 * a map when NEXT_PUBLIC_MAPBOX_TOKEN isn't set -- that env var is optional
 * (see lib/env.ts) specifically so the app boots without one; this is the
 * one place that actually needs it.
 */
export function RestaurantMap({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!env.NEXT_PUBLIC_MAPBOX_TOKEN || !containerRef.current) {
      return;
    }

    mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [longitude, latitude],
      zoom: 14,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    new mapboxgl.Marker().setLngLat([longitude, latitude]).addTo(map);

    // Edit mode: unmounting between latitude/longitude changes and
    // re-creating the map is simpler and more robust than trying to pan an
    // existing instance, and this only re-runs when coordinates change.
    return () => map.remove();
  }, [latitude, longitude]);

  if (!env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        Map view needs a Mapbox token (NEXT_PUBLIC_MAPBOX_TOKEN). Coordinates
        on file: {latitude}, {longitude}.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Map showing ${name}'s location`}
      className="h-64 w-full overflow-hidden rounded-3xl"
    />
  );
}
