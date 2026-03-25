'use client';

import { useRef, useCallback } from 'react';

interface SplitTheGSliderProps {
  value: number;
  onChange: (score: number) => void;
}

// SVG coordinate constants
const W = 160;
const H = 280;
const RIM_Y = 30;
const BASE_Y = 260;
const HEAD_Y = 70; // where cream head begins
const RIM_W_HALF = 58; // half-width at rim
const BASE_W_HALF = 44; // half-width at base
const CX = W / 2;

// The G sits at ~58% down the stout body (from HEAD_Y to BASE_Y)
const G_Y = HEAD_Y + (BASE_Y - HEAD_Y) * 0.42;

// Draggable range: user sip line can go from just below head to near base
const DRAG_MIN = HEAD_Y + 8;
const DRAG_MAX = BASE_Y - 8;
const MAX_DIST = DRAG_MAX - DRAG_MIN;

function glassXAtY(y: number): number {
  const t = (y - RIM_Y) / (BASE_Y - RIM_Y);
  return CX + RIM_W_HALF - t * (RIM_W_HALF - BASE_W_HALF);
}

function scoreFromY(y: number): number {
  const dist = Math.abs(y - G_Y);
  return Math.max(0, Math.round(100 - (dist / (MAX_DIST / 2)) * 100));
}

function yFromScore(score: number): number {
  // We place the line at G_Y when score is 100.
  // For simplicity, default to an offset below the G.
  const dist = ((100 - score) / 100) * (MAX_DIST / 2);
  return Math.min(DRAG_MAX, Math.max(DRAG_MIN, G_Y + dist));
}

function scoreLabel(score: number): string {
  if (score >= 95) return 'PERFECT SPLIT';
  if (score >= 80) return 'EXCELLENT';
  if (score >= 60) return 'NICE TRY';
  if (score >= 40) return 'CLOSE ENOUGH';
  return 'KEEP PRACTISING';
}

export function SplitTheGSlider({ value, onChange }: SplitTheGSliderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const lineY = yFromScore(value);
  const lineLeft = CX - glassXAtY(lineY) + CX + 6;
  const lineRight = glassXAtY(lineY) - 6;

  const updateFromClientY = useCallback(
    (clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const svgY = ((clientY - rect.top) / rect.height) * H;
      const clamped = Math.min(DRAG_MAX, Math.max(DRAG_MIN, svgY));
      onChange(scoreFromY(clamped));
    },
    [onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      (e.target as Element).setPointerCapture(e.pointerId);
      updateFromClientY(e.clientY);
    },
    [updateFromClientY]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      updateFromClientY(e.clientY);
    },
    [updateFromClientY]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Glass path: slight trapezoid wider at top
  const glassPath = `
    M ${CX - RIM_W_HALF} ${RIM_Y}
    L ${CX - BASE_W_HALF} ${BASE_Y}
    Q ${CX - BASE_W_HALF} ${BASE_Y + 12} ${CX} ${BASE_Y + 12}
    Q ${CX + BASE_W_HALF} ${BASE_Y + 12} ${CX + BASE_W_HALF} ${BASE_Y}
    L ${CX + RIM_W_HALF} ${RIM_Y}
    Z
  `;

  // Stout fill: from just below rim to base
  const stoutPath = `
    M ${CX - glassXAtY(HEAD_Y) + CX} ${HEAD_Y}
    L ${CX - BASE_W_HALF} ${BASE_Y}
    Q ${CX - BASE_W_HALF} ${BASE_Y + 12} ${CX} ${BASE_Y + 12}
    Q ${CX + BASE_W_HALF} ${BASE_Y + 12} ${CX + BASE_W_HALF} ${BASE_Y}
    L ${glassXAtY(HEAD_Y)} ${HEAD_Y}
    Z
  `;

  // Head fill: from rim to where stout starts
  const headPath = `
    M ${CX - RIM_W_HALF} ${RIM_Y}
    L ${CX - glassXAtY(HEAD_Y) + CX} ${HEAD_Y}
    L ${glassXAtY(HEAD_Y)} ${HEAD_Y}
    L ${CX + RIM_W_HALF} ${RIM_Y}
    Z
  `;

  // Clip path for keeping fills inside the glass
  const clipId = 'glass-clip';

  // G marker x positions
  const gLeft = CX - glassXAtY(G_Y) + CX + 12;
  const gRight = glassXAtY(G_Y) - 12;

  return (
    <div className="flex flex-col items-center select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H + 20}`}
        width={W}
        height={H + 20}
        className="cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={glassPath} />
          </clipPath>
          <linearGradient id="stout-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1a08" />
            <stop offset="100%" stopColor="#0d0500" />
          </linearGradient>
          <linearGradient id="head-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5edd5" />
            <stop offset="100%" stopColor="#e8d9b0" />
          </linearGradient>
        </defs>

        {/* Glass outline */}
        <path
          d={glassPath}
          fill="none"
          stroke="rgba(245,240,232,0.15)"
          strokeWidth={2}
        />

        {/* Stout fill */}
        <path d={stoutPath} fill="url(#stout-grad)" clipPath={`url(#${clipId})`} />

        {/* Cream head */}
        <path d={headPath} fill="url(#head-grad)" clipPath={`url(#${clipId})`} />

        {/* Glass gloss highlight */}
        <rect
          x={CX - RIM_W_HALF + 8}
          y={RIM_Y}
          width={12}
          height={BASE_Y - RIM_Y}
          rx={6}
          fill="rgba(255,255,255,0.04)"
          clipPath={`url(#${clipId})`}
        />

        {/* G marker - dashed line */}
        <line
          x1={gLeft}
          y1={G_Y}
          x2={gRight}
          y2={G_Y}
          stroke="rgba(201,168,76,0.3)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {/* G label */}
        <text
          x={gRight + 6}
          y={G_Y + 4}
          fill="rgba(201,168,76,0.4)"
          fontSize={11}
          fontFamily="serif"
          fontWeight="bold"
        >
          G
        </text>

        {/* Draggable sip line */}
        <line
          x1={lineLeft}
          y1={lineY}
          x2={lineRight}
          y2={lineY}
          stroke="#c9a84c"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Left handle */}
        <circle
          cx={lineLeft}
          cy={lineY}
          r={5}
          fill="#c9a84c"
          stroke="#0a0a0a"
          strokeWidth={1.5}
        />
        {/* Right handle */}
        <circle
          cx={lineRight}
          cy={lineY}
          r={5}
          fill="#c9a84c"
          stroke="#0a0a0a"
          strokeWidth={1.5}
        />

        {/* Score indicator on the right side */}
        <text
          x={CX + RIM_W_HALF + 8}
          y={lineY + 4}
          fill="#c9a84c"
          fontSize={14}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {value}
        </text>
      </svg>

      {/* Score display */}
      <div className="text-center mt-3">
        <p className="font-display text-3xl text-gold">{value}</p>
        <p className="font-mono text-cream/40 text-[10px] tracking-widest mt-1">
          {scoreLabel(value)}
        </p>
      </div>
    </div>
  );
}
