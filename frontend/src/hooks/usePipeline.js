import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { MODELS } from '../data/demoData.js'
import { runLivePipeline } from '../lib/livePipeline.js'

// Phases the whole app can be in:
// PORTAL is the primary Home page (6 group members + login/captcha verification).
// HOME is the diagnostic command center (query/image prompt input).
// SENDING is the brief transition beat between HOME and PROCESSING.
// PROCESSING is the live inference telemetry screen.
// MODEL_ZOOM is the detailed inspector overlay.
// OUTPUT is the multi-slide results summary.
export const PHASES = {
  PORTAL: 'portal',
  HOME: 'home',
  SENDING: 'sending',
  PROCESSING: 'processing',
  MODEL_ZOOM: 'model_zoom',
  OUTPUT: 'output',
}

const initialModelState = () =>
  Object.fromEntries(MODELS.map((m) => [m.id, { status: 'waiting', startTime: null, latencyMs: null }]))

const initialState = {
  phase: PHASES.PORTAL,
  query: '',
  image: null,
  file: null,
  dataset: 'brain-tumor',
  patientIdx: 1,
  error: null,
  backend: { status: 'waiting', startTime: null, latencyMs: null },
  models: initialModelState(),
  output: { status: 'waiting' },
  result: null,
  activeSlide: 0,
}

function reducer(state, action) {
  switch (action.type) {
    case 'GO_TO_PORTAL':
      return { ...state, phase: PHASES.PORTAL }
    case 'GO_TO_DIAGNOSE':
      return { ...state, phase: PHASES.HOME }
    case 'SET_PHASE':
      return { ...state, phase: action.payload }
    case 'SUBMIT':
      return {
        ...state,
        phase: PHASES.SENDING,
        query: action.payload.query || '',
        image: action.payload.image || null,
        file: action.payload.file || null,
        dataset: action.payload.dataset || 'brain-tumor',
        patientIdx: action.payload.patientIdx || 1,
        error: null,
      }
    case 'ENTER_PROCESSING':
      return { ...state, phase: PHASES.PROCESSING }
    case 'PIPELINE_ERROR':
      return { ...state, phase: PHASES.HOME, error: action.payload.message }
    case 'BACKEND_START':
      return { ...state, backend: { status: 'processing', startTime: action.payload.startTime, latencyMs: null } }
    case 'BACKEND_READY':
      return { ...state, backend: { ...state.backend, status: 'ready', latencyMs: action.payload.latencyMs } }
    case 'MODELS_START':
      return {
        ...state,
        models: Object.fromEntries(
          MODELS.map((m) => [m.id, { status: 'processing', startTime: action.payload.startTime, latencyMs: null }])
        ),
      }
    case 'MODEL_READY':
      return {
        ...state,
        models: {
          ...state.models,
          [action.payload.id]: {
            ...state.models[action.payload.id],
            status: 'ready',
            latencyMs: action.payload.latencyMs,
          },
        },
      }
    case 'OUTPUT_PROCESSING':
      return { ...state, output: { status: 'processing' } }
    case 'OUTPUT_READY':
      return { ...state, output: { status: 'ready' }, result: action.payload }
    case 'OPEN_MODEL_ZOOM':
      return { ...state, phase: PHASES.MODEL_ZOOM }
    case 'CLOSE_MODEL_ZOOM':
      return { ...state, phase: PHASES.PROCESSING }
    case 'GO_TO_OUTPUT':
      return { ...state, phase: PHASES.OUTPUT, activeSlide: 0 }
    case 'SET_SLIDE':
      return { ...state, activeSlide: action.payload }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

export function usePipeline({ token = null, userRole = null } = {}) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const cancelRef = useRef(null)
  const [now, setNow] = useState(Date.now())

  // A single shared clock. Derives (now - startTime) for all timers.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [])

  const goToPortal = useCallback(() => dispatch({ type: 'GO_TO_PORTAL' }), [])
  const startDiagnosis = useCallback(() => dispatch({ type: 'GO_TO_DIAGNOSE' }), [])
  const setPhase = useCallback((phase) => dispatch({ type: 'SET_PHASE', payload: phase }), [])

  const submit = useCallback((payloadOrQuery, maybeImage) => {
    let payload = {}
    if (typeof payloadOrQuery === 'object' && payloadOrQuery !== null && !(payloadOrQuery instanceof File)) {
      payload = payloadOrQuery
    } else {
      payload = { query: payloadOrQuery, image: maybeImage }
    }
    dispatch({ type: 'SUBMIT', payload })
  }, [])

  // Once SENDING beat completes, enter processing and run backend
  const enterProcessing = useCallback(() => {
    dispatch({ type: 'ENTER_PROCESSING' })
    cancelRef.current = runLivePipeline(dispatch, {
      query: state.query,
      image: state.image,
      file: state.file,
      dataset: state.dataset,
      patientIdx: state.patientIdx,
      token,
      userRole,
    })
  }, [state.query, state.image, state.file, state.dataset, state.patientIdx, token, userRole])

  useEffect(() => () => cancelRef.current && cancelRef.current(), [])

  const openModelZoom = useCallback(() => dispatch({ type: 'OPEN_MODEL_ZOOM' }), [])
  const closeModelZoom = useCallback(() => dispatch({ type: 'CLOSE_MODEL_ZOOM' }), [])
  const goToOutput = useCallback(() => dispatch({ type: 'GO_TO_OUTPUT' }), [])
  const setSlide = useCallback((i) => dispatch({ type: 'SET_SLIDE', payload: i }), [])
  const reset = useCallback(() => {
    cancelRef.current && cancelRef.current()
    dispatch({ type: 'RESET' })
  }, [])

  const elapsed = (startTime) => (startTime ? Math.max(0, now - startTime) : 0)

  const allModelsReady = MODELS.every((m) => state.models[m.id].status === 'ready')

  return {
    state,
    elapsed,
    allModelsReady,
    goToPortal,
    startDiagnosis,
    setPhase,
    submit,
    enterProcessing,
    openModelZoom,
    closeModelZoom,
    goToOutput,
    setSlide,
    reset,
  }
}
