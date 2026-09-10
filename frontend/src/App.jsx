import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Background from './components/Background.jsx'
import Banner from './components/Banner.jsx'
import FuturisticCursor from './components/FuturisticCursor.jsx'
import HomePortalSlide from './components/HomePortalSlide.jsx'
import HomeScreen from './components/HomeScreen.jsx'
import ProcessingScreen from './components/ProcessingScreen.jsx'
import ModelZoomIn from './components/ModelZoomIn.jsx'
import OutputSummary from './components/OutputSummary.jsx'
import AdminManagementModal from './components/AdminManagementModal.jsx'
import { usePipeline, PHASES } from './hooks/usePipeline.js'
import { useAuth } from './context/AuthContext.jsx'

const SLIDE_DURATION = 1.05 // seconds — energy line transition duration

export default function App() {
  const auth = useAuth()
  const pipeline = usePipeline({ token: auth.token, userRole: auth.user?.role })
  const { state, submit, enterProcessing, goToPortal, startDiagnosis, reset, goToOutput } = pipeline
  const advanceTimer = useRef(null)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)

  const sending = state.phase === PHASES.SENDING

  useEffect(() => {
    if (state.phase === PHASES.SENDING) {
      advanceTimer.current = setTimeout(() => enterProcessing(), SLIDE_DURATION * 1000)
    }
    return () => clearTimeout(advanceTimer.current)
  }, [state.phase, enterProcessing])

  // Visual "slide" grouping: PORTAL, HOME+SENDING, PROCESSING, OUTPUT
  const slideKey =
    state.phase === PHASES.PORTAL
      ? PHASES.PORTAL
      : state.phase === PHASES.SENDING
      ? PHASES.HOME
      : state.phase === PHASES.MODEL_ZOOM
      ? PHASES.PROCESSING
      : state.phase

  return (
    <div className="relative min-h-screen">
      {/* Global Futuristic Interactive Cursor */}
      <FuturisticCursor />

      {/* Atmospheric Background & Particles */}
      <Background />

      {/* Navigation Banner */}
      <Banner
        onHome={goToPortal}
        onDiagnose={startDiagnosis}
        onViewOutput={goToOutput}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        currentPhase={state.phase}
        hasResult={Boolean(state.result)}
      />

      <AnimatePresence initial={false}>
        {state.phase === PHASES.PORTAL && (
          <motion.div
            key="portal-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <HomePortalSlide onStart={() => startDiagnosis()} />
          </motion.div>
        )}

        {(state.phase === PHASES.HOME || state.phase === PHASES.SENDING) && (
          <motion.div
            key="home-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <HomeScreen onSubmit={submit} sending={sending} error={state.error} />
          </motion.div>
        )}

        {(state.phase === PHASES.PROCESSING || state.phase === PHASES.MODEL_ZOOM) && (
          <motion.div
            key="processing-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <ProcessingScreen pipeline={pipeline} />
          </motion.div>
        )}

        {state.phase === PHASES.OUTPUT && (
          <motion.div
            key="output-phase"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <OutputSummary pipeline={pipeline} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model zoom overlay */}
      <AnimatePresence>
        {state.phase === PHASES.MODEL_ZOOM && (
          <motion.div
            key="model-zoom-overlay"
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(5,4,6,0.92)', backdropFilter: 'blur(6px)' }}
          >
            <ModelZoomIn pipeline={pipeline} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Governance & User Management Modal */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <AdminManagementModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
