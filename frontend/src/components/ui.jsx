import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, Circle } from 'lucide-react'

export function GlowBadge({ children }) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-blush-200"
      style={{
        borderColor: 'rgba(255,143,163,0.25)',
        background: 'rgba(216,27,64,0.08)',
      }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-crimson-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-crimson-400" />
      </span>
      {children}
    </div>
  )
}

const STATUS_CONFIG = {
  waiting: { label: 'Waiting', color: 'text-white/35', dot: 'bg-white/25' },
  processing: { label: 'Processing', color: 'text-blush-300', dot: 'bg-crimson-400' },
  ready: { label: 'Ready', color: 'text-success', dot: 'bg-success' },
}

export function StatusPill({ status, label }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] ${cfg.color}`}>
      {status === 'processing' ? (
        <Loader2 size={11} className="animate-spin" />
      ) : status === 'ready' ? (
        <CheckCircle2 size={11} />
      ) : (
        <Circle size={11} />
      )}
      {label ?? cfg.label}
    </span>
  )
}

/**
 * A dark glass surface with a fine border. `state` optionally drives an
 * animated ring: waiting (quiet), processing (pulsing crimson scan),
 * ready (steady green glow).
 */
export function GlassPanel({ children, className = '', state = 'waiting', style = {} }) {
  const ring =
    state === 'ready'
      ? '0 0 0 1px rgba(34,224,150,0.35), 0 0 34px -6px rgba(34,224,150,0.45)'
      : state === 'processing'
      ? '0 0 0 1px rgba(255,143,163,0.28), 0 0 34px -6px rgba(216,27,64,0.5)'
      : '0 0 0 1px rgba(255,255,255,0.06)'

  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-2xl border ${className}`}
      style={{
        borderColor: state === 'ready' ? 'rgba(34,224,150,0.3)' : state === 'processing' ? 'rgba(255,143,163,0.22)' : 'rgba(255,255,255,0.08)',
        background: 'rgba(11,10,13,0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: ring,
        transition: 'box-shadow 0.6s ease, border-color 0.6s ease',
        ...style,
      }}
    >
      {state === 'processing' && (
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'linear-gradient(115deg, transparent 20%, rgba(255,143,163,0.12) 40%, rgba(216,27,64,0.18) 50%, rgba(255,143,163,0.12) 60%, transparent 80%)',
            backgroundSize: '250% 250%',
            animation: 'scan-border 2.6s linear infinite',
          }}
        />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  )
}
