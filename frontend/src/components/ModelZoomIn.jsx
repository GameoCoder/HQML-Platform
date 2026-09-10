import React, { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { StatusPill } from './ui.jsx'
import { MODELS } from '../data/demoData.js'

const VB_W = 900
const VB_H = 420
const IN_X = 40
const OUT_X = VB_W - 40
const MID_Y = VB_H / 2

const fmt = (ms) => `${(ms / 1000).toFixed(2)}s`

export default function ModelZoomIn({ pipeline }) {
  const { state, elapsed, allModelsReady, closeModelZoom } = pipeline
  const autoClosed = useRef(false)

  useEffect(() => {
    if (allModelsReady && !autoClosed.current) {
      autoClosed.current = true
      const t = setTimeout(() => closeModelZoom(), 1900)
      return () => clearTimeout(t)
    }
  }, [allModelsReady, closeModelZoom])

  const rows = useMemo(() => {
    const n = MODELS.length
    const gap = VB_H / (n + 1)
    return MODELS.map((m, i) => ({ ...m, y: gap * (i + 1) }))
  }, [])

  const datasetLabel = useMemo(() => {
    const ds = state.dataset || 'brain-tumor'
    if (ds === 'brain-tumor' || ds === 'mri') return 'Brain MRI'
    if (ds === 'tcga-lung-cell') return 'TCGA Lung'
    if (ds === 'breast-cancer') return 'Breast Cancer'
    return 'Clinical'
  }, [state.dataset])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-16 pt-28 sm:px-10"
    >
      <button
        onClick={closeModelZoom}
        className="absolute left-6 top-28 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/50 hover:text-blush-200 sm:left-10"
      >
        <ArrowLeft size={13} /> Back
      </button>

      <div className="mb-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/30">
          {datasetLabel} · Model visualization
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-mist sm:text-3xl">
          {allModelsReady ? 'Consensus reached' : 'Running models concurrently'}
        </h2>
      </div>

      <div className="relative w-full max-w-5xl">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="flowCrimson" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7a0e28" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ff6b85" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="flowSuccess" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0d3d2c" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6ff5c5" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {rows.map((m) => {
            const ms = state.models[m.id]
            const done = ms.status === 'ready'
            const strokeColor = done ? 'url(#flowSuccess)' : 'url(#flowCrimson)'
            const pathIn = `M ${IN_X} ${MID_Y} C ${VB_W * 0.28} ${MID_Y}, ${VB_W * 0.22} ${m.y}, ${VB_W * 0.42} ${m.y}`
            const pathOut = `M ${VB_W * 0.58} ${m.y} C ${VB_W * 0.78} ${m.y}, ${VB_W * 0.72} ${MID_Y}, ${OUT_X} ${MID_Y}`
            return (
              <g key={m.id}>
                <path d={pathIn} fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={ms.status === 'waiting' ? 0.25 : 0.85} />
                <path d={pathOut} fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={done ? 0.85 : 0.15} />
                {ms.status !== 'waiting' && (
                  <circle r="3.2" fill={done ? '#6ff5c5' : '#ff8fa3'}>
                    <animateMotion dur={done ? '0s' : '1.6s'} repeatCount="indefinite" path={pathIn} />
                  </circle>
                )}
                {done && (
                  <circle r="3.2" fill="#6ff5c5">
                    <animateMotion dur="1.6s" repeatCount="indefinite" path={pathOut} />
                  </circle>
                )}
              </g>
            )
          })}

          {/* Incoming / outgoing trunk nodes */}
          <circle cx={IN_X} cy={MID_Y} r="6" fill="#0b0a0d" stroke="#ff8fa3" strokeWidth="1.5" />
          <circle
            cx={OUT_X}
            cy={MID_Y}
            r="6"
            fill="#0b0a0d"
            stroke={allModelsReady ? '#22e096' : '#ff8fa3'}
            strokeWidth="1.5"
          />
        </svg>

        {/* Node labels laid over the SVG at each model's y position */}
        <div className="pointer-events-none absolute inset-0">
          {rows.map((m) => {
            const ms = state.models[m.id]
            const topPct = (m.y / VB_H) * 100
            return (
              <div
                key={m.id}
                className="pointer-events-auto absolute left-1/2 w-[220px] -translate-x-1/2 -translate-y-1/2 sm:w-[240px]"
                style={{ top: `${topPct}%` }}
              >
                <motion.div
                  animate={{
                    boxShadow:
                      ms.status === 'ready'
                        ? '0 0 0 1px rgba(34,224,150,0.35), 0 0 26px -4px rgba(34,224,150,0.5)'
                        : ms.status === 'processing'
                        ? '0 0 0 1px rgba(255,143,163,0.3), 0 0 26px -4px rgba(216,27,64,0.55)'
                        : '0 0 0 1px rgba(255,255,255,0.08)',
                  }}
                  className="rounded-xl px-3.5 py-2.5"
                  style={{ background: 'rgba(11,10,13,0.75)', backdropFilter: 'blur(14px)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-[13px] font-semibold text-mist">{m.short}</p>
                      <p className="font-body text-[10.5px] text-white/35">
                        {datasetLabel} · {m.subtitle}
                      </p>
                    </div>
                    <StatusPill status={ms.status} label={ms.status === 'ready' ? undefined : undefined} />
                  </div>
                  <div className="mt-1.5 font-mono text-[11px] tabular-nums text-white/40">
                    {ms.status === 'ready'
                      ? fmt(ms.latencyMs)
                      : ms.status === 'processing'
                      ? fmt(elapsed(ms.startTime))
                      : '—'}
                  </div>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/25">
        {allModelsReady ? 'Merging pipeline · returning to overview' : 'Each model reports its own state independently'}
      </p>
    </motion.div>
  )
}
