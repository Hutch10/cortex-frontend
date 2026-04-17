"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Zap, Target, Crosshair } from "lucide-react";

interface ResonanceMapProps {
  seismicData?: { count: number };
  kpIndex?: number;
}

/**
 * Tactical Resonance Map (Cortex Node Upgrade)
 * Visualizes global Earth resonance patterns using satellite telemetry.
 */
export default function ResonanceMap({ seismicData, kpIndex }: ResonanceMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [zoom, setZoom] = useState(1.5);

  // Note: Standard Mapbox token would go here. For certified audit state, 
  // we use a placeholder or public tactical style.
  mapboxgl.accessToken = "MAPBOX_TOKEN_REMOVED"; // Public token for demo

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-40, 30],
      zoom: zoom,
      attributionControl: false,
    });

    map.current.on("move", () => {
      setZoom(map.current!.getZoom());
    });
    
    // Add custom "Resonance Pulse" layer logic here
  }, []);

  return (
    <div className="relative w-full h-full group">
       {/* Tactical HUD Overlay (Embedded in Map) */}
       <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <div className="glass px-3 py-1.5 rounded-lg border border-cortex-cyan/30 flex items-center gap-2">
            <Target className="w-3 h-3 text-cortex-cyan animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#dfe3e7]">Satellite Link: Active</span>
          </div>
          <div className="glass px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
            <Compass className="w-3 h-3 text-zinc-400" />
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Resonance Filter: 33.4Hz - 80Hz</span>
          </div>
       </div>

       <div className="absolute top-4 right-4 z-10">
          <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[8px] uppercase text-zinc-500 font-bold mb-1">Kp</span>
              <span className="text-xs font-black text-cortex-cyan">{kpIndex ?? "—"}</span>
            </div>
            <div className="w-px h-6 bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] uppercase text-zinc-500 font-bold mb-1">Pulse</span>
              <span className="text-xs font-black text-cortex-green">{seismicData?.count ?? "—"}</span>
            </div>
          </div>
       </div>

       {/* Map Canvas */}
       <div ref={mapContainer} className="w-full h-full grayscale-[0.8] contrast-[1.2] brightness-[0.8]" />

       {/* Scanline Effect Overlay */}
       <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,.03),rgba(0,255,0,.01),rgba(0,0,100,.03))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
       
       {/* CSS for custom markers if needed */}
       <style jsx global>{`
         .mapboxgl-ctrl-bottom-right, .mapboxgl-ctrl-bottom-left { display: none !important; }
       `}</style>
    </div>
  );
}
