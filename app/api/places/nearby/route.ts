import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'your_google_maps_api_key' || !lat || !lng) {
    return NextResponse.json([]);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=500&type=bar|pub&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') {
      return NextResponse.json([]);
    }

    const results = data.results.slice(0, 8).map((place: {
      place_id: string;
      name: string;
      vicinity: string;
      geometry: { location: { lat: number; lng: number } };
    }) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.vicinity,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    }));

    return NextResponse.json(results);
  } catch (err) {
    console.error('Places API error:', err);
    return NextResponse.json([]);
  }
}
