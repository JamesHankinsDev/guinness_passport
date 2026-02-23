export function HarpLogo({ className = 'w-10 h-12' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Base pillar */}
      <rect x="6" y="64" width="8" height="6" rx="1" fill="#c9a84c" />
      {/* Neck curve */}
      <path
        d="M10 68 C10 20, 52 8, 52 8"
        stroke="#c9a84c"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Column */}
      <line x1="10" y1="68" x2="10" y2="10" stroke="#c9a84c" strokeWidth="4" strokeLinecap="round" />
      {/* Crown */}
      <path d="M10 10 C10 4, 52 3, 52 8" stroke="#c9a84c" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Strings */}
      {[14, 20, 26, 32, 38, 44, 49, 52].map((x, i) => {
        const topY = 10 + i * 6.5;
        const botY = 66;
        return (
          <line
            key={i}
            x1={x}
            y1={topY > botY ? botY : topY}
            x2="10"
            y2={botY - i * 2}
            stroke="#c9a84c"
            strokeWidth="1.2"
            opacity="0.85"
          />
        );
      })}
    </svg>
  );
}
