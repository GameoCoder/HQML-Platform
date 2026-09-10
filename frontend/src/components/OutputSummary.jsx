import React, { Component } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import OverviewSlide from './slides/OverviewSlide.jsx'
import ModelAnalysisSlide from './slides/ModelAnalysisSlide.jsx'
import FullDiagnosticsSlide from './slides/FullDiagnosticsSlide.jsx'
import KeywordsSlide from './slides/KeywordsSlide.jsx'
import RagConsultationSlide from './slides/RagConsultationSlide.jsx'

class SlideErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Slide Render Error Caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-red-500/30 bg-red-950/20 text-center">
          <AlertTriangle size={24} className="text-red-400 mb-2" />
          <h3 className="font-display text-base font-semibold text-mist">Unable to render this slide</h3>
          <p className="mt-1 font-mono text-xs text-white/40 max-w-md">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1 font-mono text-xs text-white/60 hover:text-white"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const SLIDES = [
  { key: 'overview', label: 'Overview', Component: OverviewSlide },
  { key: 'analysis', label: 'Model Analysis', Component: ModelAnalysisSlide },
  { key: 'diagnostics', label: 'Full Diagnostics', Component: FullDiagnosticsSlide },
  { key: 'keywords', label: 'Keywords', Component: KeywordsSlide },
  { key: 'rag_chat', label: 'RAG Consultation', Component: RagConsultationSlide },
]

export default function OutputSummary({ pipeline }) {
  const { state, setSlide } = pipeline
  const index = Math.min(Math.max(0, state.activeSlide || 0), SLIDES.length - 1)
  const [direction, setDirection] = React.useState(1)

  const go = (i) => {
    if (i < 0 || i >= SLIDES.length) return
    setDirection(i > index ? 1 : -1)
    setSlide(i)
  }

  const Active = SLIDES[index].Component
  const result = state.result

  return (
    <div className="relative flex min-h-screen flex-col px-4 pb-10 pt-28 sm:px-8 lg:px-14">
      <div className="mx-auto mb-6 flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/30">Full analysis</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-mist sm:text-3xl">
            {SLIDES[index].label}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                onClick={() => go(i)}
                aria-label={`Go to ${s.label}`}
                className="group flex flex-col items-center gap-1.5 px-1.5 py-1 cursor-pointer"
              >
                <span
                  className="h-1.5 rounded-full transition-all duration-400"
                  style={{
                    width: i === index ? '22px' : '7px',
                    background: i === index ? 'linear-gradient(90deg,#ff8fa3,#d81b40)' : 'rgba(255,255,255,0.15)',
                    boxShadow: i === index ? '0 0 10px rgba(216,27,64,0.6)' : 'none',
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-6xl flex-1">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={SLIDES[index].key}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-[520px]"
          >
            <SlideErrorBoundary>
              <Active result={result} />
            </SlideErrorBoundary>
          </motion.div>
        </AnimatePresence>

        {/* Prev / next arrows */}
        <button
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="absolute left-[-8px] top-1/2 hidden -translate-y-1/2 -translate-x-full rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-white/40 transition-colors hover:text-blush-200 disabled:opacity-0 lg:flex cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => go(index + 1)}
          disabled={index === SLIDES.length - 1}
          className="absolute right-[-8px] top-1/2 hidden -translate-y-1/2 translate-x-full rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-white/40 transition-colors hover:text-blush-200 disabled:opacity-0 lg:flex cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Mobile prev/next */}
      <div className="mx-auto mt-6 flex w-full max-w-6xl items-center justify-between lg:hidden">
        <button
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 disabled:opacity-20 cursor-pointer"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          onClick={() => go(index + 1)}
          disabled={index === SLIDES.length - 1}
          className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 disabled:opacity-20 cursor-pointer"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
