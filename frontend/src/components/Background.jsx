import React, { useMemo } from 'react'

// Deterministic pseudo-random particle field so it doesn't reshuffle on
// every re-render.
function useParticles(count) {
  return useMemo(() => {
    let seed = 42
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand() * 100,
      y: rand() * 100,
      size: rand() * 1.6 + 0.4,
      delay: rand() * 4,
      duration: rand() * 3 + 3,
    }))
  }, [count])
}

export default function Background() {
  const particles = useParticles(70)

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-void">
      {/* Fine structural grid, barely there */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 40%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 40%, transparent 90%)',
        }}
      />

      {/* Atmospheric crimson glow, upper field */}
      <div
        className="absolute -top-1/4 left-1/2 h-[70vh] w-[90vw] -translate-x-1/2 rounded-full animate-drift"
        style={{
          background:
            'radial-gradient(closest-side, rgba(216,27,64,0.14), rgba(216,27,64,0.05) 45%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Secondary soft pink glow, lower-right, slow independent drift */}
      <div
        className="absolute bottom-[-20%] right-[-10%] h-[60vh] w-[60vw] rounded-full animate-drift"
        style={{
          background: 'radial-gradient(closest-side, rgba(255,143,163,0.08), transparent 70%)',
          filter: 'blur(60px)',
          animationDirection: 'alternate-reverse',
          animationDuration: '40s',
        }}
      />

      {/* Star-like particle field */}
      <div className="absolute inset-0">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              opacity: 0.4,
            }}
          />
        ))}
      </div>

      {/* Fine grain noise on top of everything to kill flatness */}
      <div className="noise-layer" />
    </div>
  )
}
