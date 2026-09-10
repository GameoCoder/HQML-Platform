import React from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { LEARNING_CURVE, MODEL_COLORS, DEMO_RESULT } from '../../data/demoData.js'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg border border-white/10 px-3 py-2 font-mono text-[11px]"
      style={{ background: 'rgba(8,7,9,0.92)' }}
    >
      <p className="mb-1 text-white/40">t = {label}s</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey}: {(p.value * 100).toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

export default function OverviewSlide({ result }) {
  const data = result ?? DEMO_RESULT
  const predictionsList = Array.isArray(data.predictions) && data.predictions.length > 0 ? data.predictions : DEMO_RESULT.predictions

  // Merge all series onto a shared timeline for the multi-line chart.
  const merged = React.useMemo(() => {
    const points = new Map()
    Object.entries(LEARNING_CURVE).forEach(([model, series]) => {
      series.forEach(({ t, accuracy }) => {
        if (!points.has(t)) points.set(t, { t })
        points.get(t)[model] = accuracy
      })
    })
    return Array.from(points.values()).sort((a, b) => a.t - b.t)
  }, [])

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left half: learning time vs accuracy */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-col rounded-2xl border border-white/8 p-5 sm:p-6"
        style={{ background: 'rgba(11,10,13,0.55)', backdropFilter: 'blur(16px)' }}
      >
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/35">Learning time vs accuracy</p>
        <div className="mt-3 flex-1" style={{ minHeight: 260 }}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={merged} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10.5, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
                label={{ value: 'seconds', position: 'insideBottomRight', offset: -4, fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
              />
              <YAxis
                domain={[0.3, 1]}
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10.5, fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} />
              {Object.keys(LEARNING_CURVE).map((model) => (
                <Line
                  key={model}
                  type="monotone"
                  dataKey={model}
                  stroke={MODEL_COLORS[model]}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: MODEL_COLORS[model], strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                  isAnimationActive
                  animationDuration={1400}
                  style={{ filter: `drop-shadow(0 0 6px ${MODEL_COLORS[model]}80)` }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {Object.keys(LEARNING_CURVE).map((model) => (
            <span key={model} className="flex items-center gap-1.5 font-mono text-[10.5px] text-white/40">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: MODEL_COLORS[model] }} />
              {model}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Right half: diagnosis (top) + predictions (bottom) */}
      <div className="flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-1 flex-col justify-center rounded-2xl border p-6 sm:p-8"
          style={{
            borderColor: 'rgba(255,143,163,0.2)',
            background: 'linear-gradient(160deg, rgba(216,27,64,0.12), rgba(11,10,13,0.6))',
            backdropFilter: 'blur(16px)',
          }}
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-blush-300/70">Diagnosis</p>
          <p className="mt-3 font-display text-2xl font-semibold leading-snug text-mist capitalize sm:text-3xl">
            {data.headline || 'Consensus Evaluation'}
          </p>
          <p className="mt-3 font-mono text-[12px] text-white/40">
            Confidence:{' '}
            <span className="text-success">
              {data.confidence != null ? `${Math.round(data.confidence * 100)}%` : '—'}
            </span>
          </p>
          {data.used_sample_data && (
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/30">
              Ran on bundled sample patient data ({data.sample_label?.replace('_reference', '') ?? 'reference case'})
            </p>
          )}

          {/* Quantum Circuit & Observable Telemetry */}
          {data.quantumDiagnosis && (
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-teal-500/30 bg-teal-950/40 px-2.5 py-0.5 font-mono text-[10px] text-teal-300">
                {data.quantumDiagnosis.qubits || data.quantumDiagnosis.qubits_used || 14}-Qubit VQC
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] text-white/50">
                Circuit Depth: {data.quantumDiagnosis.circuit_depth || 4}
              </span>
              {Array.isArray(data.quantumDiagnosis.quantum_expectation_values) && (
                <span className="rounded-full border border-purple-500/30 bg-purple-950/40 px-2.5 py-0.5 font-mono text-[10px] text-purple-300">
                  Expectation Z: [{data.quantumDiagnosis.quantum_expectation_values.map(v => typeof v === 'number' ? (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) : String(v)).join(', ')}]
                </span>
              )}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex-1 rounded-2xl border border-white/8 p-5 sm:p-6"
          style={{ background: 'rgba(11,10,13,0.55)', backdropFilter: 'blur(16px)' }}
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/35">
            Prediction by RF, SVM, NN, QML
          </p>
          <div className="mt-3 space-y-2.5">
            {predictionsList.map((p) => (
              <div key={p.model} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: MODEL_COLORS[p.model] ?? '#d81b40' }}
                  />
                  <span className="font-mono text-[12px] text-white/70">{p.model}</span>
                </div>
                <span className="font-body text-[12.5px] capitalize text-white/50">{p.label}</span>
                <span className="font-mono text-[11px] tabular-nums text-white/35">
                  {p.confidence != null ? `${Math.round(p.confidence * 100)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
