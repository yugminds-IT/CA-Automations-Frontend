import React from "react"

/**
 * LekvyaLoader – animated SVG brand loader.
 * Use for full-page and full-section loading states.
 * For small inline/button spinners keep using Loader2 from lucide-react.
 */
export function LekvyaLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width="240"
        height="75"
        viewBox="0 0 480 150"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Loading"
        role="status"
      >
        <defs>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&display=swap');
            .lk-wave-group { animation: lkFillRise 2.8s cubic-bezier(0.4,0,0.2,1) infinite; }
            .lk-wave-a     { animation: lkWA 2s ease-in-out infinite; }
            .lk-wave-b     { animation: lkWB 2s ease-in-out infinite; }
            @keyframes lkFillRise {
              0%   { transform: translateY(20px); }
              60%  { transform: translateY(-8px); }
              100% { transform: translateY(20px); }
            }
            @keyframes lkWA {
              0%,100% { transform: translateX(0); }
              50%     { transform: translateX(-60px); }
            }
            @keyframes lkWB {
              0%,100% { transform: translateX(0); }
              50%     { transform: translateX(60px); }
            }
          `}</style>
          <clipPath id="lkTextMask">
            <text
              x="240"
              y="128"
              textAnchor="middle"
              fontFamily="'Baloo 2', cursive"
              fontSize="148"
              fontWeight="800"
              letterSpacing="-3"
            >
              Lekvya
            </text>
          </clipPath>
        </defs>

        {/* Ghost / outline text (light orange base) */}
        <text
          x="240"
          y="128"
          textAnchor="middle"
          fontFamily="'Baloo 2', cursive"
          fontSize="148"
          fontWeight="800"
          letterSpacing="-3"
          fill="#FFD9B3"
        >
          Lekvya
        </text>

        {/* Animated wave fill clipped to text shape */}
        <g clipPath="url(#lkTextMask)">
          <g className="lk-wave-group">
            <g className="lk-wave-b">
              <path
                d="M-100,90 Q-40,68 20,90 Q80,112 140,90 Q200,68 260,90 Q320,112 380,90 Q440,68 500,90 Q560,112 620,90 L620,200 L-100,200 Z"
                fill="#FF9A3C"
                opacity="0.7"
              />
            </g>
            <g className="lk-wave-a">
              <path
                d="M-100,100 Q-40,78 20,100 Q80,122 140,100 Q200,78 260,100 Q320,122 380,100 Q440,78 500,100 Q560,122 620,100 L620,200 L-100,200 Z"
                fill="#FF7A00"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
