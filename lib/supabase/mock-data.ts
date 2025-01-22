// Mock evaluations data with comprehensive details
export const mockEvaluations = [
  {
    id: "eval-1",
    title: "Evaluación Anual de Calidad 2024",
    description: "Evaluación completa de estándares de calidad y procesos",
    type: "performance",
    vendor_id: "vendor-1",
    evaluator_id: "user-1",
    evaluator_name: "Juan Pérez",
    evaluator_role: "Gerente de Calidad",
    start_date: "2024-01-15T00:00:00Z",
    end_date: "2024-02-15T23:59:59Z",
    status: "active",
    score: 92,
    is_anonymous: false,
    created_at: "2024-01-14T10:00:00Z",
    updated_at: "2024-01-15T15:30:00Z",
    categories: [
      {
        name: "Calidad del Producto",
        score: 95,
        weight: 0.4,
        comments: "Excelente control de calidad en todos los procesos"
      },
      {
        name: "Tiempo de Entrega",
        score: 88,
        weight: 0.3,
        comments: "Algunas demoras menores en entregas urgentes"
      },
      {
        name: "Servicio al Cliente",
        score: 94,
        weight: 0.3,
        comments: "Muy buena atención y respuesta a incidencias"
      }
    ],
    comments: [
      {
        author: "Juan Pérez",
        date: "2024-01-16T09:00:00Z",
        text: "El proveedor ha mostrado una mejora significativa en sus procesos"
      }
    ]
  },
  {
    id: "eval-2",
    title: "Evaluación de Sostenibilidad Q1",
    description: "Análisis de prácticas sostenibles y responsabilidad ambiental",
    type: "sustainability",
    vendor_id: "vendor-2",
    evaluator_id: "user-2",
    evaluator_name: "Ana García",
    evaluator_role: "Especialista en Sostenibilidad",
    start_date: "2024-02-01T00:00:00Z",
    end_date: "2024-02-29T23:59:59Z",
    status: "draft",
    score: null,
    is_anonymous: true,
    created_at: "2024-01-25T09:00:00Z",
    updated_at: "2024-01-25T09:00:00Z",
    categories: [
      {
        name: "Gestión Ambiental",
        score: null,
        weight: 0.5,
        comments: "Pendiente de evaluación"
      },
      {
        name: "Eficiencia Energética",
        score: null,
        weight: 0.3,
        comments: "Pendiente de evaluación"
      },
      {
        name: "Gestión de Residuos",
        score: null,
        weight: 0.2,
        comments: "Pendiente de evaluación"
      }
    ],
    comments: []
  },
  {
    id: "eval-3",
    title: "Evaluación de Seguridad y Cumplimiento",
    description: "Revisión de protocolos de seguridad y cumplimiento normativo",
    type: "compliance",
    vendor_id: "vendor-3",
    evaluator_id: "user-3",
    evaluator_name: "Carlos Martínez",
    evaluator_role: "Auditor de Seguridad",
    start_date: "2024-01-10T00:00:00Z",
    end_date: "2024-01-20T23:59:59Z",
    status: "completed",
    score: 87,
    is_anonymous: false,
    created_at: "2024-01-09T08:00:00Z",
    updated_at: "2024-01-20T16:45:00Z",
    categories: [
      {
        name: "Seguridad Laboral",
        score: 90,
        weight: 0.4,
        comments: "Cumplimiento satisfactorio de normativas de seguridad"
      },
      {
        name: "Documentación",
        score: 85,
        weight: 0.3,
        comments: "Algunos documentos requieren actualización"
      },
      {
        name: "Protocolos de Emergencia",
        score: 86,
        weight: 0.3,
        comments: "Procedimientos bien definidos pero requieren más simulacros"
      }
    ],
    comments: [
      {
        author: "Carlos Martínez",
        date: "2024-01-20T16:00:00Z",
        text: "Se recomienda actualizar el plan de emergencias"
      }
    ]
  },
  {
    id: "eval-4",
    title: "Evaluación de Calidad de Materiales",
    description: "Análisis detallado de la calidad de materias primas",
    type: "quality",
    vendor_id: "vendor-4",
    evaluator_id: "user-2",
    evaluator_name: "Ana García",
    evaluator_role: "Especialista en Calidad",
    start_date: "2024-01-05T00:00:00Z",
    end_date: "2024-01-15T23:59:59Z",
    status: "completed",
    score: 95,
    is_anonymous: false,
    created_at: "2024-01-04T10:00:00Z",
    updated_at: "2024-01-15T17:30:00Z",
    categories: [
      {
        name: "Calidad de Materiales",
        score: 96,
        weight: 0.5,
        comments: "Excelente calidad en todas las muestras analizadas"
      },
      {
        name: "Certificaciones",
        score: 94,
        weight: 0.3,
        comments: "Todas las certificaciones vigentes y actualizadas"
      },
      {
        name: "Trazabilidad",
        score: 95,
        weight: 0.2,
        comments: "Sistema de trazabilidad robusto y bien documentado"
      }
    ],
    comments: [
      {
        author: "Ana García",
        date: "2024-01-15T16:00:00Z",
        text: "Proveedor excepcional en términos de calidad"
      }
    ]
  },
  {
    id: "eval-5",
    title: "Evaluación de Riesgos Operativos",
    description: "Análisis de riesgos en la cadena de suministro",
    type: "risk",
    vendor_id: "vendor-5",
    evaluator_id: "user-1",
    evaluator_name: "Juan Pérez",
    evaluator_role: "Analista de Riesgos",
    start_date: "2024-01-20T00:00:00Z",
    end_date: "2024-02-20T23:59:59Z",
    status: "active",
    score: 78,
    is_anonymous: false,
    created_at: "2024-01-19T14:00:00Z",
    updated_at: "2024-01-25T11:45:00Z",
    categories: [
      {
        name: "Riesgos Financieros",
        score: 75,
        weight: 0.4,
        comments: "Algunos indicadores financieros requieren atención"
      },
      {
        name: "Riesgos Operativos",
        score: 80,
        weight: 0.3,
        comments: "Plan de contingencia adecuado pero mejorable"
      },
      {
        name: "Riesgos de Cumplimiento",
        score: 80,
        weight: 0.3,
        comments: "Cumplimiento satisfactorio de requisitos regulatorios"
      }
    ],
    comments: [
      {
        author: "Juan Pérez",
        date: "2024-01-25T11:00:00Z",
        text: "Se requiere plan de acción para mitigar riesgos financieros"
      }
    ]
  }
];

// Evaluation types
export const evaluationTypes = [
  { id: 'performance', name: 'Evaluación de Desempeño' },
  { id: 'sustainability', name: 'Evaluación de Sostenibilidad' },
  { id: 'compliance', name: 'Evaluación de Cumplimiento' },
  { id: 'quality', name: 'Evaluación de Calidad' },
  { id: 'risk', name: 'Evaluación de Riesgos' }
];

// Question types
export const questionTypes = [
  { id: 'rating_5', name: 'Escala 1-5', scale: 5 },
  { id: 'rating_10', name: 'Escala 1-10', scale: 10 },
  { id: 'yes_no', name: 'Sí/No' },
  { id: 'multiple_choice', name: 'Opción Múltiple', allowsMultiple: false },
  { id: 'multiple_answer', name: 'Selección Múltiple', allowsMultiple: true },
  { id: 'text_short', name: 'Texto Corto' },
  { id: 'text_long', name: 'Texto Largo' }
];