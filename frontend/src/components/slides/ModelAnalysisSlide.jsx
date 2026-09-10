import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import { DEMO_RESULT, MODEL_COLORS } from '../../data/demoData.js'

const METRIC_OPTIONS = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'f1', label: 'F1 Score' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
]

export default function ModelAnalysisSlide({ result }) {
  const [metric, setMetric] = useState('accuracy')
  const metrics = result?.metrics?.length ? result.metrics : DEMO_RESULT.metrics

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.model}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="rounded-2xl border border-white/8 p-4"
            style={{ background: 'rgba(11,10,13,0.55)', backdropFilter: 'blur(16px)' }}
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: MODEL_COLORS[m.model] }} />
              <p className="font-display text-[13px] font-semibold text-mist">{m.model}</p>
            </div>
            <dl className="mt-3 space-y-1.5 font-mono text-[11px]">
              <Row label="Accuracy" value={m.accuracy != null ? `${(m.accuracy * 100).toFixed(1)}%` : '—'} />
              <Row label="F1" value={m.f1 != null ? `${(m.f1 * 100).toFixed(1)}%` : '—'} />
              <Row label="Precision" value={m.precision != null ? `${(m.precision * 100).toFixed(1)}%` : '—'} />
              <Row label="Recall" value={m.recall != null ? `${(m.recall * 100).toFixed(1)}%` : '—'} />
              <Row
                label="Predict time"
                value={
                  m.predictionTimeMs != null
                    ? `${m.predictionTimeMs} ms`
                    : m.predictionTime != null
                    ? `${m.predictionTime}s`
                    : '—'
                }
              />
            </dl>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="flex-1 rounded-2xl border border-white/8 p-5 sm:p-6"
        style={{ background: 'rgba(11,10,13,0.55)', backdropFilter: 'blur(16px)', minHeight: 260 }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/35">Compare models</p>
          <div className="flex gap-1 rounded-full border border-white/8 p-1">
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setMetric(opt.key)}
                className="rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors"
                style={{
                  background: metric === opt.key ? 'rgba(216,27,64,0.18)' : 'transparent',
                  color: metric === opt.key ? '#ffc7d1' : 'rgba(255,255,255,0.4)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="model" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
              <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10.5, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ background: 'rgba(8,7,9,0.92)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11 }}
                formatter={(v) => `${(v * 100).toFixed(1)}%`}
              />
              <Bar dataKey={metric} radius={[6, 6, 0, 0]} isAnimationActive animationDuration={800}>
                {metrics.map((m) => (
                  <Cell key={m.model} fill={MODEL_COLORS[m.model] ?? '#d81b40'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/35">{label}</dt>
      <dd className="tabular-nums text-white/65">{value}</dd>
    </div>
  )
}
