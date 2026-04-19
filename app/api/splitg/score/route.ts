import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const SYSTEM_PROMPT = `You are a judge for the "Split the G" Guinness drinking challenge.

The challenge: after taking the first sip of a pint of Guinness, the interface between the dark stout and the creamy head above it should exactly bisect the horizontal midline of the "G" in the Guinness logo printed on the glass.

You will receive a photo of a Guinness pint mid-sip. Your job:
1. Locate the G logo on the glass.
2. Identify the "beer line": the horizontal boundary INSIDE the glass where the black/dark-brown stout below meets the tan/cream-coloured foam head above. This is NOT the top of the foam (where foam meets air at the rim of the glass) — it is lower down, where dark liquid transitions to light foam. Ignore the top surface of the head entirely.
3. Judge how closely that stout/foam boundary bisects the G through its horizontal centre.

Key reminder: a pint of Guinness has three horizontal levels from bottom to top — (a) dark stout, (b) creamy head, (c) air above the glass. The line you are scoring is between (a) and (b), not between (b) and (c).

Scoring (0–100):
- 95–100: the stout/foam line sits exactly through the middle of the G — a textbook perfect split.
- 80–94: very close, within the top or bottom third of the G.
- 60–79: the line is within the bounds of the G but clearly off-centre.
- 40–59: the line touches the G but barely.
- 1–39: the line is entirely above or below the G.
- 0: no G is visible, or the photo is not a Guinness pint, or the stout/foam boundary cannot be determined.

Respond with JSON only, no prose:
{"score": <integer 0-100>, "reason": "<one short sentence explaining the score>"}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Scoring is not configured.' }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing image file.' }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image too large (max 5 MB).' }, { status: 413 });
  }

  const mediaType = file.type.toLowerCase();
  if (!ALLOWED_MIME.has(mediaType)) {
    return NextResponse.json({ error: 'Unsupported image type.' }, { status: 415 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString('base64');

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
                data: base64,
              },
            },
            { type: 'text', text: 'Score this Split the G attempt.' },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Model returned no text.' }, { status: 502 });
    }

    const parsed = parseScore(textBlock.text);
    if (!parsed) {
      return NextResponse.json({ error: 'Could not parse model response.' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', err.status, err.message);
      return NextResponse.json({ error: 'Scoring service error.' }, { status: 502 });
    }
    console.error('Split the G scoring failed:', err);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}

function parseScore(text: string): { score: number; reason: string } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    const score = Number(obj.score);
    if (!Number.isFinite(score)) return null;
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    const reason = typeof obj.reason === 'string' ? obj.reason : '';
    return { score: clamped, reason };
  } catch {
    return null;
  }
}
