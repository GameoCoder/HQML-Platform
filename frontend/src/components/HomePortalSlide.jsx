import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  User,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Fingerprint,
  Radio,
  ArrowRight,
  Code2,
  Stethoscope,
  FlaskConical,
  KeyRound
} from 'lucide-react'
import { TEAM_MEMBERS } from '../data/teamData.js'
import { GlowBadge } from './ui.jsx'
import { fetchCaptcha } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function HomePortalSlide({ onStart }) {
  const auth = useAuth()
  const [username, setUsername] = useState(auth.user?.username || 'doctor')
  const [password, setPassword] = useState('doctor123')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaSvg, setCaptchaSvg] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [isCaptchaRefreshing, setIsCaptchaRefreshing] = useState(false)
  const [authStatus, setAuthStatus] = useState('idle') // 'idle' | 'authorizing' | 'granted' | 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [hoveredMember, setHoveredMember] = useState(null)

  // Fetch real cryptographic captcha from backend
  const loadCaptcha = useCallback(async () => {
    setIsCaptchaRefreshing(true)
    try {
      const res = await fetchCaptcha()
      if (res?.status === 'success') {
        setCaptchaToken(res.captcha_token)
        setCaptchaSvg(res.captcha_svg)
        setCaptchaInput('')
      }
    } catch (err) {
      console.error('Failed to load captcha:', err)
      setErrorMessage('Could not load security captcha from backend. Is Django running?')
    } finally {
      setIsCaptchaRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadCaptcha()
  }, [loadCaptcha])

  const handleSelectRole = (roleKey) => {
    if (roleKey === 'doctor') {
      setUsername('doctor')
      setPassword('doctor123')
    } else if (roleKey === 'researcher') {
      setUsername('researcher')
      setPassword('researcher123')
    } else if (roleKey === 'admin') {
      setUsername('admin')
      setPassword('admin123')
    }
    setErrorMessage('')
  }

  const handleStart = async (e) => {
    e?.preventDefault()
    setErrorMessage('')

    if (!username.trim()) {
      setErrorMessage('Please enter an Operator ID / Username.')
      setAuthStatus('error')
      return
    }

    if (!password.trim()) {
      setErrorMessage('Please enter an Access Password.')
      setAuthStatus('error')
      return
    }

    if (!captchaInput.trim()) {
      setErrorMessage('Please enter the Security Captcha characters.')
      setAuthStatus('error')
      return
    }

    // Trigger futuristic launch sequence with real backend login
    setAuthStatus('authorizing')
    try {
      const userProfile = await auth.login({
        username: username.trim(),
        password: password.trim(),
        captcha_token: captchaToken,
        captcha_answer: captchaInput.trim(),
      })

      setAuthStatus('granted')
      setTimeout(() => {
        onStart(userProfile)
      }, 700)
    } catch (err) {
      setErrorMessage(err.message || 'Authentication verification failed. Please try again.')
      setAuthStatus('error')
      // Refresh captcha automatically on failure
      loadCaptcha()
    }
  }

  const isCaptchaFilled = captchaInput.trim().length >= 4

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-start px-4 pb-20 pt-24 sm:px-6 lg:px-10">
      {/* Background HUD Grid Overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-crimson-600/10 blur-[130px]" />
        <div className="absolute bottom-10 left-1/3 h-[400px] w-[600px] rounded-full bg-blush-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center">
        {/* Top Header & Telemetry */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex flex-col items-center text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <GlowBadge>SCHRODINGER'S COUGH RESEARCH DIVISION</GlowBadge>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/50">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success shadow-[0_0_8px_rgba(34,224,150,0.8)]" />
              <span>NODES // 6 ACTIVE</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/50">
              <Radio size={11} className="text-blush-300 animate-pulse" />
              <span>SECURITY: LEVEL-5</span>
            </div>
          </div>

          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-mist sm:text-4xl md:text-5xl lg:text-6xl">
            Meet the{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, #ff8fa3 0%, #ff6b85 30%, #d81b40 70%, #ff8fa3 100%)',
              }}
            >
              Schrodinger's Cough Architects
            </span>
          </h1>

          <p className="mt-3 max-w-2xl text-balance font-body text-[14px] leading-relaxed text-white/45 sm:text-[15px]">
            Quantum diagnostic intelligence engineered by our 6-member research collective.
            Authenticate clearance below to engage the clinical AI inference suite.
          </p>
        </motion.div>

        {/* 6 Group Members Cards Side by Side */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 w-full"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6">
            {TEAM_MEMBERS.map((member, idx) => {
              const isHovered = hoveredMember === member.id
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08 * idx }}
                  onMouseEnter={() => setHoveredMember(member.id)}
                  onMouseLeave={() => setHoveredMember(null)}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3.5 transition-all duration-300 sm:p-4"
                  style={{
                    borderColor: isHovered ? 'rgba(255,143,163,0.45)' : 'rgba(255,255,255,0.08)',
                    background: isHovered
                      ? 'linear-gradient(180deg, rgba(30,10,18,0.7) 0%, rgba(12,9,14,0.85) 100%)'
                      : 'rgba(12,10,14,0.55)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: isHovered
                      ? '0 0 28px -4px rgba(216,27,64,0.45), inset 0 1px 0 rgba(255,255,255,0.1)'
                      : '0 8px 24px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
                  }}
                >
                  {/* Cyber Corner HUD Brackets */}
                  <span className="absolute top-1.5 left-1.5 h-1.5 w-1.5 border-t border-l border-white/20 group-hover:border-blush-300" />
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 border-t border-r border-white/20 group-hover:border-blush-300" />
                  <span className="absolute bottom-1.5 left-1.5 h-1.5 w-1.5 border-b border-l border-white/20 group-hover:border-blush-300" />
                  <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 border-b border-r border-white/20 group-hover:border-blush-300" />

                  {/* Laser Scanline on hover */}
                  {isHovered && (
                    <div
                      className="pointer-events-none absolute inset-0 opacity-40"
                      style={{
                        background:
                          'linear-gradient(180deg, transparent 0%, rgba(255,143,163,0.2) 50%, transparent 100%)',
                        backgroundSize: '100% 200%',
                        animation: 'scan-border 2s linear infinite',
                      }}
                    />
                  )}

                  {/* Top Bar inside card: Node Code & Status Dot */}
                  <div className="relative mb-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold tracking-wider text-blush-300/80 group-hover:text-blush-200">
                      {member.code}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-white/40 group-hover:text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(34,224,150,0.8)]" />
                      {member.status}
                    </span>
                  </div>

                  {/* Avatar / Portrait Container */}
                  <div className="relative mx-auto mb-3 flex items-center justify-center">
                    <div
                      className="relative h-20 w-20 overflow-hidden rounded-full border-2 transition-all duration-300 sm:h-24 sm:w-24"
                      style={{
                        borderColor: isHovered ? member.accent : 'rgba(255,255,255,0.14)',
                        boxShadow: isHovered
                          ? `0 0 20px -2px ${member.accent}80`
                          : '0 0 10px rgba(0,0,0,0.5)',
                      }}
                    >
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          // Fallback to high-tech gradient if remote avatar is blocked
                          e.target.style.display = 'none'
                          e.target.parentNode.classList.add('bg-gradient-to-br', member.fallbackColor)
                        }}
                      />
                      {/* Holographic lens overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>

                    {/* Rotating Cyber Ring */}
                    <div
                      className="pointer-events-none absolute -inset-1.5 rounded-full border border-dashed border-white/15 transition-colors duration-300 group-hover:border-blush-400/40"
                      style={{ animation: 'orbit-spin 14s linear infinite' }}
                    />
                  </div>

                  {/* Member Info */}
                  <div className="relative text-center">
                    <h3 className="truncate font-display text-[14px] font-semibold text-mist group-hover:text-white sm:text-[15px]">
                      {member.name}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 font-body text-[11px] font-medium text-blush-300">
                      {member.role}
                    </p>
                    <p className="mt-1 line-clamp-2 font-mono text-[9.5px] leading-tight text-white/35 group-hover:text-white/60">
                      {member.specialization}
                    </p>

                    {/* Skill Tags */}
                    <div className="mt-2.5 flex flex-wrap justify-center gap-1">
                      {member.skills.slice(0, 2).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-white/50 group-hover:border-blush-400/20 group-hover:text-blush-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Bottom Middle Authentication Box */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl"
        >
          <div
            className="relative overflow-hidden rounded-[26px] border p-5 transition-all duration-300 sm:p-7"
            style={{
              borderColor:
                authStatus === 'error'
                  ? 'rgba(240,53,90,0.6)'
                  : authStatus === 'granted'
                  ? 'rgba(34,224,150,0.6)'
                  : 'rgba(255,255,255,0.12)',
              background: 'rgba(10,9,13,0.72)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow:
                authStatus === 'granted'
                  ? '0 0 40px rgba(34,224,150,0.35), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : authStatus === 'error'
                  ? '0 0 35px rgba(240,53,90,0.35), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 20px 60px -20px rgba(0,0,0,0.8), 0 0 30px -10px rgba(216,27,64,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Terminal Header */}
            <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blush-400/30 bg-crimson-900/30 text-blush-200">
                  <Fingerprint size={15} />
                </span>
                <div>
                  <h4 className="font-display text-[13.5px] font-semibold tracking-wide text-mist">
                    Security Clearance Gateway
                  </h4>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">
                    Terminal ID: NX-GATE-884
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-blush-400/20 bg-crimson-950/40 px-2.5 py-1 font-mono text-[10px] text-blush-200">
                <ShieldCheck size={11} className="text-blush-300" />
                VERIFIED ACCESS
              </span>
            </div>

            <form onSubmit={handleStart} className="space-y-4">
              {/* Quick Role Selection Preset Badges */}
              <div>
                <label className="mb-2 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/50">
                  <span>Quick Demo Persona Select</span>
                  <span className="text-[9px] text-blush-300">1-CLICK CLEARANCE</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectRole('doctor')}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all ${
                      username === 'doctor'
                        ? 'border-teal-400 bg-teal-950/50 text-teal-200 shadow-[0_0_15px_rgba(20,184,166,0.3)]'
                        : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-teal-400/40 hover:text-teal-300'
                    }`}
                  >
                    <Stethoscope size={14} className={username === 'doctor' ? 'text-teal-300' : 'text-white/40'} />
                    <span className="font-display text-[11px] font-semibold">Doctor</span>
                    <span className="font-mono text-[8.5px] text-white/40">Images Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectRole('researcher')}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all ${
                      username === 'researcher'
                        ? 'border-purple-400 bg-purple-950/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                        : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-purple-400/40 hover:text-purple-300'
                    }`}
                  >
                    <FlaskConical size={14} className={username === 'researcher' ? 'text-purple-300' : 'text-white/40'} />
                    <span className="font-display text-[11px] font-semibold">Researcher</span>
                    <span className="font-mono text-[8.5px] text-white/40">Images + Data</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectRole('admin')}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all ${
                      username === 'admin'
                        ? 'border-crimson-400 bg-crimson-950/50 text-blush-200 shadow-[0_0_15px_rgba(240,53,90,0.3)]'
                        : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-crimson-400/40 hover:text-blush-300'
                    }`}
                  >
                    <KeyRound size={14} className={username === 'admin' ? 'text-crimson-300' : 'text-white/40'} />
                    <span className="font-display text-[11px] font-semibold">Admin</span>
                    <span className="font-mono text-[8.5px] text-white/40">Full + Manage</span>
                  </button>
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-white/50">
                  <span>Operator ID // Username</span>
                  <span className="text-[9.5px] text-blush-300/80">REQUIRED</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-white/35">
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter operator username..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 font-body text-[14px] text-mist placeholder:text-white/20 focus:border-blush-400/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-blush-400/20 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-white/50">
                  <span>Access Password</span>
                  <span className="text-[9.5px] text-blush-300/80">ENCRYPTED</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-white/35">
                    <Lock size={15} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter access password..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-11 font-body text-[14px] text-mist placeholder:text-white/20 focus:border-blush-400/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-blush-400/20 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-white/35 hover:text-white/80 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Futuristic Captcha Verification */}
              <div>
                <label className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-white/50">
                  <span>Backend Cryptographic Captcha</span>
                  <span className="text-[9.5px] text-blush-300/80">HMAC-SIGNED PROTOCOL</span>
                </label>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {/* Visual Captcha Display */}
                  <div
                    className="relative flex h-[50px] items-center justify-between overflow-hidden rounded-xl border border-blush-400/30 px-3 py-1 select-none"
                    style={{
                      background:
                        'radial-gradient(ellipse at center, rgba(58,5,18,0.7) 0%, rgba(10,5,10,0.95) 100%)',
                      boxShadow: 'inset 0 0 16px rgba(216,27,64,0.3)',
                    }}
                  >
                    {/* Real SVG Rendered from backend */}
                    {captchaSvg ? (
                      <div
                        className="flex h-full items-center justify-center overflow-hidden [&>svg]:h-full [&>svg]:w-auto [&>svg]:max-w-[135px]"
                        dangerouslySetInnerHTML={{ __html: captchaSvg }}
                      />
                    ) : (
                      <span className="font-mono text-[11px] text-blush-300/70 animate-pulse">
                        Generating challenge...
                      </span>
                    )}

                    {/* Refresh Button */}
                    <button
                      type="button"
                      onClick={loadCaptcha}
                      className="relative z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/60 hover:border-blush-300 hover:text-blush-200 transition-colors cursor-pointer"
                      title="Request New Captcha Challenge"
                    >
                      <RefreshCw
                        size={13}
                        className={isCaptchaRefreshing ? 'animate-spin text-blush-300' : ''}
                      />
                    </button>
                  </div>

                  {/* Captcha Input */}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                      placeholder="Type captcha glyphs..."
                      maxLength={10}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-3.5 pr-9 font-mono text-[13.5px] uppercase tracking-wider text-mist placeholder:text-white/20 focus:border-blush-400/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-blush-400/20 transition-all duration-200"
                    />
                    <span className="absolute right-3">
                      {isCaptchaFilled ? (
                        <CheckCircle2 size={16} className="text-success animate-pulse" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-white/20" />
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Alert Message */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-2.5 text-[12px] font-mono text-red-300"
                >
                  <AlertCircle size={14} className="flex-shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {/* Authorization feedback */}
              <AnimatePresence>
                {authStatus === 'authorizing' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 py-1 font-mono text-[11px] uppercase tracking-widest text-blush-300"
                  >
                    <Sparkles size={13} className="animate-spin" />
                    <span>AUTHENTICATING LEVEL-5 PROTOCOL...</span>
                  </motion.div>
                )}
                {authStatus === 'granted' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 py-1 font-mono text-[11px] uppercase tracking-widest text-success"
                  >
                    <CheckCircle2 size={13} />
                    <span>ACCESS GRANTED // LAUNCHING SCHRODINGER'S COUGH DIAGNOSTICS</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Lower Center "Let's Start" Button */}
              <div className="pt-2">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.025 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={authStatus === 'authorizing' || authStatus === 'granted'}
                  className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl py-3.5 px-6 font-display text-[15px] font-semibold tracking-wider uppercase text-white transition-all duration-300"
                  style={{
                    background:
                      authStatus === 'granted'
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #ff8fa3 0%, #d81b40 50%, #7a0e28 100%)',
                    boxShadow:
                      authStatus === 'granted'
                        ? '0 0 35px 4px rgba(16,185,129,0.55)'
                        : '0 0 35px 2px rgba(216,27,64,0.55), inset 0 1px 0 rgba(255,255,255,0.3)',
                  }}
                >
                  {/* Energy shimmer sweep */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-300 group-hover:opacity-80"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'scan-border 2.2s infinite',
                    }}
                  />

                  <Zap size={18} className="text-blush-100 group-hover:scale-110 transition-transform" />
                  <span className="relative z-10 tracking-[0.14em]">
                    {authStatus === 'authorizing'
                      ? 'Authorizing...'
                      : authStatus === 'granted'
                      ? 'Access Granted'
                      : "Let's Start"}
                  </span>
                  <ArrowRight
                    size={16}
                    className="relative z-10 text-blush-100 transition-transform group-hover:translate-x-1"
                  />
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
