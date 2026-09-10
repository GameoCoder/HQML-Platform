import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const PALETTES = {
  crimson: {
    trail: 'linear-gradient(90deg, rgba(216,27,64,0) 0%, rgba(216,27,64,0.85) 55%, rgba(255,180,195,0.95) 100%)',
    ball: 'radial-gradient(circle, #fff2f4 0%, #ff6b85 35%, #d81b40 65%, rgba(216,27,64,0) 75%)',
    glow: 'rgba(240,53,90,0.9)',
    idle: 'rgba(255,255,255,0.08)',
  },
  success: {
    trail: 'linear-gradient(90deg, rgba(34,224,150,0) 0%, rgba(34,224,150,0.85) 55%, rgba(200,255,235,0.95) 100%)',
    ball: 'radial-gradient(circle, #eafff6 0%, #6ff5c5 35%, #22e096 65%, rgba(34,224,150,0) 75%)',
    glow: 'rgba(34,224,150,0.9)',
    idle: 'rgba(255,255,255,0.08)',
  },
}

/**
 * A thin horizontal line that is nearly invisible at rest. When `active`,
 * a bright ball of energy travels left-to-right, leaving a glowing trail
 * behind it — the recurring visual motif that ties every phase together.
 */
export default function EnergyLine({ active, palette = 'crimson', duration = 1.2, onComplete, className = '' }) {
  const colors = PALETTES[palette]

  return (
    <div className={`relative h-[2px] w-full overflow-visible ${className}`}>
      <div className="absolute inset-0 rounded-full" style={{ background: colors.idle }} />
      <AnimatePresence>
        {active && (
          <motion.div
            key="trail"
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: colors.trail }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            exit={{ opacity: 0 }}
            transition={{ duration, ease: [0.3, 0, 0.2, 1] }}
            onAnimationComplete={onComplete}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && (
          <motion.div
            key="ball"
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full"
            style={{ background: colors.ball, boxShadow: `0 0 18px 4px ${colors.glow}, 0 0 40px 10px ${colors.glow}` }}
            initial={{ left: '0%', opacity: 1 }}
            animate={{ left: '100%' }}
            exit={{ opacity: 0 }}
            transition={{ duration, ease: [0.3, 0, 0.2, 1] }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
