/**
 * Sample Patient Datasets & Generators for 1-Click Interactive Clinical Testing.
 * Provides real formatted data for:
 * 1. TCGA Lung Squamous Cell Carcinoma (56,908 Genomic Features, TSV)
 * 2. Breast Cancer Cytometric FNA Biopsy (30 Parameters, CSV/TSV)
 * 3. Brain MRI Medical Scan (Synthetic Canvas Radiograph Blob)
 */

export const BREAST_CANCER_COLUMNS = [
  'radius_mean', 'texture_mean', 'perimeter_mean', 'area_mean', 'smoothness_mean',
  'compactness_mean', 'concavity_mean', 'concave points_mean', 'symmetry_mean', 'fractal_dimension_mean',
  'radius_se', 'texture_se', 'perimeter_se', 'area_se', 'smoothness_se',
  'compactness_se', 'concavity_se', 'concave points_se', 'symmetry_se', 'fractal_dimension_se',
  'radius_worst', 'texture_worst', 'perimeter_worst', 'area_worst', 'smoothness_worst',
  'compactness_worst', 'concavity_worst', 'concave points_worst', 'symmetry_worst', 'fractal_dimension_worst'
]

export const SAMPLE_MALIGNANT_FEATURES = [
  17.99, 10.38, 122.8, 1001.0, 0.1184, 0.2776, 0.3001, 0.1471, 0.2419, 0.07871,
  1.095, 0.9053, 8.589, 153.4, 0.006399, 0.04904, 0.05373, 0.01587, 0.03003, 0.006193,
  25.38, 17.33, 184.6, 2019.0, 0.1622, 0.6656, 0.7119, 0.2654, 0.4601, 0.1189
]

export const SAMPLE_BENIGN_FEATURES = [
  13.54, 14.36, 87.46, 566.3, 0.09779, 0.08129, 0.06664, 0.04781, 0.1885, 0.05766,
  0.2699, 0.7886, 2.058, 23.56, 0.008462, 0.0146, 0.02387, 0.01315, 0.0198, 0.0023,
  15.11, 19.26, 99.7, 711.2, 0.144, 0.1773, 0.239, 0.1288, 0.2977, 0.07259
]

/**
 * Generates a valid TSV string for TCGA Lung Squamous Cell Carcinoma.
 * Contains the required 56,908 rows with prominent oncogenes at the top
 * and two patient columns for multi-patient testing.
 */
export function generateSampleTcgaLungTsv(tumorPattern = true) {
  const header = "gene_id\tsample_patient_01\tsample_patient_02\ncomment\tprimary_tumor\tmatched_normal\n"
  const prominentGenes = [
    { gene: "TP53", tVal: 4.82, nVal: 0.18 },
    { gene: "CDKN2A", tVal: 3.95, nVal: 0.24 },
    { gene: "SOX2", tVal: 5.12, nVal: 0.12 },
    { gene: "EGFR", tVal: 3.41, nVal: 0.35 },
    { gene: "PIK3CA", tVal: 2.89, nVal: 0.42 },
    { gene: "NFE2L2", tVal: 3.15, nVal: 0.28 },
    { gene: "KEAP1", tVal: 2.74, nVal: 0.51 },
    { gene: "KMT2D", tVal: 3.08, nVal: 0.39 },
  ]

  const rows = []
  prominentGenes.forEach((g) => {
    rows.push(`${g.gene}\t${tumorPattern ? g.tVal : g.nVal}\t${g.nVal}`)
  })

  // Fill the remaining genes up to 56,908 loci
  for (let i = prominentGenes.length; i < 56908; i++) {
    const val1 = (Math.sin(i * 0.123) * 0.5 + 0.5).toFixed(3)
    const val2 = (Math.cos(i * 0.456) * 0.4 + 0.5).toFixed(3)
    rows.push(`GENE_${i}\t${val1}\t${val2}`)
  }

  return header + rows.join("\n") + "\n"
}

/**
 * Generates synthetic Brain MRI scan canvas data for 1-click testing.
 */
export function createBrainMriPresetBlob(type = 'tumor') {
  const canvas = document.createElement('canvas')
  canvas.width = 224
  canvas.height = 224
  const ctx = canvas.getContext('2d')

  // Dark medical background
  ctx.fillStyle = '#050406'
  ctx.fillRect(0, 0, 224, 224)

  // Skull & Scalp contour
  ctx.strokeStyle = '#2d3748'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.ellipse(112, 112, 86, 96, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Brain parenchyma background
  const brainGrad = ctx.createRadialGradient(112, 112, 20, 112, 112, 85)
  brainGrad.addColorStop(0, '#5a6578')
  brainGrad.addColorStop(0.75, '#333e52')
  brainGrad.addColorStop(1, '#1a202c')
  ctx.fillStyle = brainGrad
  ctx.beginPath()
  ctx.ellipse(112, 112, 82, 92, 0, 0, Math.PI * 2)
  ctx.fill()

  // Ventricles (CSF - darker)
  ctx.fillStyle = '#0f141c'
  ctx.beginPath()
  ctx.ellipse(98, 108, 10, 26, -0.2, 0, Math.PI * 2)
  ctx.ellipse(126, 108, 10, 26, 0.2, 0, Math.PI * 2)
  ctx.fill()

  // Interhemispheric fissure line
  ctx.strokeStyle = '#1a202c'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(112, 24)
  ctx.lineTo(112, 200)
  ctx.stroke()

  // Tumor mass hyperintensity (if tumor case)
  if (type === 'tumor') {
    const tumorGrad = ctx.createRadialGradient(78, 88, 4, 78, 88, 28)
    tumorGrad.addColorStop(0, '#ffffff')
    tumorGrad.addColorStop(0.5, '#cbd5e1')
    tumorGrad.addColorStop(0.85, '#94a3b8')
    tumorGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = tumorGrad
    ctx.beginPath()
    ctx.arc(78, 88, 28, 0, Math.PI * 2)
    ctx.fill()
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({
        url: URL.createObjectURL(blob),
        name: type === 'tumor' ? 'preset_brain_mri_glioma.jpg' : 'preset_brain_mri_notumor.jpg',
        rawFile: blob,
      })
    }, 'image/jpeg', 0.95)
  })
}
