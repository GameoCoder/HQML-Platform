import React from 'react'
import { motion } from 'framer-motion'
import {
  Atom,
  ShieldCheck,
  Sparkles,
  Activity,
  Stethoscope,
  FlaskConical,
  ShieldAlert,
  LogOut,
  Sliders
} from 'lucide-react'
import { PHASES } from '../hooks/usePipeline.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Banner({ onHome, onDiagnose, onViewOutput, onOpenAdmin, currentPhase, hasResult = false }) {
  const { user, isAuthenticated, logout, isAdmin, isDoctor, isResearcher } = useAuth()

  const isPortal = currentPhase === PHASES.PORTAL
  const isHome = currentPhase === PHASES.HOME || currentPhase === PHASES.SENDING
  const isProcessing = currentPhase === PHASES.PROCESSING || currentPhase === PHASES.MODEL_ZOOM
  const isOutput = currentPhase === PHASES.OUTPUT

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-3 left-1/2 z-40 w-[min(1240px,96vw)] -translate-x-1/2 sm:top-5"
    >
      <div
        className="flex items-center justify-between rounded-full border px-4 py-2 sm:px-6 sm:py-2.5"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          background: 'rgba(10,9,12,0.75)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.02), 0 8px 40px -12px rgba(216,27,64,0.35)',
        }}
      >
        {/* Logo + wordmark */}
        <button
          onClick={onHome}
          className="group flex items-center gap-2.5 outline-none cursor-pointer"
          aria-label="Schrodinger's Cough Home Portal"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border transition-transform duration-300 group-hover:scale-105"
            style={{
              borderColor: 'rgba(255,143,163,0.35)',
              background: 'radial-gradient(circle at 30% 30%, rgba(216,27,64,0.5), rgba(5,4,6,0.9))',
              boxShadow: '0 0 18px -2px rgba(216,27,64,0.6)',
            }}
          >
            <Atom size={16} strokeWidth={1.8} className="text-blush-200 animate-spin" style={{ animationDuration: '20s' }} />
          </span>
          <div className="flex flex-col text-left">
            <span className="font-display text-[14px] sm:text-[15px] font-bold tracking-[0.12em] text-mist whitespace-nowrap">
              Schrodinger's Cough
            </span>
          </div>
        </button>

        {/* User Role Clearance Badge */}
        {isAuthenticated && user ? (
          <div className="hidden md:flex items-center gap-2.5">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] ${
                isDoctor
                  ? 'border-teal-500/30 bg-teal-950/40 text-teal-200 shadow-[0_0_12px_rgba(20,184,166,0.25)]'
                  : isResearcher
                  ? 'border-purple-500/30 bg-purple-950/40 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                  : 'border-crimson-500/30 bg-crimson-950/40 text-blush-200 shadow-[0_0_12px_rgba(240,53,90,0.25)]'
              }`}
            >
              {isDoctor && <Stethoscope size={12} className="text-teal-300" />}
              {isResearcher && <FlaskConical size={12} className="text-purple-300" />}
              {isAdmin && <ShieldAlert size={12} className="text-crimson-400" />}
              <span className="font-semibold">{user.name || user.username}</span>
              <span className="opacity-40">|</span>
              <span className="uppercase text-[9.5px] font-bold tracking-wider opacity-85">
                {isDoctor ? 'Images Only' : isResearcher ? 'Images + CSV Data' : 'Admin Authority'}
              </span>
            </div>

            {isAdmin && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 rounded-full border border-crimson-400/40 bg-crimson-900/30 px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider text-blush-200 shadow-[0_0_14px_rgba(216,27,64,0.3)] hover:bg-crimson-800/40 hover:border-crimson-300 transition-all cursor-pointer"
              >
                <Sliders size={12} />
                <span>Admin Console</span>
              </button>
            )}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white/50">
            <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,224,150,0.8)] animate-pulse" />
            <span>SYS: ONLINE</span>
            <span className="text-white/20">|</span>
            <span className="text-blush-300">CORE v2.4</span>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={onHome}
            className="relative rounded-full px-3 py-1.5 font-body text-[13px] font-medium transition-colors sm:px-4 cursor-pointer"
          >
            {isPortal && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(216,27,64,0.18)',
                  border: '1px solid rgba(255,143,163,0.3)',
                  boxShadow: '0 0 16px rgba(216,27,64,0.35)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span
              className={`relative flex items-center gap-1.5 ${
                isPortal ? 'text-blush-200 font-semibold' : 'text-white/50 hover:text-white/80'
              }`}
            >
              Home
              {isPortal && (
                <span className="h-1.5 w-1.5 rounded-full bg-crimson-400 shadow-[0_0_8px_2px_rgba(240,53,90,0.8)]" />
              )}
            </span>
          </button>

          <button
            onClick={onDiagnose}
            className="relative rounded-full px-3 py-1.5 font-body text-[13px] font-medium transition-colors sm:px-4 cursor-pointer"
          >
            {isHome && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(216,27,64,0.18)',
                  border: '1px solid rgba(255,143,163,0.3)',
                  boxShadow: '0 0 16px rgba(216,27,64,0.35)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span
              className={`relative flex items-center gap-1.5 ${
                isHome ? 'text-blush-200 font-semibold' : 'text-white/50 hover:text-white/80'
              }`}
            >
              Diagnose
              {isHome && (
                <span className="h-1.5 w-1.5 rounded-full bg-crimson-400 shadow-[0_0_8px_2px_rgba(240,53,90,0.8)]" />
              )}
            </span>
          </button>

          {isProcessing && (
            <div className="relative rounded-full px-3 py-1.5 font-body text-[13px] font-medium text-blush-200">
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(216,27,64,0.22)',
                  border: '1px solid rgba(255,143,163,0.35)',
                }}
              />
              <span className="relative flex items-center gap-1.5 text-blush-200 font-semibold">
                <Sparkles size={13} className="animate-spin text-blush-300" />
                Pipeline
              </span>
            </div>
          )}

          {(isOutput || hasResult) && (
            <button
              onClick={onViewOutput}
              className="relative rounded-full px-3 py-1.5 font-body text-[13px] font-medium transition-colors sm:px-4 cursor-pointer"
            >
              {isOutput && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'rgba(216,27,64,0.22)',
                    border: '1px solid rgba(255,143,163,0.35)',
                    boxShadow: '0 0 16px rgba(216,27,64,0.35)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span
                className={`relative flex items-center gap-1.5 ${
                  isOutput ? 'text-blush-200 font-semibold' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Activity size={13} className={isOutput ? 'text-success' : 'text-success/70'} />
                Analysis
                {!isOutput && hasResult && (
                  <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(34,224,150,0.8)]" />
                )}
              </span>
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={() => {
                logout()
                onHome()
              }}
              className="ml-1 rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-blush-200 transition-colors cursor-pointer"
              title="Switch User / Logout"
            >
              <LogOut size={14} />
            </button>
          )}
        </nav>
      </div>
    </motion.header>
  )
}

