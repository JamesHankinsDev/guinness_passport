'use client';

import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { PubStats } from '@/types';

interface PubHeatmapProps {
  pubs: PubStats[];
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

// Gold-to-white gradient — matches the brand palette and the existing map pins.
const HEATMAP_GRADIENT = [
  'rgba(201, 168, 76, 0)',
  'rgba(201, 168, 76, 0.25)',
  'rgba(201, 168, 76, 0.5)',
  'rgba(224, 189, 90, 0.75)',
  'rgba(255, 215, 110, 0.9)',
  'rgba(255, 245, 180, 1)',
];

function hasCoords(p: PubStats) {
  return Math.abs(p.lat) > 0.001 || Math.abs(p.lng) > 0.001;
}

export function PubHeatmap({ pubs }: PubHeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const mappable = pubs.filter(hasCoords);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      try {
        if (!apiKey || apiKey === 'your_google_maps_api_key') {
          setMapsError('Google Maps API key not configured');
          return;
        }

        setOptions({ key: apiKey, v: 'weekly', libraries: ['visualization'] });
        const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;
        const visualization = await importLibrary('visualization') as google.maps.VisualizationLibrary;

        const map = new Map(mapRef.current!, {
          center: { lat: 53.34, lng: -6.26 },
          zoom: mappable.length > 0 ? 4 : 2,
          styles: DARK_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
          gestureHandling: 'greedy',
        });

        mapInstanceRef.current = map;

        // Weight each point by avgRating × log(1 + pintCount) — rating dominates
        // but popular pubs glow brighter than barely-rated outliers.
        const points: google.maps.visualization.WeightedLocation[] = mappable.map((p) => ({
          location: new google.maps.LatLng(p.lat, p.lng),
          weight: p.avgRating * Math.log(1 + p.pintCount),
        }));

        new visualization.HeatmapLayer({
          data: points,
          map,
          radius: 32,
          opacity: 0.75,
          gradient: HEATMAP_GRADIENT,
          dissipating: true,
        });

        if (mappable.length > 1) {
          const bounds = new google.maps.LatLngBounds();
          mappable.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
          map.fitBounds(bounds, 60);
        } else if (mappable.length === 1) {
          map.setCenter({ lat: mappable[0].lat, lng: mappable[0].lng });
          map.setZoom(12);
        }
      } catch (err) {
        console.error('Heatmap error:', err);
        setMapsError('Failed to load heatmap');
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
          <p className="font-display text-cream text-lg">Heatmap unavailable</p>
          <p className="font-mono text-cream/40 text-xs">{mapsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {mappable.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur border border-white/10 rounded-xl px-5 py-4 max-w-xs text-center space-y-1">
            <p className="font-display text-cream text-sm">No data yet</p>
            <p className="font-mono text-cream/40 text-[10px]">
              Pubs appear once they have at least 3 rated pints
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
