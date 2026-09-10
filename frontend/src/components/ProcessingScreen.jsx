import React from 'react'
import { motion } from 'framer-motion'
import { Server, Cpu, FileOutput, ArrowRight, ChevronRight } from 'lucide-react'
import { GlassPanel, StatusPill } from './ui.jsx'
import EnergyLine from './EnergyLine.jsx'
import { MODELS } from '../data/demoData.js'

const fmt = (ms) => `${(ms / 1000).toFixed(2)}s`

function Connector({ leftReady, rightState, elapsedMs }) {
  const active = leftReady
  const palette = rightState === 'ready' ? 'success' : 'crimson'
  return (
    <div className="mx-1 flex w-10 flex-shrink-0 items-center sm:w-16">
      <EnergyLine active={active} palette={palette} duration={0.9} />
    </div>
  )
}

export default function ProcessingScreen({ pipeline }) {
  const { state, elapsed, allModelsReady, openModelZoom, goToOutput } = pipeline
  const backendElapsed = elapsed(state.backend.startTime)
  const backendDisplay = state.backend.status === 'ready' ? fmt(state.backend.latencyMs) : fmt(backendElapsed)

  const readyModelCount = MODELS.filter((m) => state.models[m.id].status === 'ready').length

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-20 pt-32 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10 text-center"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/30">Inference pipeline</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-mist sm:text-3xl">
          Reading the signal, one stage at a time
        </h2>
      </motion.div>

      <div className="flex w-full max-w-5xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-0">
        {/* Backend block */}
        <BlockShell className="sm:flex-1">
          <GlassPanel state={state.backend.status} className="h-full p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server size={16} className="text-blush-300" />
                <span className="font-display text-[15px] font-semibold text-mist">Backend</span>
              </div>
              <StatusPill status={state.backend.status} />
            </div>
            <div className="mt-6">
              <div className="font-mono text-[26px] font-medium tabular-nums text-mist">
                {state.backend.status === 'waiting' ? '—' : backendDisplay}
              </div>
              <p className="mt-1 text-[12px] text-white/35">
                {state.backend.status === 'ready' ? 'Connected & responded' : 'Establishing connection...'}
              </p>
            </div>
          </GlassPanel>
        </BlockShell>

        <div className="hidden sm:block">
          <Connector leftReady={state.backend.status === 'ready'} rightState={state.output.status} />
        </div>

        {/* Models block */}
        <BlockShell className="sm:flex-1">
          <button onClick={openModelZoom} className="block w-full text-left">
            <GlassPanel
              state={state.backend.status === 'ready' ? (allModelsReady ? 'ready' : 'processing') : 'waiting'}
              className="h-full cursor-zoom-in p-5 transition-transform hover:scale-[1.015] sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Cpu size={16} className="text-blush-300" />
                  <span className="font-display text-[15px] font-semibold text-mist">Models</span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                  Inspect <ChevronRight size={12} />
                </span>
              </div>

              <div className="mt-5 space-y-2.5">
                {MODELS.map((m) => {
                  const ms = state.models[m.id]
                  return (
                    <div key={m.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusDot status={ms.status} />
                        <span className="font-mono text-[12px] text-white/70">{m.short}</span>
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-white/30">
                        {ms.status === 'ready'
                          ? fmt(ms.latencyMs)
                          : ms.status === 'processing'
                          ? fmt(elapsed(ms.startTime))
                          : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">
                {readyModelCount}/{MODELS.length} ready
              </p>
            </GlassPanel>
          </button>
        </BlockShell>

        <div className="hidden sm:block">
          <Connector leftReady={allModelsReady} rightState={state.output.status} />
        </div>

        {/* Output block */}
        <BlockShell className="sm:flex-1">
          <GlassPanel state={state.output.status} className="h-full p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileOutput size={16} className="text-blush-300" />
                <span className="font-display text-[15px] font-semibold text-mist">Output</span>
              </div>
              <StatusPill status={state.output.status} />
            </div>

            <div className="mt-6 min-h-[52px]">
              {state.output.status === 'ready' && state.result ? (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-body text-[13.5px] leading-snug text-white/75"
                >
                  {state.result.diagnosis}
                </motion.p>
              ) : (
                <p className="font-body text-[13px] text-white/30">
                  {state.output.status === 'processing' ? 'Synthesizing result...' : 'Awaiting model output'}
                </p>
              )}
            </div>

            {state.output.status === 'ready' && (
              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={(e) => {
                  e.stopPropagation()
                  goToOutput()
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-crimson-400/40 bg-crimson-900/35 px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-blush-200 shadow-[0_0_18px_rgba(216,27,64,0.4)] transition-all hover:bg-crimson-800/50 hover:border-crimson-300 hover:text-white cursor-pointer"
              >
                <span>View full analysis</span>
                <ArrowRight size={13} className="text-blush-300" />
              </motion.button>
            )}
          </GlassPanel>
        </BlockShell>
      </div>
    </div>
  )
}

function BlockShell({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function StatusDot({ status }) {
  const color =
    status === 'ready' ? 'bg-success shadow-[0_0_8px_2px_rgba(34,224,150,0.6)]' :
    status === 'processing' ? 'bg-crimson-400 shadow-[0_0_8px_2px_rgba(240,53,90,0.6)] animate-pulse-glow' :
    'bg-white/20'
  return <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
}
