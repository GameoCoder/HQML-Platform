import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus } from 'lucide-react'
import { DEMO_RESULT } from '../../data/demoData.js'

export default function KeywordsSlide({ result }) {
  const data = result ?? DEMO_RESULT
  const keywords = data.keywords?.length ? data.keywords : DEMO_RESULT.keywords
  const [openTerm, setOpenTerm] = useState(keywords[0]?.term ?? null)

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-center gap-2.5">
        <BookOpen size={16} className="text-blush-300" />
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/35">
          Medical terms in this report
        </p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {keywords.map((k, i) => {
          const open = openTerm === k.term
          return (
            <motion.button
              key={k.term}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              onClick={() => setOpenTerm(open ? null : k.term)}
              className="rounded-2xl border p-4 text-left transition-colors sm:p-5"
              style={{
                borderColor: open ? 'rgba(255,143,163,0.3)' : 'rgba(255,255,255,0.08)',
                background: open ? 'rgba(216,27,64,0.08)' : 'rgba(11,10,13,0.5)',
                backdropFilter: 'blur(14px)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-[14px] font-semibold text-mist">{k.term}</span>
                <motion.span animate={{ rotate: open ? 45 : 0 }} className="text-blush-300">
                  <Plus size={14} />
                </motion.span>
              </div>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.p
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden font-body text-[12.5px] leading-relaxed text-white/55"
                  >
                    {k.definition}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
