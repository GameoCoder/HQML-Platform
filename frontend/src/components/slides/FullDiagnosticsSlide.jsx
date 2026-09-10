import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, FileText, Dna, Activity } from 'lucide-react'
import { DEMO_RESULT } from '../../data/demoData.js'

export default function FullDiagnosticsSlide({ result }) {
  const data = result ?? DEMO_RESULT
  const fullDiagnosis = data.fullDiagnosis?.length ? data.fullDiagnosis : ['No detailed narrative was returned for this run.']
  const explainability = data.explainability || {}
  const biomarkers = explainability.top_biomarkers || []
  const components = explainability.top_components || []

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="rounded-2xl border border-white/8 p-6 sm:p-8"
        style={{ background: 'rgba(11,10,13,0.55)', backdropFilter: 'blur(16px)' }}
      >
        <div className="mb-5 flex items-center gap-2.5">
          <FileText size={16} className="text-blush-300" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/35">Full diagnostic report</p>
        </div>
        <ol className="space-y-4">
          {fullDiagnosis.map((line, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
              className="flex gap-3 border-b border-white/5 pb-4 last:border-0"
            >
              <span className="mt-0.5 font-mono text-[11px] text-crimson-400">{String(i + 1).padStart(2, '0')}</span>
              <p className="font-body text-[13.5px] leading-relaxed text-white/70">{line}</p>
            </motion.li>
          ))}
        </ol>
      </motion.div>

      <div className="flex flex-col gap-5">
        {/* Agentic RAG Summary */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-col rounded-2xl border p-5 sm:p-6"
          style={{
            borderColor: 'rgba(255,143,163,0.2)',
            background: 'linear-gradient(160deg, rgba(216,27,64,0.1), rgba(11,10,13,0.6))',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="mb-3 flex items-center gap-2.5">
            <Sparkles size={16} className="text-blush-300" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-blush-300/70">
              Agentic RAG Clinical Summary
            </p>
          </div>
          <p className="font-body text-[13.5px] leading-relaxed text-white/80">{data.ragSummary}</p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
            LLM Engine: {data.clinicalSummary?.llm_engine || 'Ollama (qwen2.5:1.5b)'} · Dynamic Retrieval Augmented
          </p>
        </motion.div>

        {/* Explainability / Biomarker Panel */}
        {(biomarkers.length > 0 || components.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="rounded-2xl border border-white/8 p-5 sm:p-6"
            style={{ background: 'rgba(11,10,13,0.55)', backdropFilter: 'blur(16px)' }}
          >
            <div className="mb-3 flex items-center gap-2">
              {biomarkers.length > 0 ? (
                <Dna size={15} className="text-purple-300" />
              ) : (
                <Activity size={15} className="text-teal-300" />
              )}
              <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/40">
                {biomarkers.length > 0
                  ? 'PCA Genomic Biomarker Attribution'
                  : 'ResNet-PCA Spatial Latent Components'}
              </p>
            </div>

            {biomarkers.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                {biomarkers.map((b) => (
                  <div
                    key={b.gene_name}
                    className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-950/25 px-3 py-2"
                  >
                    <span className="font-semibold text-purple-200">{b.gene_name}</span>
                    <span className="text-white/40">
                      {typeof b.loading_weight === 'number'
                        ? (b.loading_weight > 0 ? `+${b.loading_weight.toFixed(3)}` : b.loading_weight.toFixed(3))
                        : String(b.loading_weight || '')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                {components.map((c) => (
                  <div
                    key={c.component_id}
                    className="flex items-center justify-between rounded-xl border border-teal-500/20 bg-teal-950/25 px-3 py-2"
                  >
                    <span className="font-semibold text-teal-200">{c.component_id}</span>
                    <span className="text-white/40">
                      norm: {typeof c.normalized_value === 'number' ? c.normalized_value.toFixed(2) : String(c.normalized_value || '')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
