import React, { useEffect, useState, useRef, useCallback } from 'react'
import { motion, useSpring, useMotionValue } from 'framer-motion'

export default function FuturisticCursor() {
  const [isPointer, setIsPointer] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const [ripples, setRipples] = useState([])
  const [particles, setParticles] = useState([])

  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  // Spring physics for trailing HUD reticle
  const springConfig = { damping: 24, stiffness: 320, mass: 0.5 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  const lastPos = useRef({ x: 0, y: 0 })
  const particleIdRef = useRef(0)

  // Detect coarse pointers / touch screens
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isCoarse = window.matchMedia('(pointer: coarse)').matches
      setIsTouch(isCoarse)
    }
  }, [])

  // Mouse move handler
  useEffect(() => {
    if (isTouch) return

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
      if (!isVisible) setIsVisible(true)

      // Check for interactive targets
      const target = e.target
      if (target && target.closest) {
        const isInteractive = target.closest(
          'button, a, input, textarea, select, [role="button"], [data-cursor="pointer"], .cursor-pointer, .interactive'
        )
        setIsPointer(!!isInteractive)
      }

      // Spawn trailing cyber particles on movement
      const dist = Math.hypot(e.clientX - lastPos.current.x, e.clientY - lastPos.current.y)
      if (dist > 16) {
        lastPos.current = { x: e.clientX, y: e.clientY }
        const newParticle = {
          id: particleIdRef.current++,
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          size: Math.random() * 2.5 + 1.5,
          color: Math.random() > 0.4 ? '#ff8fa3' : '#d81b40',
        }
        setParticles((prev) => [...prev.slice(-14), newParticle])
      }
    }

    const handleMouseDown = (e) => {
      setIsClicking(true)
      // Create click shockwave ripple
      const newRipple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
      }
      setRipples((prev) => [...prev.slice(-4), newRipple])
    }

    const handleMouseUp = () => setIsClicking(false)
    const handleMouseLeave = () => setIsVisible(false)
    const handleMouseEnter = () => setIsVisible(true)

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
    }
  }, [isTouch, isVisible, mouseX, mouseY])

  // Clean up ripples after animation
  const removeRipple = useCallback((id) => {
    setRipples((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // Clean up trailing particles
  useEffect(() => {
    if (particles.length === 0) return
    const timer = setTimeout(() => {
      setParticles((prev) => prev.slice(1))
    }, 450)
    return () => clearTimeout(timer)
  }, [particles])

  if (isTouch || !isVisible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[999999] overflow-hidden">
      {/* Click ripples / shockwaves */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0.2, opacity: 0.9 }}
          animate={{ scale: 2.8, opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          onAnimationComplete={() => removeRipple(ripple.id)}
          className="absolute rounded-full border border-blush-400/80"
          style={{
            left: ripple.x - 24,
            top: ripple.y - 24,
            width: 48,
            height: 48,
            boxShadow: '0 0 16px 2px rgba(255,143,163,0.6)',
          }}
        />
      ))}

      {/* Trailing cyber sparks */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 0, opacity: 0, y: -8 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 8px 1px ${p.color}`,
          }}
        />
      ))}

      {/* Outer Spring-Lagged HUD Reticle Ring */}
      <motion.div
        className="absolute flex items-center justify-center pointer-events-none"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        <motion.div
          animate={{
            scale: isClicking ? 0.75 : isPointer ? 1.6 : 1,
            rotate: isPointer ? 90 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 25,
          }}
          className="relative flex items-center justify-center"
          style={{ width: 36, height: 36 }}
        >
          {/* Outer dashed HUD border */}
          <div
            className={`absolute inset-0 rounded-full border transition-colors duration-200 ${
              isPointer
                ? 'border-dashed border-blush-300 shadow-[0_0_15px_rgba(255,143,163,0.7)]'
                : 'border-white/20'
            }`}
            style={{
              animation: 'orbit-spin 10s linear infinite',
            }}
          />

          {/* Sci-Fi Target HUD Corners when hovering interactive elements */}
          {isPointer && (
            <div className="absolute -inset-1">
              <span className="absolute top-0 left-0 h-1.5 w-1.5 border-t-2 border-l-2 border-blush-300" />
              <span className="absolute top-0 right-0 h-1.5 w-1.5 border-t-2 border-r-2 border-blush-300" />
              <span className="absolute bottom-0 left-0 h-1.5 w-1.5 border-b-2 border-l-2 border-blush-300" />
              <span className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b-2 border-r-2 border-blush-300" />
            </div>
          )}

          {/* Micro HUD ticks */}
          <span className="absolute -top-1 h-1 w-0.5 bg-white/30" />
          <span className="absolute -bottom-1 h-1 w-0.5 bg-white/30" />
          <span className="absolute -left-1 h-0.5 w-1 bg-white/30" />
          <span className="absolute -right-1 h-0.5 w-1 bg-white/30" />
        </motion.div>
      </motion.div>

      {/* Primary Laser Core Dot (Exact Mouse Follow) */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        <motion.div
          animate={{
            scale: isClicking ? 1.5 : isPointer ? 0.6 : 1,
          }}
          transition={{ duration: 0.15 }}
          className="relative flex items-center justify-center"
        >
          {/* Glowing core dot */}
          <div
            className={`h-2 w-2 rounded-full transition-colors duration-200 ${
              isPointer ? 'bg-blush-200' : 'bg-crimson-400'
            }`}
            style={{
              boxShadow: isPointer
                ? '0 0 10px 2px rgba(255,171,185,0.9), 0 0 20px 4px rgba(216,27,64,0.6)'
                : '0 0 8px 1.5px rgba(240,53,90,0.85)',
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
