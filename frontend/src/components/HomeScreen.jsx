import React, { useRef, useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ImagePlus,
  ArrowUp,
  X,
  Sparkles,
  Lock,
  FileSpreadsheet,
  Stethoscope,
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileText,
  Sliders,
  Layers,
  ChevronDown,
  Cpu,
  Activity,
  Dna,
  FileCheck,
  Check,
  UserCheck
} from 'lucide-react'
import { GlowBadge } from './ui.jsx'
import EnergyLine from './EnergyLine.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  createBrainMriPresetBlob,
  generateSampleTcgaLungTsv,
  SAMPLE_MALIGNANT_FEATURES,
  SAMPLE_BENIGN_FEATURES,
  BREAST_CANCER_COLUMNS
} from '../data/samplePatients.js'
import { tryParseFeatureVector, detectTsvMatrix } from '../lib/api.js'

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const DATASETS = [
  {
    id: 'brain-tumor',
    title: 'Brain MRI Scan',
    subtitle: '14-Qubit 4-Class Multi-Observable VQC',
    category: 'image',
    badge: 'Image Model',
    icon: Layers,
    allowedForDoctor: true,
    fileTypes: '.jpg, .jpeg, .png',
    description: '224x224 Axial Brain MRI Scan · Frozen ResNet-50 2048D Extractor · PCA Gatekeeper · 14-Qubit Multi-Observable VQC',
  },
  {
    id: 'tcga-lung-cell',
    title: 'TCGA Lung Squamous Cell',
    subtitle: 'Genomic Expression Matrix (56,908 Genes)',
    category: 'genomic',
    badge: 'Genomic TSV',
    icon: Dna,
    allowedForDoctor: false,
    fileTypes: '.tsv, .csv, .txt',
    description: '56,908 Genomic Loci · PCA Biomarker Attribution (TP53, CDKN2A, SOX2) · 14-Qubit VQC · Agentic RAG Clinical Summary',
  },
  {
    id: 'breast-cancer',
    title: 'Breast Cancer FNA Biopsy',
    subtitle: '30 Cytometric FNA Parameters',
    category: 'tabular',
    badge: 'Tabular CSV',
    icon: Sliders,
    allowedForDoctor: false,
    fileTypes: '.csv, .tsv, .txt',
    description: '30 Nuclear Morphology Parameters · Radius, Texture, Perimeter, Smoothness · Classical & Quantum Consensus',
  },
]

