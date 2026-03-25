'use client';

import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
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

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#141414' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b6b6b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#141414' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#4a4a4a' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b6b6b' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#333333' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#4a4a4a' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2a2a2a' }] },
];

export function PintMap({ pints, onPintSelect, friendMode = false }: PintMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const mappable = pints.filter(hasCoords);
  const unmapped = pints.filter((p) => !hasCoords(p));

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      try {
        if (!apiKey || apiKey === 'your_google_maps_api_key') {
          setMapsError('Google Maps API key not configured');
          return;
        }

        setOptions({ key: apiKey, v: 'weekly' });
        const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;
        const { Marker } = await importLibrary('marker') as google.maps.MarkerLibrary;

        const centerLng = mappable.length > 0 ? mappable[0].lng : -6.26;
        const centerLat = mappable.length > 0 ? mappable[0].lat : 53.34;

        const map = new Map(mapRef.current!, {
          center: { lat: centerLat, lng: centerLng },
          zoom: mappable.length > 0 ? 13 : 7,
          styles: DARK_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          gestureHandling: 'greedy',
        });

        mapInstanceRef.current = map;

        const pinColor = friendMode ? '#c8c4b8' : '#c9a84c';

        mappable.forEach((pint) => {
          const marker = new Marker({
            position: { lat: pint.lat, lng: pint.lng },
            map,
            icon: {
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: pinColor,
              fillOpacity: 1,
              strokeColor: '#0a0a0a',
              strokeWeight: 1.5,
              scale: 1.6,
              anchor: new google.maps.Point(12, 22),
            },
            title: pint.pubName,
          });

          marker.addListener('click', () => onPintSelect?.(pint));
        });

        if (mappable.length > 1) {
          const bounds = new google.maps.LatLngBounds();
          mappable.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
          map.fitBounds(bounds, 60);
        }
      } catch (err) {
        console.error('Map error:', err);
        setMapsError('Failed to load map');
      }
    };

    initMap();

    return () => {
      mapInstanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mapsError) {
    return (
      <div className="w-full h-full bg-[#111] flex items-center justify-center">
        <div className="text-center space-y-2 p-6 max-w-sm">
          <div className="text-4xl">🗺️</div>
          <p className="font-display text-cream text-lg">Map unavailable</p>
          <p className="font-mono text-cream/40 text-xs">{mapsError}</p>
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
