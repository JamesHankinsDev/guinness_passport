import { NextRequest, NextResponse } from 'next/server';

// Placeholder: Accepts a multipart/form-data POST with an image file
export async function POST(req: NextRequest) {
  // In a real implementation, parse the image and run ML scoring here
  // For now, just return a random score for demo purposes
  // TODO: Integrate with ML model or cloud function

  // Example: parse file (not implemented)
  // const formData = await req.formData();
  // const file = formData.get('file');

  // Simulate score
  const score = (Math.random() * 5).toFixed(2);

  return NextResponse.json({ score: Number(score) });
}
