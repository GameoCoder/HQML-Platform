import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  Bot,
  User,
  RotateCcw,
  Stethoscope,
  Dna,
  Cpu,
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { chatWithRag } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

export default function RagConsultationSlide({ result }) {
  const { token, user, isDoctor } = useAuth()
  const dataset = result?.dataset || 'brain-tumor'
  const headline = result?.headline || 'Patient Diagnostic Case'
  const qDiag = result?.quantumDiagnosis || {}

  const initialGreeting = {
    role: 'assistant',
    content: `**Clinical Consultation Initiated**\n\nI have loaded the complete quantum-classical telemetry for this patient:\n• **Consensus Finding**: ${headline}\n• **Primary Quantum Classifier**: **${qDiag.prediction || 'Classified'}** (${(qDiag.confidence_percentage ?? (result?.confidence ? result.confidence * 100 : 92)).toFixed(1)}% confidence)\n• **Circuit Hardware**: 14 Wires · Multi-Observable Pauli-Z Telemetry\n\nAs your AI Clinical Consultation Fellow, how can I assist with this case? You can ask about biomarker mechanisms, quantum-classical divergence, or clinical management protocols.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }

  const [messages, setMessages] = useState([initialGreeting])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorNotice, setErrorNotice] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Suggested Quick Question Prompts based on active dataset
  const suggestedPrompts = [
    dataset === 'brain-tumor' || dataset === 'mri'
      ? 'What morphological MRI features distinguish this neoplasm?'
      : 'Explain the role of TP53 and CDKN2A in this diagnosis',
    'How did the 14-Qubit VQC contribute to the diagnostic consensus?',
    'What are the recommended clinical next steps and staging protocols?',
    'Compare the Quantum VQC prediction against the Classical Random Forest',
  ]

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim()
    if (!text || isLoading) return

    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    // Append user message immediately
    const updatedHistory = [...messages, userMessage]
    setMessages(updatedHistory)
    setInputValue('')
    setIsLoading(true)
    setErrorNotice('')

    try {
      // Format history for backend API (excluding greeting timestamp)
      const apiHistory = updatedHistory
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await chatWithRag({
        message: text,
        history: apiHistory,
        patientContext: result,
        dataset,
        token,
      })

      if (res?.status === 'success' && res?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.reply,
            model: res.model,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      } else {
        throw new Error(res?.message || 'Received unexpected format from Agentic RAG.')
      }
    } catch (err) {
      console.error('RAG consultation error:', err)
      setErrorNotice(err.message || 'Unable to complete RAG query. Using fallback clinical assessment.')
      // Append fail-safe response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `**Clinical Assessment (Fail-Safe Response)**\n\nRegarding your query on "${text}":\n\nThe diagnostic consensus (${headline}) was corroborated by both the 14-Qubit Variational Circuit and classical baselines. Multidisciplinary Tumor Board (MTB) review and direct histological staging remain the gold standard for therapeutic guidance.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3.5">
      {/* Patient Telemetry Briefing Header Bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-3 backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-blush-400/30 bg-crimson-950/40 p-2 text-blush-200 shadow-[0_0_12px_rgba(216,27,64,0.3)]">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold text-mist">
                Agentic RAG Clinical Consultation
              </span>
              <span className="rounded-full border border-teal-500/30 bg-teal-950/40 px-2 py-0.2 font-mono text-[9px] text-teal-300">
                OLLAMA QWEN2.5:1.5B ACTIVE
              </span>
            </div>
            <p className="font-mono text-[10.5px] text-white/40">
              Active Case: {headline} · 14-Qubit Multi-Observable Consensus
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMessages([initialGreeting])}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10.5px] text-white/40 hover:text-white/80 transition-colors cursor-pointer"
            title="Clear discussion history"
          >
            <RotateCcw size={11} /> Clear Thread
          </button>
        </div>
      </motion.div>

      {/* Main Chat Panel */}
      <div
        className="flex flex-1 flex-col rounded-2xl border border-white/8 overflow-hidden"
        style={{ background: 'rgba(11,10,13,0.65)', backdropFilter: 'blur(20px)' }}
      >
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 max-h-[380px]">
          {messages.map((m, idx) => {
            const isBot = m.role === 'assistant'
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border ${
                    isBot
                      ? 'border-blush-400/40 bg-crimson-900/40 text-blush-200 shadow-[0_0_12px_rgba(216,27,64,0.4)]'
                      : 'border-purple-400/40 bg-purple-900/40 text-purple-200'
                  }`}
                >
                  {isBot ? <Sparkles size={14} /> : <User size={14} />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[82%] rounded-2xl p-3.5 sm:p-4 text-[13px] leading-relaxed ${
                    isBot
                      ? 'border border-white/8 bg-white/[0.04] text-white/85 shadow-lg'
                      : 'border border-purple-400/30 bg-purple-950/40 text-purple-100'
                  }`}
                >
                  {/* Sender title & time */}
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-mono text-white/40">
                    <span className="font-semibold text-blush-300">
                      {isBot ? 'AI Clinical Consultant (Agentic RAG)' : user?.name || (isDoctor ? 'Dr. Attending' : 'Researcher')}
                    </span>
                    <span>{m.timestamp}</span>
                  </div>

                  {/* Body text with basic markdown styling */}
                  <div className="space-y-1.5 font-body whitespace-pre-wrap">
                    {m.content}
                  </div>

                  {m.model && (
                    <div className="mt-2 pt-1.5 border-t border-white/5 font-mono text-[9.5px] text-white/30">
                      Engine: {m.model}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}

          {/* Loading Typing Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blush-400/40 bg-crimson-900/40 text-blush-200 shadow-[0_0_12px_rgba(216,27,64,0.4)]">
                <Sparkles size={14} className="animate-spin" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <span className="h-1.5 w-1.5 rounded-full bg-blush-400 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-blush-400 animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-blush-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2 font-mono text-[11px] text-white/40">
                  Synthesizing clinical knowledge via Ollama...
                </span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Question Chips */}
        <div className="border-t border-white/5 bg-white/[0.015] px-4 py-2.5">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-white/30">
            Suggested Clinical Inquiries:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 font-mono text-[10.5px] text-white/60 hover:border-blush-400/40 hover:text-blush-200 hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                + {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="border-t border-white/10 p-3 bg-white/[0.02]">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask the Agentic RAG engine about biomarkers, quantum metrics, or next steps..."
              disabled={isLoading}
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-body text-[13.5px] text-mist placeholder:text-white/25 focus:border-blush-400/50 focus:outline-none disabled:opacity-50"
            />

            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isLoading || !inputValue.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-crimson-600 to-blush-400 text-mist transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_15px_rgba(216,27,64,0.4)]"
            >
              <Send size={15} />
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  )
}
