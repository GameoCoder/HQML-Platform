// Central place for demo-mode data. Every value here is placeholder /
// simulated data used until the WebSocket backend is wired up — see
// src/lib/pipelineEvents.js for the event shapes this will eventually
// receive over the wire.

export const MODELS = [
  {
    id: 'rf',
    short: 'RF',
    name: 'Random Forest',
    subtitle: 'Classical Ensemble Classifier',
    demoDuration: 2600,
  },
  {
    id: 'svm',
    short: 'SVM',
    name: 'Support Vector Machine',
    subtitle: 'Classical Kernel Classifier',
    demoDuration: 3400,
  },
  {
    id: 'nn',
    short: 'NN',
    name: 'Neural Network',
    subtitle: 'Deep Multi-Layer Perceptron',
    demoDuration: 4100,
  },
  {
    id: 'qml',
    short: 'QML',
    name: 'Quantum ML (VQC)',
    subtitle: '14-Qubit Variational Quantum Circuit',
    demoDuration: 4800,
  },
]

export const DEMO_BACKEND_LATENCY_MS = 1240

export const DEMO_RESULT = {
  diagnosis: 'Possible diagnosis: Benign pulmonary pattern',
  headline: 'Benign pulmonary pattern',
  confidence: 0.912,
  predictions: [
    { model: 'RF', label: 'Benign pattern', confidence: 0.89 },
    { model: 'SVM', label: 'Benign pattern', confidence: 0.86 },
    { model: 'NN', label: 'Benign, low nodularity', confidence: 0.94 },
    { model: 'QML', label: 'Benign quantum state', confidence: 0.92 },
  ],
  fullDiagnosis: [
    'No evidence of focal consolidation, pleural effusion, or pneumothorax was identified across the submitted imaging.',
    'A small, well-circumscribed opacity in the right lower lobe is most consistent with a benign granuloma given its density and stable margins.',
    'Cardiac silhouette and mediastinal contours remain within normal limits for the patient\u2019s reported age range.',
    'No acute osseous abnormality is seen in the visualized thoracic skeleton.',
    'Recommend routine follow-up imaging in 12 months to confirm long-term stability of the noted opacity.',
  ],
  ragSummary:
    'Cross-referencing 42 peer-reviewed radiology reports and 3 clinical guidelines, the retrieval-augmented pipeline found strong agreement that isolated, well-circumscribed pulmonary opacities under 8mm with stable morphology carry a low probability of malignancy. Similar historical cases were most often resolved as calcified granulomas of infectious origin. No red-flag features (spiculation, rapid growth, associated lymphadenopathy) were detected in the current study.',
  metrics: [
    { model: 'RF', accuracy: 0.891, f1: 0.874, precision: 0.882, recall: 0.867, learningTime: 12.4, predictionTime: 0.18 },
    { model: 'SVM', accuracy: 0.863, f1: 0.851, precision: 0.86, recall: 0.842, learningTime: 8.1, predictionTime: 0.09 },
    { model: 'NN', accuracy: 0.936, f1: 0.929, precision: 0.933, recall: 0.925, learningTime: 46.7, predictionTime: 0.24 },
    { model: 'QML', accuracy: 0.924, f1: 0.918, precision: 0.921, recall: 0.915, learningTime: 62.3, predictionTime: 0.46 },
  ],
  keywords: [
    {
      term: 'Granuloma',
      definition:
        'A small cluster of immune cells that forms when the body walls off something it can\u2019t fully clear, such as an old infection. Often harmless and stable over time.',
    },
    {
      term: 'Opacity',
      definition:
        'An area on an imaging scan that appears denser than surrounding tissue. It simply means "something shows up here" — not necessarily something harmful.',
    },
    {
      term: 'Pleural Effusion',
      definition:
        'A build-up of fluid around the lungs. Its absence here is a good sign, ruling out one common cause of breathing discomfort.',
    },
    {
      term: 'Spiculation',
      definition:
        'Spiky, irregular edges on a nodule seen in imaging. This pattern raises concern for malignancy — the current scan shows none.',
    },
    {
      term: 'Lymphadenopathy',
      definition:
        'Enlargement of the lymph nodes, which can signal the immune system responding to something nearby. None was observed in this case.',
    },
    {
      term: 'Mediastinum',
      definition:
        'The central compartment of the chest, between the lungs, containing the heart, major vessels, and airways.',
    },
  ],
}

// Learning-time vs accuracy series for the Overview chart.
export const LEARNING_CURVE = {
  RF: [
    { t: 0, accuracy: 0.52 }, { t: 2, accuracy: 0.68 }, { t: 4, accuracy: 0.77 },
    { t: 6, accuracy: 0.83 }, { t: 8, accuracy: 0.87 }, { t: 12, accuracy: 0.891 },
  ],
  SVM: [
    { t: 0, accuracy: 0.49 }, { t: 2, accuracy: 0.61 }, { t: 4, accuracy: 0.72 },
    { t: 6, accuracy: 0.79 }, { t: 8, accuracy: 0.863 },
  ],
  NN: [
    { t: 0, accuracy: 0.41 }, { t: 6, accuracy: 0.6 }, { t: 14, accuracy: 0.74 },
    { t: 24, accuracy: 0.84 }, { t: 36, accuracy: 0.9 }, { t: 47, accuracy: 0.936 },
  ],
  QML: [
    { t: 0, accuracy: 0.45 }, { t: 8, accuracy: 0.62 }, { t: 18, accuracy: 0.76 },
    { t: 32, accuracy: 0.85 }, { t: 48, accuracy: 0.89 }, { t: 62, accuracy: 0.924 },
  ],
}

export const MODEL_COLORS = {
  RF: '#ff8fa3',
  SVM: '#d81b40',
  NN: '#22e096',
  QML: '#a855f7',
  rf: '#ff8fa3',
  svm: '#d81b40',
  nn: '#22e096',
  qml: '#a855f7',
}
