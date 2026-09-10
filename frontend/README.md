# Schrodinger's Cough — AI Inference System (Frontend)

A single-page, cinematic frontend for a medical-AI diagnostic pipeline. Every
phase — Home, Processing, Model Zoom-In, and the Full Output Summary — is
implemented and fully interactive in **demo mode**, with simulated timers and
status changes standing in for the backend until it's connected.

## Running it

```bash
npm install
npm run dev      # local dev server (Vite)
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

Requires Node 18+.

## What's implemented

- **Home** — hero, AI-command-center textarea (drag-and-drop image support,
  the image button hides smoothly once you start typing), and a circular
  send button with hover/press/loading states.
- **Send transition** — a thin line hidden behind the input becomes a
  traveling ball of crimson light with a glowing trail once you hit send,
  while the interface slides PPT-style into Processing.
- **Processing** — three glass nodes (Backend → Models → Output), each with
  waiting/processing/ready states, live elapsed-time readouts, and a
  clickable Models node.
- **Model Zoom-In** — a cinematic branching visualization: one incoming line
  splits into a path per model (RF / SVM / NN / HQML), each animating
  independently with its own live timer, then merges back into a single
  line. Once every model reports ready, the pipeline shifts from crimson to
  green and automatically zooms back out.
- **Full Output Summary** — a 4-slide deck (Overview, In-Depth Model
  Analysis, Full Diagnostics, Keywords), reachable from the Output node's
  "View full analysis" link, with the same top banner as Home.

## Architecture

```
src/
  hooks/usePipeline.js     ← the whole state machine (single source of truth)
  lib/pipelineEvents.js    ← demo-mode event simulator + the real event contract
  data/demoData.js         ← placeholder models, metrics, diagnosis, keywords
  components/
    Background.jsx         ← ambient grid / particles / noise
    Banner.jsx              ← persistent top nav
    EnergyLine.jsx           ← the reusable "traveling light" pipeline motif
    HomeScreen.jsx
    ProcessingScreen.jsx
    ModelZoomIn.jsx
    OutputSummary.jsx
    slides/                 ← the four Full Output Summary slides
    ui.jsx                  ← GlassPanel / StatusPill / GlowBadge primitives
  App.jsx                   ← phase-to-screen wiring + slide transitions
```

`usePipeline` is the only place that knows about phases, timers, and model
state. Every screen just reads from it and calls its action functions
(`submit`, `openModelZoom`, `goToOutput`, …) — no screen owns simulation
logic itself.

## Connecting the real backend

`src/lib/pipelineEvents.js` is the seam. `runDemoPipeline(dispatch)`
currently drives the whole demo with `setTimeout`s, but it dispatches the
**same action shapes** a WebSocket handler would produce from real backend
messages:

```
{ intent: "Go to Processing Phase", start_time: "<ISO timestamp>" }  → BACKEND_START
{ model: "RF", status: "processing" }                                 → (implicit, handled by MODELS_START)
{ model: "RF", status: "ready", latency: "1.2s" }                     → MODEL_READY
{ status: "complete", diagnosis, full_diagnosis, rag_summary, ... }   → OUTPUT_READY
```

To go live: replace the call to `runDemoPipeline(dispatch)` in
`usePipeline.js` with a WebSocket connection that parses incoming messages
into the same `dispatch({ type, payload })` calls. No component needs to
change — they already render off `state.backend`, `state.models`, and
`state.result`, all of which come from the reducer regardless of where the
events originate. `elapsed(startTime)` already computes live durations from
a `startTime` timestamp, so a real `start_time` from the backend will "just
work" with the same continuously-updating clock used in demo mode.

Text + image are already collected on Home (`HomeScreen`'s `onSubmit`) and
handed to `usePipeline().submit(query, image)` — wire that into the actual
upload/send call to the backend when ready.
