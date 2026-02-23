export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export async function getCurrentPosition(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export async function searchNearbyPubs(lat: number, lng: number): Promise<PlaceResult[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'your_google_maps_api_key') {
    // Return mock data when no API key is set
    return getMockPubs(lat, lng);
  }

  const url = `/api/places/nearby?lat=${lat}&lng=${lng}`;
  const res = await fetch(url);
  if (!res.ok) return getMockPubs(lat, lng);
  return res.json();
}

export async function searchPubsByText(query: string): Promise<PlaceResult[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'your_google_maps_api_key') {
    return getMockPubs(51.5, -0.12);
  }

  const url = `/api/places/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

function getMockPubs(lat: number, lng: number): PlaceResult[] {
  return [
    {
      placeId: 'mock_1',
      name: 'The Black Harp',
      address: '123 Stout Street, Dublin',
      lat: lat + 0.001,
      lng: lng + 0.001,
    },
    {
      placeId: 'mock_2',
      name: "Mulligan's",
      address: '8 Poolbeg Street, Dublin 2',
      lat: lat + 0.002,
      lng: lng - 0.001,
    },
    {
      placeId: 'mock_3',
      name: 'The Long Hall',
      address: '51 S Great George\'s St, Dublin 2',
      lat: lat - 0.001,
      lng: lng + 0.002,
    },
  ];
}
