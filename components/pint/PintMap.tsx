'use client';

import { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Pint } from '@/types';

interface PintMapProps {
  pints: Pint[];
  onPintSelect?: (pint: Pint) => void;
  /** When true, markers render in a lighter cream colour to indicate friend pints. */
  friendMode?: boolean;
}

/** A pint has valid coordinates if it's not sitting at 0,0 (the Atlantic null-island). */
function hasCoords(p: Pint) {
  return Math.abs(p.lat) > 0.001 || Math.abs(p.lng) > 0.001;
}

export function PintMap({ pints, onPintSelect, friendMode = false }: PintMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [mapboxError, setMapboxError] = useState<string | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Pints that can actually be plotted
  const mappable = pints.filter(hasCoords);
  const unmapped = pints.filter((p) => !hasCoords(p));

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;

        if (!token || token === 'your_mapbox_token') {
          setMapboxError('Mapbox token not configured');
          return;
        }

        mapboxgl.accessToken = token;

        // Centre on the first mappable pint, or fall back to Dublin
        const centerLng = mappable.length > 0 ? mappable[0].lng : -6.26;
        const centerLat = mappable.length > 0 ? mappable[0].lat : 53.34;

        const map = new mapboxgl.Map({
          container: mapRef.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [centerLng, centerLat],
          zoom: mappable.length > 0 ? 12 : 6,
        });

        mapInstanceRef.current = map;

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

        map.on('load', () => {
          map.resize();

          // Only plot pints with valid coordinates
          const pinColor = friendMode ? '#c8c4b8' : '#c9a84c';
          const pinShadow = friendMode ? 'rgba(200,196,184,0.35)' : 'rgba(201,168,76,0.4)';
          mappable.forEach((pint) => {
            const el = document.createElement('div');
            el.className = 'custom-pin';
            el.style.cssText = `
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              background: ${pinColor};
              border: 2px solid #0a0a0a;
              transform: rotate(-45deg);
              cursor: pointer;
              box-shadow: 0 2px 8px ${pinShadow};
              position: relative;
            `;

            const inner = document.createElement('div');
            inner.style.cssText = `
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(45deg);
              width: 10px;
              height: 10px;
              background: #0a0a0a;
              border-radius: 50%;
            `;
            el.appendChild(inner);

            el.addEventListener('click', () => onPintSelect?.(pint));

            new mapboxgl.Marker(el)
              .setLngLat([pint.lng, pint.lat])
              .addTo(map);
          });

          // Fit bounds to all mapped pints
          if (mappable.length > 1) {
            const bounds = mappable.reduce(
              (b, p) => b.extend([p.lng, p.lat] as [number, number]),
              new mapboxgl.LngLatBounds(
                [mappable[0].lng, mappable[0].lat],
                [mappable[0].lng, mappable[0].lat]
              )
            );
            map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
          }
        });
      } catch (err) {
        console.error('Map error:', err);
        setMapboxError('Failed to load map');
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mapboxError) {
    return (
      <div className="w-full h-full bg-[#111] flex items-center justify-center">
        <div className="text-center space-y-2 p-6 max-w-sm">
          <div className="text-4xl">🗺️</div>
          <p className="font-display text-cream text-lg">Map unavailable</p>
          <p className="font-mono text-cream/40 text-xs">{mapboxError}</p>
          <p className="font-mono text-cream/30 text-xs mt-2">
            Add your Mapbox token to .env.local to enable the map
          </p>
          {pints.length > 0 && (
            <div className="mt-4 space-y-2 text-left max-h-48 overflow-y-auto">
              {pints.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPintSelect?.(p)}
                  className="w-full text-left bg-white/5 hover:bg-white/8 rounded-lg px-3 py-2 transition-colors"
                >
                  <p className="font-display text-cream text-sm">{p.pubName}</p>
                  <p className="font-mono text-cream/40 text-xs">{p.address}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Badge for pints that have no coordinates */}
      {unmapped.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 bg-black/80 backdrop-blur border border-white/10 rounded-full px-3 py-1.5">
          <span className="font-mono text-cream/50 text-xs">
            {unmapped.length} pint{unmapped.length !== 1 ? 's' : ''} without location
          </span>
        </div>
      )}
    </div>
  );
}