export default function HomeScreen({ onSubmit, sending, error }) {
  const { user, isDoctor, isResearcher, isAdmin, canDiagnoseData } = useAuth()

  // Selected active dataset
  const [selectedDataset, setSelectedDataset] = useState('brain-tumor')
  const [isDatasetDropdownOpen, setIsDatasetDropdownOpen] = useState(false)

  // Input view mode: 'file' (primary) or 'textarea' (alternative for researcher)
  const [inputMode, setInputMode] = useState('file') // 'file' | 'textarea'

  // Input states
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)
  const [file, setFile] = useState(null)
  const [fileDetails, setFileDetails] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [focused, setFocused] = useState(false)

  // Patient index selector for multi-patient TSVs (e.g. TCGA Lung)
  const [patientIdx, setPatientIdx] = useState(1)
  const [detectedPatients, setDetectedPatients] = useState(['sample_patient_01', 'sample_patient_02'])

  // Parsed feature vector for breast cancer
  const [featureVector, setFeatureVector] = useState(null)

  // Restriction alert message
  const [restrictionNotice, setRestrictionNotice] = useState('')

  const fileInputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDatasetDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-enforce Doctor restrictions
  useEffect(() => {
    if (isDoctor && selectedDataset !== 'brain-tumor') {
      setSelectedDataset('brain-tumor')
      setRestrictionNotice('Doctor clearance is restricted to Brain MRI imaging. Switching to Brain MRI dataset.')
    }
  }, [isDoctor, selectedDataset])

  // Try parsing feature vector when in breast-cancer mode
  useEffect(() => {
    if (selectedDataset === 'breast-cancer') {
      const parsed = tryParseFeatureVector(text)
      setFeatureVector(parsed)
    } else {
      setFeatureVector(null)
    }
  }, [text, selectedDataset])

  // Current dataset metadata
  const currentDatasetMeta = useMemo(() => {
    return DATASETS.find((d) => d.id === selectedDataset) || DATASETS[0]
  }, [selectedDataset])

  // Switch dataset handler with RBAC clearance check
  const handleSelectDataset = (datasetId) => {
    const target = DATASETS.find((d) => d.id === datasetId)
    if (!target) return

    if (isDoctor && !target.allowedForDoctor) {
      setRestrictionNotice(
        `Access Restricted: Doctor clearance is restricted to Brain MRI imaging only. Access to ${target.title} requires Researcher or Admin clearance.`
      )
      setIsDatasetDropdownOpen(false)
      return
    }

    setSelectedDataset(datasetId)
    setRestrictionNotice('')
    setIsDatasetDropdownOpen(false)
    // Reset file and preview for clean state
    setFile(null)
    setImage(null)
    setText('')
    setFileDetails(null)
    setPatientIdx(1)
  }

  // Handle uploaded files (drag-and-drop or file picker)
  const handleUploadedFiles = (files) => {
    const uploadedFile = files?.[0]
    if (!uploadedFile) return

    setRestrictionNotice('')

    if (currentDatasetMeta.category === 'image') {
      if (!uploadedFile.type.startsWith('image/')) {
        setRestrictionNotice('Invalid file format. Please upload a JPEG or PNG Brain MRI scan.')
        return
      }
      setImage({
        url: URL.createObjectURL(uploadedFile),
        name: uploadedFile.name,
        rawFile: uploadedFile,
      })
      setFile(uploadedFile)
      setFileDetails({
        name: uploadedFile.name,
        size: uploadedFile.size,
        type: uploadedFile.type || 'image/jpeg',
      })
    } else if (selectedDataset === 'tcga-lung-cell') {
      setFile(uploadedFile)
      setFileDetails({
        name: uploadedFile.name,
        size: uploadedFile.size,
        type: uploadedFile.type || 'text/tab-separated-values',
      })

      // Read preview of TSV header to detect patient columns
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result
        if (typeof content === 'string') {
          setText(content)
          const detected = detectTsvMatrix(content)
          if (detected && detected.columns?.length > 1) {
            setDetectedPatients(detected.columns.slice(1))
          }
        }
      }
      reader.readAsText(uploadedFile)
    } else if (selectedDataset === 'breast-cancer') {
      setFile(uploadedFile)
      setFileDetails({
        name: uploadedFile.name,
        size: uploadedFile.size,
        type: uploadedFile.type || 'text/csv',
      })

      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result
        if (typeof content === 'string') {
          setText(content)
          const parsed = tryParseFeatureVector(content)
          if (parsed) {
            setFeatureVector(parsed)
          }
        }
      }
      reader.readAsText(uploadedFile)
    }
  }

  // 1-Click Clinical Sample Loaders
  const handleLoadBrainMriPreset = async (type) => {
    const preset = await createBrainMriPresetBlob(type)
    setImage(preset)
    setFile(preset.rawFile)
    setFileDetails({
      name: preset.name,
      size: preset.rawFile.size,
      type: 'image/jpeg',
    })
    setText(
      type === 'tumor'
        ? 'Axial T1-weighted post-contrast MRI scan exhibiting hyperintense focal neocortical mass lesion with mass effect.'
        : 'Axial T1-weighted scan exhibiting physiological parenchymal baseline and preserved ventricular margins.'
    )
    setRestrictionNotice('')
  }

  const handleLoadTcgaSample = (isTumor) => {
    if (isDoctor) {
      setRestrictionNotice('Access Restricted: Doctor clearance is restricted to Brain MRI imaging.')
      return
    }

    const tsvContent = generateSampleTcgaLungTsv(isTumor)
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' })
    const filename = isTumor ? 'tcga_lung_sample_tumor.tsv' : 'tcga_lung_sample_normal.tsv'
    const syntheticFile = new File([blob], filename, { type: 'text/tab-separated-values' })

    setFile(syntheticFile)
    setFileDetails({
      name: filename,
      size: blob.size,
      type: 'text/tab-separated-values',
    })
    setText(tsvContent)
    setDetectedPatients(['sample_patient_01', 'sample_patient_02'])
    setPatientIdx(1)
    setRestrictionNotice('')
  }

  const handleLoadBreastCancerSample = (type) => {
    if (isDoctor) {
      setRestrictionNotice('Access Restricted: Doctor clearance is restricted to Brain MRI imaging.')
      return
    }

    const vector = type === 'malignant' ? SAMPLE_MALIGNANT_FEATURES : SAMPLE_BENIGN_FEATURES
    const csvContent = vector.join(', ')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const filename = type === 'malignant' ? 'breast_biopsy_malignant.csv' : 'breast_biopsy_benign.csv'
    const syntheticFile = new File([blob], filename, { type: 'text/csv' })

    setFile(syntheticFile)
    setFileDetails({
      name: filename,
      size: blob.size,
      type: 'text/csv',
    })
    setText(csvContent)
    setFeatureVector(vector)
    setRestrictionNotice('')
  }

  // Determine if ready to send
  const canSend = useMemo(() => {
    if (sending) return false
    if (selectedDataset === 'brain-tumor') {
      return Boolean(image || file)
    }
    if (selectedDataset === 'tcga-lung-cell') {
      return Boolean(file || text.trim().length > 0)
    }
    if (selectedDataset === 'breast-cancer') {
      return Boolean(file || featureVector || text.trim().length > 0)
    }
    return false
  }, [sending, selectedDataset, image, file, text, featureVector])

  // Submit diagnostic inference
  const handleSend = () => {
    if (!canSend) return

    if (isDoctor && selectedDataset !== 'brain-tumor') {
      setRestrictionNotice('Access Restricted: Doctor clearance is restricted to Brain MRI imaging only.')
      return
    }

    if (selectedDataset === 'brain-tumor') {
      onSubmit({
        dataset: 'brain-tumor',
        image,
        file: image?.rawFile || file,
        query: text.trim(),
        patientIdx: 1,
      })
    } else if (selectedDataset === 'tcga-lung-cell') {
      onSubmit({
        dataset: 'tcga-lung-cell',
        file: file || text,
        query: text.trim(),
        patientIdx,
      })
    } else if (selectedDataset === 'breast-cancer') {
      onSubmit({
        dataset: 'breast-cancer',
        file: file,
        query: text.trim() || (featureVector ? featureVector.join(', ') : ''),
        patientIdx: 1,
      })
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      {/* User Persona & Clearance Context Banner */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 flex flex-col items-center text-center"
      >
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <GlowBadge>
            {isDoctor
              ? 'USER 1 // CLINICAL DOCTOR'
              : isResearcher
              ? 'USER 2 // RESEARCH SCIENTIST'
              : 'USER 3 // SYSTEM ADMINISTRATOR'}
          </GlowBadge>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider ${
              isDoctor
                ? 'border-teal-500/30 bg-teal-950/40 text-teal-300'
                : isResearcher
                ? 'border-purple-500/30 bg-purple-950/40 text-purple-300'
                : 'border-crimson-500/30 bg-crimson-950/40 text-blush-200'
            }`}
          >
            {isDoctor && <Stethoscope size={12} />}
            {isResearcher && <FlaskConical size={12} />}
            {isAdmin && <ShieldCheck size={12} />}
            <span>
              {isDoctor
                ? 'Clearance: Brain MRI Imaging Only'
                : isResearcher
                ? 'Clearance: Multimodal (Brain MRI, TCGA Lung Genomic, Breast Cancer)'
                : 'Clearance: Full Diagnostic Engines & User Governance'}
            </span>
          </span>
        </div>

        <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold tracking-tight text-mist sm:text-4xl md:text-5xl">
          Hybrid Quantum ML{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(90deg, #ff8fa3 0%, #ff6b85 30%, #d81b40 70%, #ff8fa3 100%)',
            }}
          >
            Diagnostic Suite
          </span>
        </h1>

        <p className="mt-2.5 max-w-xl text-balance font-body text-[13.5px] leading-relaxed text-white/45 sm:text-[14.5px]">
          {isDoctor
            ? 'Select or drop an axial Brain MRI scan to evaluate intracranial neoplasms across 14-Qubit Multi-Observable VQC and classical benchmarks.'
            : 'Execute multimodal quantum-classical diagnostics across Brain MRI scans, 56k TCGA lung expression matrices, and 30-parameter cytometric biopsies.'}
        </p>
      </motion.div>

      {/* Dataset Dropdown & Mode Switcher Bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mb-4 flex w-full max-w-3xl flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        {/* Dataset Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/40">
              Active Dataset:
            </span>
            <button
              type="button"
              onClick={() => setIsDatasetDropdownOpen(!isDatasetDropdownOpen)}
              className="flex items-center gap-2.5 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2 font-display text-xs font-semibold text-mist backdrop-blur-md transition-all hover:border-blush-400/40 hover:bg-white/[0.08] cursor-pointer"
              style={{
                boxShadow: isDatasetDropdownOpen ? '0 0 20px rgba(216,27,64,0.35)' : 'none',
              }}
            >
              {React.createElement(currentDatasetMeta.icon, {
                size: 14,
                className: 'text-blush-300',
              })}
              <span>{currentDatasetMeta.title}</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/60">
                {currentDatasetMeta.badge}
              </span>
              <ChevronDown
                size={14}
                className={`text-white/40 transition-transform duration-200 ${
                  isDatasetDropdownOpen ? 'rotate-180 text-blush-300' : ''
                }`}
              />
            </button>
          </div>

          {/* Dropdown Options Popover */}
          <AnimatePresence>
            {isDatasetDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute left-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-white/12 p-2 shadow-2xl backdrop-blur-xl"
                style={{ background: 'rgba(12,10,15,0.94)' }}
              >
                <div className="p-2 border-b border-white/[0.08]">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    Select Target Pathology Engine
                  </p>
                </div>
                <div className="space-y-1.5 pt-1.5">
                  {DATASETS.map((d) => {
                    const isSelected = d.id === selectedDataset
                    const isLockedForRole = isDoctor && !d.allowedForDoctor
                    const IconComponent = d.icon

                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelectDataset(d.id)}
                        className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border border-blush-400/40 bg-crimson-900/40 text-blush-100'
                            : isLockedForRole
                            ? 'opacity-40 hover:bg-white/[0.02] cursor-not-allowed'
                            : 'hover:bg-white/[0.05] text-mist'
                        }`}
                      >
                        <div
                          className={`mt-0.5 rounded-lg p-1.5 ${
                            isSelected
                              ? 'bg-crimson-800/60 text-blush-200'
                              : 'bg-white/[0.06] text-white/50'
                          }`}
                        >
                          <IconComponent size={15} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-display text-[12.5px] font-semibold">
                              {d.title}
                            </span>
                            {isLockedForRole ? (
                              <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[8.5px] font-medium text-amber-300 border border-amber-500/20">
                                <Lock size={10} /> DOCTOR LOCKED
                              </span>
                            ) : (
                              <span className="font-mono text-[9px] uppercase text-white/40">
                                {d.badge}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate font-mono text-[10.5px] text-white/40">
                            {d.subtitle}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Mode Toggle (File Upload vs Alternative Textarea for Genomic/Tabular) */}
        {currentDatasetMeta.category !== 'image' && (
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                inputMode === 'file'
                  ? 'border border-blush-400/40 bg-crimson-900/40 text-blush-100 shadow-[0_0_12px_rgba(216,27,64,0.3)]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <UploadCloud size={12} />
              <span>Primary: File Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('textarea')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                inputMode === 'textarea'
                  ? 'border border-purple-400/40 bg-purple-950/50 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <FileText size={12} />
              <span>Alternative: Raw Data</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Restriction Alert if Doctor clicks locked dataset */}
      {restrictionNotice && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex w-full max-w-3xl items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-3 font-mono text-xs text-amber-200"
        >
          <AlertTriangle size={15} className="flex-shrink-0 text-amber-400" />
          <span>{restrictionNotice}</span>
        </motion.div>
      )}

      {/* Main Diagnostic Command Center Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-3xl"
      >
        {/* Energy Line */}
        <div className="pointer-events-none absolute inset-x-[-4vw] top-1/2 z-0 -translate-y-1/2 sm:inset-x-[-8vw]">
          <div className="relative ml-[62%] mr-0">
            <EnergyLine active={sending} palette="crimson" duration={1.1} />
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleUploadedFiles(e.dataTransfer.files)
          }}
          className="relative z-10 rounded-[28px] border-2 p-5 transition-all duration-300"
          style={{
            borderColor: dragOver
              ? 'rgba(255,143,163,0.55)'
              : focused
              ? 'rgba(216,27,64,0.45)'
              : 'rgba(255,255,255,0.12)',
            background: 'rgba(10,9,12,0.76)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow:
              focused || dragOver
                ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 4px rgba(216,27,64,0.08), 0 20px 60px -20px rgba(216,27,64,0.4)'
                : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 20px 60px -25px rgba(0,0,0,0.6)',
          }}
        >
          {/* Drag Overlay */}
          {dragOver && (
            <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-[22px] border-2 border-dashed border-blush-400/50 bg-crimson-900/20">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-blush-200">
                Drop {currentDatasetMeta.fileTypes} to attach for inference
              </span>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* CASE 1: BRAIN MRI IMAGE PIPELINE */}
          {/* ---------------------------------------------------------------- */}
          {selectedDataset === 'brain-tumor' && (
            <div className="space-y-3.5">
              {/* Presets & Upload Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-white/40">
                  <span>Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleLoadBrainMriPreset('tumor')}
                    className="rounded-lg border border-red-500/30 bg-red-950/30 px-2.5 py-1 text-red-200 hover:border-red-400 hover:text-white transition-colors cursor-pointer"
                  >
                    + Glioblastoma Neoplasm Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadBrainMriPreset('notumor')}
                    className="rounded-lg border border-green-500/30 bg-green-950/30 px-2.5 py-1 text-green-200 hover:border-green-400 hover:text-white transition-colors cursor-pointer"
                  >
                    + Healthy Parenchyma Scan
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-white/60 hover:text-blush-200 hover:border-blush-400/40 transition-colors cursor-pointer"
                >
                  <UploadCloud size={13} />
                  <span>Upload Scan (.jpg / .png)</span>
                </button>
              </div>

              {/* Uploaded Image Preview Card */}
              {image ? (
                <div className="flex items-center justify-between rounded-2xl border border-blush-400/30 bg-crimson-950/30 p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={image.url}
                      alt="Brain MRI scan preview"
                      className="h-16 w-16 rounded-xl border border-white/20 object-cover shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[13.5px] font-semibold text-mist">
                          {image.name}
                        </span>
                        <span className="rounded-full border border-teal-500/30 bg-teal-950/40 px-2 py-0.2 font-mono text-[9px] text-teal-300">
                          14-QUBIT VQC READY
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-white/40">
                        ResNet-50 2048D Extractor · PCA Gatekeeper Active · 4 Classes
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setImage(null)
                      setFile(null)
                      setFileDetails(null)
                    }}
                    className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                /* Drag & Drop Prompt Box */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition-all hover:border-blush-400/40 hover:bg-white/[0.04] cursor-pointer"
                >
                  <div className="mb-2 rounded-full border border-white/10 bg-white/[0.05] p-3 text-white/40 group-hover:text-blush-200 transition-colors">
                    <UploadCloud size={20} />
                  </div>
                  <p className="font-display text-sm font-semibold text-mist">
                    Click to browse or drop an axial Brain MRI scan
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-white/40">
                    Supports JPEG, PNG · Scanned by frozen ResNet-50 feature extractor
                  </p>
                </div>
              )}

              {/* Clinical Query / Notes Input */}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={
                  image
                    ? 'Add clinical observations or neuro-radiology notes (optional)...'
                    : 'Describe clinical symptoms, or click a 1-click sample scan above...'
                }
                rows={2}
                className="w-full resize-none bg-transparent font-body text-[13.5px] leading-relaxed text-mist placeholder:text-white/25 focus:outline-none"
              />
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* CASE 2: TCGA LUNG SQUAMOUS CELL GENOMIC TSV */}
          {/* ---------------------------------------------------------------- */}
          {selectedDataset === 'tcga-lung-cell' && (
            <div className="space-y-3.5">
              {/* Presets & File Upload Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-white/40">
                  <span>1-Click Patients:</span>
                  <button
                    type="button"
                    onClick={() => handleLoadTcgaSample(true)}
                    className="rounded-lg border border-red-500/30 bg-red-950/30 px-2.5 py-1 text-red-200 hover:border-red-400 hover:text-white transition-colors cursor-pointer"
                  >
                    + TCGA Malignant Case (56k Genes)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadTcgaSample(false)}
                    className="rounded-lg border border-green-500/30 bg-green-950/30 px-2.5 py-1 text-green-200 hover:border-green-400 hover:text-white transition-colors cursor-pointer"
                  >
                    + Matched Normal Control (56k Genes)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-950/30 px-3 py-1 font-mono text-[11px] text-purple-200 hover:border-purple-300 transition-colors cursor-pointer"
                >
                  <UploadCloud size={13} />
                  <span>Upload .tsv / .csv</span>
                </button>
              </div>

              {/* PRIMARY FILE VIEW */}
              {inputMode === 'file' ? (
                <div>
                  {fileDetails ? (
                    <div className="rounded-2xl border border-purple-400/30 bg-purple-950/20 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl border border-purple-400/30 bg-purple-900/30 p-2.5 text-purple-300">
                            <Dna size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display text-[13.5px] font-semibold text-mist">
                                {fileDetails.name}
                              </span>
                              <span className="rounded-full border border-teal-500/30 bg-teal-950/40 px-2 py-0.2 font-mono text-[9px] text-teal-300">
                                56,908 GENES DETECTED
                              </span>
                            </div>
                            <p className="font-mono text-[11px] text-white/40">
                              Size: {formatFileSize(fileDetails.size)} · Pre-flight Matrix Verified · 14-Qubit Ready
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setFile(null)
                            setFileDetails(null)
                            setText('')
                          }}
                          className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Multi-Patient Column Inspector */}
                      {detectedPatients.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
                          <div className="flex items-center gap-2 font-mono text-[11px] text-white/50">
                            <UserCheck size={13} className="text-purple-300" />
                            <span>Select Target Patient Column:</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {detectedPatients.map((colName, idx) => {
                              const colIdx = idx + 1
                              const isSelected = patientIdx === colIdx
                              return (
                                <button
                                  key={colName}
                                  type="button"
                                  onClick={() => setPatientIdx(colIdx)}
                                  className={`rounded-lg px-2.5 py-1 font-mono text-[11px] transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border border-purple-400/50 bg-purple-900/50 text-purple-200 font-semibold shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                                      : 'border border-white/5 bg-white/[0.03] text-white/40 hover:text-white/70'
                                  }`}
                                >
                                  Patient #{colIdx} ({colName})
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Drag & Drop Prompt Box for TSV */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition-all hover:border-purple-400/40 hover:bg-white/[0.04] cursor-pointer"
                    >
                      <div className="mb-2 rounded-full border border-white/10 bg-white/[0.05] p-3 text-white/40 group-hover:text-purple-300 transition-colors">
                        <FileSpreadsheet size={20} />
                      </div>
                      <p className="font-display text-sm font-semibold text-mist">
                        Click to browse or drop a TCGA Lung genomic TSV file
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-white/40">
                        Supports standard TCGA 56,908 loci format · Primary tumor & matched normal columns
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* ALTERNATIVE TEXTAREA VIEW */
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10.5px] text-white/40">
                    <span>Raw TSV Matrix Textarea Alternative</span>
                    <span>{text ? `${text.split('\n').length} rows` : 'Empty'}</span>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value)
                      const detected = detectTsvMatrix(e.target.value)
                      if (detected?.columns?.length > 1) {
                        setDetectedPatients(detected.columns.slice(1))
                      }
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="Paste raw TSV content: gene_id\tsample_patient_01\tsample_patient_02\nTP53\t4.82\t0.18..."
                    rows={4}
                    className="w-full resize-none bg-black/30 p-2.5 rounded-xl border border-white/10 font-mono text-[11.5px] leading-relaxed text-purple-100 placeholder:text-white/25 focus:outline-none focus:border-purple-400/40"
                  />
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* CASE 3: BREAST CANCER CYTOMETRIC TABULAR CSV */}
          {/* ---------------------------------------------------------------- */}
          {selectedDataset === 'breast-cancer' && (
            <div className="space-y-3.5">
              {/* Presets & File Upload Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-white/40">
                  <span>1-Click Biopsy:</span>
                  <button
                    type="button"
                    onClick={() => handleLoadBreastCancerSample('malignant')}
                    className="rounded-lg border border-red-500/30 bg-red-950/30 px-2.5 py-1 text-red-200 hover:border-red-400 hover:text-white transition-colors cursor-pointer"
                  >
                    + Malignant FNA Biopsy (30 Features)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadBreastCancerSample('benign')}
                    className="rounded-lg border border-green-500/30 bg-green-950/30 px-2.5 py-1 text-green-200 hover:border-green-400 hover:text-white transition-colors cursor-pointer"
                  >
                    + Benign FNA Biopsy (30 Features)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-950/30 px-3 py-1 font-mono text-[11px] text-purple-200 hover:border-purple-300 transition-colors cursor-pointer"
                >
                  <UploadCloud size={13} />
                  <span>Upload .csv File</span>
                </button>
              </div>

              {/* PRIMARY FILE VIEW */}
              {inputMode === 'file' ? (
                <div>
                  {fileDetails ? (
                    <div className="rounded-2xl border border-purple-400/30 bg-purple-950/20 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl border border-purple-400/30 bg-purple-900/30 p-2.5 text-purple-300">
                            <Sliders size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display text-[13.5px] font-semibold text-mist">
                                {fileDetails.name}
                              </span>
                              <span className="rounded-full border border-teal-500/30 bg-teal-950/40 px-2 py-0.2 font-mono text-[9px] text-teal-300">
                                30 PARAMETERS ACTIVE
                              </span>
                            </div>
                            <p className="font-mono text-[11px] text-white/40">
                              Size: {formatFileSize(fileDetails.size)} · Nuclear Morphological Metrics Loaded
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setFile(null)
                            setFileDetails(null)
                            setText('')
                            setFeatureVector(null)
                          }}
                          className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Drag & Drop Prompt Box for CSV */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition-all hover:border-purple-400/40 hover:bg-white/[0.04] cursor-pointer"
                    >
                      <div className="mb-2 rounded-full border border-white/10 bg-white/[0.05] p-3 text-white/40 group-hover:text-purple-300 transition-colors">
                        <Sliders size={20} />
                      </div>
                      <p className="font-display text-sm font-semibold text-mist">
                        Click to browse or drop a Breast Cancer CSV file
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-white/40">
                        Supports 30 nuclear morphology parameters · Radius, texture, concavity, symmetry
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* ALTERNATIVE TEXTAREA VIEW */
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder='Paste 30 comma-separated features: 17.99, 10.38, 122.8, 1001.0, 0.1184...'
                  rows={3}
                  className="w-full resize-none bg-black/30 p-2.5 rounded-xl border border-white/10 font-mono text-[11.5px] leading-relaxed text-purple-100 placeholder:text-white/25 focus:outline-none focus:border-purple-400/40"
                />
              )}

              {/* Feature Matrix Validation Preview */}
              {featureVector && (
                <div className="rounded-xl border border-purple-400/25 bg-purple-950/20 p-3">
                  <div className="mb-2 flex items-center justify-between font-mono text-[10.5px]">
                    <span className="flex items-center gap-1.5 text-purple-300 font-semibold uppercase">
                      <CheckCircle2 size={13} className="text-teal-400" />
                      30 / 30 Cytometric Parameters Verified
                    </span>
                    <span className="text-white/40">Standard Breast Cancer Schema</span>
                  </div>

                  {/* Scrollable mini-grid of features */}
                  <div className="max-h-20 overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5 font-mono text-[10px]">
                      {BREAST_CANCER_COLUMNS.map((col, idx) => (
                        <div
                          key={col}
                          className="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1 border border-white/5"
                        >
                          <span className="truncate text-white/40 mr-1" title={col}>
                            {col.replace('_mean', '').replace('_worst', '_w').replace('_se', '_se')}
                          </span>
                          <span className="font-semibold text-purple-200">
                            {featureVector[idx]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hidden File Input Picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept={currentDatasetMeta.fileTypes}
            className="hidden"
            onChange={(e) => handleUploadedFiles(e.target.files)}
          />

          {/* Bottom Bar: Action Trigger & Pre-flight Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06] mt-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="font-mono text-[10.5px] text-white/40">
                {selectedDataset === 'brain-tumor'
                  ? image
                    ? 'Axial Brain MRI scan loaded & pre-screened'
                    : 'Awaiting Brain MRI scan upload or preset'
                  : selectedDataset === 'tcga-lung-cell'
                  ? file || text
                    ? `TCGA Matrix Loaded · Patient #${patientIdx} Selected`
                    : 'Awaiting 56k TCGA Lung TSV data'
                  : featureVector || file
                  ? '30-dimensional cytometric biopsy loaded'
                  : 'Awaiting 30 cytometric parameters'}
              </span>
            </div>

            <div className="ml-auto">
              <motion.button
                whileHover={canSend ? { scale: 1.05 } : {}}
                whileTap={canSend ? { scale: 0.94 } : {}}
                onClick={handleSend}
                disabled={!canSend}
                className="flex h-11 items-center gap-2 rounded-full px-5 font-display text-[13px] font-semibold uppercase tracking-wider transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                style={{
                  background: canSend
                    ? 'linear-gradient(135deg, #fff2f4 0%, #ffd9e0 100%)'
                    : 'rgba(255,255,255,0.06)',
                  color: canSend ? '#7a0e28' : 'rgba(255,255,255,0.3)',
                  boxShadow: canSend ? '0 0 24px -2px rgba(255,143,163,0.6)' : 'none',
                }}
              >
                {sending ? (
                  <>
                    <Sparkles size={16} className="animate-spin text-crimson-700" />
                    <span>Inference In Progress...</span>
                  </>
                ) : (
                  <>
                    <span>Run Quantum ML</span>
                    <ArrowUp size={16} strokeWidth={2.5} />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Global Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex max-w-xl items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 p-3 font-mono text-[12px] text-red-300"
        >
          <AlertTriangle size={15} className="flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  )
}
