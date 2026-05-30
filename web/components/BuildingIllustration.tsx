// Monochrome wireframe illustration of a building under construction with
// a crane — matches the screenshot aesthetic. Pure inline SVG so it
// renders crisp at any zoom and stays themable.
export function BuildingIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 360"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g
        stroke="#3f3f46"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Crane vertical mast */}
        <line x1="120" y1="40" x2="120" y2="290" />
        <line x1="128" y1="40" x2="128" y2="290" />
        {/* Crane horizontal jib */}
        <line x1="44" y1="60" x2="300" y2="60" />
        <line x1="44" y1="72" x2="300" y2="72" />
        {/* Jib supports / trusses */}
        <line x1="124" y1="40" x2="60" y2="60" />
        <line x1="124" y1="40" x2="290" y2="60" />
        <line x1="80" y1="60" x2="100" y2="72" />
        <line x1="100" y1="60" x2="120" y2="72" />
        <line x1="150" y1="60" x2="170" y2="72" />
        <line x1="180" y1="60" x2="200" y2="72" />
        <line x1="210" y1="60" x2="230" y2="72" />
        <line x1="240" y1="60" x2="260" y2="72" />
        <line x1="270" y1="60" x2="290" y2="72" />
        {/* Crane counterweight */}
        <rect x="42" y="48" width="22" height="18" />
        {/* Crane hook line */}
        <line x1="225" y1="72" x2="225" y2="150" />
        <line x1="219" y1="150" x2="231" y2="150" />
        <line x1="219" y1="150" x2="225" y2="160" />
        <line x1="231" y1="150" x2="225" y2="160" />

        {/* Building base outline */}
        <line x1="200" y1="290" x2="500" y2="290" />
        {/* Building floors — under construction (rightmost top floors open) */}
        {/* Floor lines */}
        {[290, 260, 230, 200, 170, 140, 110].map((y) => (
          <line key={y} x1="200" y1={y} x2="500" y2={y} />
        ))}
        {/* Column lines */}
        {[200, 250, 300, 350, 400, 450, 500].map((x) => (
          <line key={x} x1={x} y1="290" x2={x} y2="110" />
        ))}
        {/* Top floor under construction — partial */}
        <line x1="200" y1="80" x2="380" y2="80" />
        <line x1="200" y1="80" x2="200" y2="110" />
        <line x1="250" y1="80" x2="250" y2="110" />
        <line x1="300" y1="80" x2="300" y2="110" />
        <line x1="350" y1="80" x2="350" y2="110" />
        <line x1="380" y1="80" x2="380" y2="110" />

        {/* Diagonal bracing on a few bays */}
        <line x1="200" y1="290" x2="250" y2="260" />
        <line x1="300" y1="290" x2="350" y2="260" />
        <line x1="400" y1="290" x2="450" y2="260" />
        <line x1="250" y1="230" x2="300" y2="200" />
        <line x1="350" y1="200" x2="400" y2="170" />
        <line x1="450" y1="170" x2="500" y2="140" />

        {/* Window grid pattern on lower floors */}
        {[260, 230].map((y) =>
          [225, 275, 325, 375, 425, 475].map((x) => (
            <rect key={`w-${y}-${x}`} x={x - 8} y={y + 6} width="16" height="14" />
          )),
        )}

        {/* Ground hatch indicator */}
        <line x1="200" y1="290" x2="190" y2="298" />
        <line x1="240" y1="290" x2="230" y2="298" />
        <line x1="280" y1="290" x2="270" y2="298" />
        <line x1="320" y1="290" x2="310" y2="298" />
        <line x1="360" y1="290" x2="350" y2="298" />
        <line x1="400" y1="290" x2="390" y2="298" />
        <line x1="440" y1="290" x2="430" y2="298" />
        <line x1="480" y1="290" x2="470" y2="298" />
      </g>

      {/* Dotted construction-site soil pattern */}
      <g fill="#a1a1aa">
        {Array.from({ length: 12 }).map((_, i) =>
          Array.from({ length: 4 }).map((_, j) => (
            <circle
              key={`${i}-${j}`}
              cx={210 + i * 24}
              cy={310 + j * 10}
              r="0.9"
            />
          )),
        )}
      </g>
    </svg>
  );
}
