// Types for mock data
interface Profile {
  id: string;
  company_name: string;
  contact_email: string;
  role: string;
  is_active: boolean;
  contact_phone: string;
  created_at: string;
  last_login: string;
  department: string;
  avatar_url: string;
  business_details: {
    address: string;
    position: string;
  };
}

interface User {
  id: string;
  email: string;
  password: string;
  profile: Profile;
}

interface Vendor {
  id: string;
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  category: string;
  status: string;
  rating: number;
  created_at: string;
  updated_at: string;
  compliance_score: number;
  risk_level: string;
  evaluations_count: number;
  last_evaluation_date: string;
  [key: string]: string | number | boolean | null | undefined; // Index signature for dynamic access
}

interface Category {
  name: string;
  score: number | null;
  weight: number;
  comments: string;
}

interface Comment {
  author: string;
  date: string;
  text: string;
}

interface Question {
  id: string;
  evaluation_id?: string;
  type: string;
  text: string;
  required: boolean;
  weight: number;
  order: number;
  category?: string;
  options: Record<string, any>;
}

interface Evaluation {
  id: string;
  title: string;
  description: string;
  type: string;
  vendor_id: string;
  evaluator_id: string;
  evaluator_name: string;
  evaluator_role: string;
  start_date: string;
  end_date: string;
  status: string;
  score: number | null;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  categories: Category[];
  comments: Comment[];
  settings: {
    allow_partial_save: boolean;
    require_comments: boolean;
    show_progress: boolean;
    notify_on_submit: boolean;
  };
  questions: Question[];
  [key: string]: string | number | boolean | null | undefined | Category[] | Comment[] | Question[] | { allow_partial_save: boolean; require_comments: boolean; show_progress: boolean; notify_on_submit: boolean; }; // Index signature for dynamic access
}

interface Recommendation {
  id: string;
  evaluation_id: string;
  vendor_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_to: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  category: string;
  impact: string;
  effort: string;
  comments: Comment[];
  [key: string]: string | Comment[]; // Index signature for dynamic access
}

// Mock user data for testing
export const mockUsers: User[] = [
  {
    id: "user-1",
    email: "sofia.rodriguez@empresa.com",
    password: "password123",
    profile: {
      id: "user-1",
      company_name: "Tech Solutions SA",
      contact_email: "sofia.rodriguez@empresa.com",
      role: "admin",
      is_active: true,
      contact_phone: "+34 612 345 678",
      created_at: "2023-06-15T08:30:00Z",
      last_login: "2024-01-22T09:15:00Z",
      department: "Tecnología",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
      business_details: {
        address: "Calle Innovación 123, Madrid",
        position: "Directora de Tecnología"
      }
    }
  },
  {
    id: "user-2",
    email: "ahmed.hassan@empresa.com",
    password: "password123",
    profile: {
      id: "user-2",
      company_name: "Tech Solutions SA",
      contact_email: "ahmed.hassan@empresa.com",
      role: "evaluator",
      is_active: true,
      contact_phone: "+34 623 456 789",
      created_at: "2023-08-20T10:00:00Z",
      last_login: "2024-01-21T16:45:00Z",
      department: "Calidad",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      business_details: {
        address: "Calle Innovación 123, Madrid",
        position: "Gerente de Calidad"
      }
    }
  },
  {
    id: "user-3",
    email: "maria.garcia@empresa.com",
    password: "password123",
    profile: {
      id: "user-3",
      company_name: "Tech Solutions SA",
      contact_email: "maria.garcia@empresa.com",
      role: "evaluator",
      is_active: true,
      contact_phone: "+34 634 567 890",
      created_at: "2023-09-05T09:15:00Z",
      last_login: "2024-01-22T11:30:00Z",
      department: "Operaciones",
      avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
      business_details: {
        address: "Calle Innovación 123, Madrid",
        position: "Supervisora de Operaciones"
      }
    }
  },
  {
    id: "user-4",
    email: "jun.chen@empresa.com",
    password: "password123",
    profile: {
      id: "user-4",
      company_name: "Tech Solutions SA",
      contact_email: "jun.chen@empresa.com",
      role: "supplier",
      is_active: true,
      contact_phone: "+34 645 678 901",
      created_at: "2023-10-12T14:20:00Z",
      last_login: "2024-01-20T09:00:00Z",
      department: "Logística",
      avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
      business_details: {
        address: "Calle Innovación 123, Madrid",
        position: "Coordinador de Logística"
      }
    }
  },
  {
    id: "user-5",
    email: "isabella.rossi@empresa.com",
    password: "password123",
    profile: {
      id: "user-5",
      company_name: "Tech Solutions SA",
      contact_email: "isabella.rossi@empresa.com",
      role: "admin",
      is_active: true,
      contact_phone: "+34 656 789 012",
      created_at: "2023-07-01T11:45:00Z",
      last_login: "2024-01-22T08:30:00Z",
      department: "Administración",
      avatar_url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
      business_details: {
        address: "Calle Innovación 123, Madrid",
        position: "Directora Administrativa"
      }
    }
  },
  {
    id: "user-6",
    email: "carlos.mendoza@empresa.com",
    password: "password123",
    profile: {
      id: "user-6",
      company_name: "Tech Solutions SA",
      contact_email: "carlos.mendoza@empresa.com",
      role: "evaluator",
      is_active: false,
      contact_phone: "+34 667 890 123",
      created_at: "2023-11-15T16:00:00Z",
      last_login: "2023-12-15T14:20:00Z",
      department: "Compras",
      avatar_url: "https://images.unsplash.com/photo-1463453091185-61582044d556",
      business_details: {
        address: "Calle Innovación 123, Madrid",
        position: "Analista de Compras"
      }
    }
  },
  {
    id: "user-7",
    email: "emma.schmidt@empresa.com",
    password: "password123",
    profile: {
      id: "user-7",
      company_name: "Tech Solutions SA",
      contact_email: "emma.schmidt@empresa.com",
      role: "supplier",
      is_active: true,
      contact_phone: "+34 678 901 234",
      created_at: "2023-12-01T09:30:00Z",
      last_login: "2024-01-21T10:15:00Z",
      department: "Producción",
      avatar_url: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb",
      business_details: {
        address: "Calle Innovación 123, Madrid",
        position: "Supervisora de Producción"
      }
    }
  },
  {
    id: "user-8",
    email: "yuki.tanaka@empresa.com",
    password: "password123",
    profile: {
      id: "user-8",
      company_name: "Tech Solutions SA",
      contact_email: "yuki.tanaka@empresa.com",
      role: "evaluator",
      is_active: true,
      contact_phone: "+34 689 012 345",
      created_at: "2023-09-20T13:15:00Z",
      last_login: "2024-01-22T13:45:00Z",
      department: "Calidad",
      avatar_url: "https://images.unsplash.com/photo-1479936343636-73cdc5aae0c3",
      business_details: {
        address: "Calle Innovación 123, Madrid",
        position: "Auditora de Calidad"
      }
    }
  },
  {
    id: "user-9",
    email: "aisha.patel@empresa.com",
    password: "password123",
    profile: {
      id: "user-9",
      company_name: "Tech Solutions SA",
      contact_email: "aisha.patel@empresa.com",
      role: "supplier",
      is_active: false,
      contact_phone: "+34 690 123 456",
      created_at: "2023-08-10T10:45:00Z",
      last_login: "2023-12-20T11:30:00Z",
      department: "Logística",
      avatar_url: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df",
      business_details: {
        address: "Calle Innovación 123, Madrid",
        position: "Coordinadora de Envíos"
      }
    }
  },
  {
    id: "user-10",
    email: "luis.silva@empresa.com",
    password: "password123",
    profile: {
      id: "user-10",
      company_name: "Tech Solutions SA",
      contact_email: "luis.silva@empresa.com",
      role: "admin",
      is_active: true,
      contact_phone: "+34 601 234 567",
      created_at: "2023-05-15T08:00:00Z",
      last_login: "2024-01-22T14:00:00Z",
      department: "Dirección",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      business_details: {
        address: "Calle Innovación 123, Madrid",
        position: "Director General"
      }
    }
  }
];

// Mock vendors data
export const mockVendors: Vendor[] = [
  {
    id: "vendor-1",
    name: "Tecnología Avanzada S.L.",
    description: "Proveedor líder de soluciones tecnológicas",
    contact_email: "contacto@tecavanzada.com",
    contact_phone: "+34 912 345 678",
    address: "Calle Tecnología 45, Madrid",
    category: "Tecnología",
    status: "active",
    rating: 4.5,
    created_at: "2023-01-15T08:00:00Z",
    updated_at: "2024-01-20T16:30:00Z",
    compliance_score: 92,
    risk_level: "bajo",
    evaluations_count: 15,
    last_evaluation_date: "2024-01-15T00:00:00Z"
  },
  {
    id: "vendor-2",
    name: "Suministros Industriales García",
    description: "Distribuidor de equipamiento industrial",
    contact_email: "ventas@suministrosgarcia.es",
    contact_phone: "+34 913 456 789",
    address: "Avenida Industrial 78, Barcelona",
    category: "Industrial",
    status: "active",
    rating: 4.2,
    created_at: "2023-02-20T09:30:00Z",
    updated_at: "2024-01-18T14:45:00Z",
    compliance_score: 88,
    risk_level: "medio",
    evaluations_count: 12,
    last_evaluation_date: "2024-01-10T00:00:00Z"
  },
  {
    id: "vendor-3",
    name: "Logística Rápida Express",
    description: "Servicios logísticos y de transporte",
    contact_email: "info@logisticarapida.com",
    contact_phone: "+34 914 567 890",
    address: "Polígono Logístico 23, Valencia",
    category: "Logística",
    status: "active",
    rating: 4.0,
    created_at: "2023-03-10T10:15:00Z",
    updated_at: "2024-01-19T11:20:00Z",
    compliance_score: 85,
    risk_level: "medio",
    evaluations_count: 10,
    last_evaluation_date: "2024-01-05T00:00:00Z"
  },
  {
    id: "vendor-4",
    name: "Materiales Construcción Pérez",
    description: "Proveedor de materiales de construcción",
    contact_email: "pedidos@materialesperez.es",
    contact_phone: "+34 915 678 901",
    address: "Carretera Industrial 56, Sevilla",
    category: "Construcción",
    status: "inactive",
    rating: 3.8,
    created_at: "2023-04-05T11:45:00Z",
    updated_at: "2024-01-15T09:30:00Z",
    compliance_score: 78,
    risk_level: "alto",
    evaluations_count: 8,
    last_evaluation_date: "2023-12-20T00:00:00Z"
  },
  {
    id: "vendor-5",
    name: "Servicios Limpieza Martínez",
    description: "Servicios profesionales de limpieza",
    contact_email: "contacto@limpiezamartinez.com",
    contact_phone: "+34 916 789 012",
    address: "Calle Servicios 34, Málaga",
    category: "Servicios",
    status: "active",
    rating: 4.3,
    created_at: "2023-05-15T13:20:00Z",
    updated_at: "2024-01-21T15:40:00Z",
    compliance_score: 90,
    risk_level: "bajo",
    evaluations_count: 14,
    last_evaluation_date: "2024-01-18T00:00:00Z"
  }
];

// Mock evaluations data with comprehensive details
export const mockEvaluations: Evaluation[] = [
  {
    id: "eval-1",
    title: "Evaluación Cumplimiento Ley Datos Personales",
    description: "Evaluación completa de estándares de calidad y procesos",
    type: "performance",
    vendor_id: "vendor-1",
    evaluator_id: "user-1",
    evaluator_name: "Juan Pérez",
    evaluator_role: "Gerente de Calidad",
    start_date: "2025-01-15T00:00:00Z",
    end_date: "2025-02-15T23:59:59Z",
    status: "active",
    score: 92,
    is_anonymous: false,
    created_at: "2025-01-14T10:00:00Z",
    updated_at: "2025-01-15T15:30:00Z",
    categories: [
      {
        name: "Derechos de acceso",
        score: 95,
        weight: 0.4,
        comments: "Excelente control de calidad en todos los procesos"
      },
      {
        name: "Derechos de rectificación",
        score: 88,
        weight: 0.3,
        comments: "Algunas demoras menores en entregas urgentes"
      },
      {
        name: "Gestión de Riesgos y prevención",
        score: 94,
        weight: 0.3,
        comments: "Muy buena atención y respuesta a incidencias"
      }
    ],
    comments: [
      {
        author: "Juan Pérez",
        date: "2025-01-16T09:00:00Z",
        text: "El proveedor ha mostrado una mejora significativa en sus procesos"
      }
    ],
    settings: {
      allow_partial_save: true,
      require_comments: false,
      show_progress: true,
      notify_on_submit: true
    },
    questions: [
      {
        id: "q1",
        type: "rating_5",
        text: "Calidad general del servicio",
        required: true,
        weight: 1.0,
        order: 1,
        options: {}
      }
    ]
  },
  {
    id: "eval-2",
    title: "Evaluación cumplimiento Ley Marco Ciberseguridad",
    description: "Análisis de prácticas sostenibles y responsabilidad ambiental",
    type: "sustainability",
    vendor_id: "vendor-2",
    evaluator_id: "user-2",
    evaluator_name: "Ana García",
    evaluator_role: "Especialista en Sostenibilidad",
    start_date: "2025-02-01T00:00:00Z",
    end_date: "2025-02-29T23:59:59Z",
    status: "draft",
    score: null,
    is_anonymous: true,
    created_at: "2025-01-25T09:00:00Z",
    updated_at: "2025-01-25T09:00:00Z",
    categories: [
      {
        name: "Gestión de Riesgos",
        score: null,
        weight: 0.5,
        comments: "Pendiente de evaluación"
      },
      {
        name: "Eficiencia mitigación",
        score: null,
        weight: 0.3,
        comments: "Pendiente de evaluación"
      },
      {
        name: "Gestión de Informes",
        score: null,
        weight: 0.2,
        comments: "Pendiente de evaluación"
      }
    ],
    comments: [],
    settings: {
      allow_partial_save: true,
      require_comments: false,
      show_progress: true,
      notify_on_submit: true
    },
    questions: [
      {
        id: "q1",
        type: "rating_5",
        text: "Calidad general del servicio",
        required: true,
        weight: 1.0,
        order: 1,
        options: {}
      }
    ]
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
    start_date: "2025-01-10T00:00:00Z",
    end_date: "2025-01-20T23:59:59Z",
    status: "completed",
    score: 87,
    is_anonymous: false,
    created_at: "2025-01-09T08:00:00Z",
    updated_at: "2025-01-20T16:45:00Z",
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
        date: "2025-01-20T16:00:00Z",
        text: "Se recomienda actualizar el plan de emergencias"
      }
    ],
    settings: {
      allow_partial_save: true,
      require_comments: false,
      show_progress: true,
      notify_on_submit: true
    },
    questions: [
      {
        id: "q1",
        type: "rating_5",
        text: "Calidad general del servicio",
        required: true,
        weight: 1.0,
        order: 1,
        options: {}
      }
    ]
  },
  {
    id: "eval-4",
    title: "Evaluación Cumplimiento y riesgo de Ciberseguridad",
    description: "Análisis detallado de la calidad de materias primas",
    type: "quality",
    vendor_id: "vendor-4",
    evaluator_id: "user-2",
    evaluator_name: "Ana García",
    evaluator_role: "Especialista en Calidad",
    start_date: "2025-01-05T00:00:00Z",
    end_date: "2025-01-15T23:59:59Z",
    status: "completed",
    score: 95,
    is_anonymous: false,
    created_at: "2025-01-04T10:00:00Z",
    updated_at: "2025-01-15T17:30:00Z",
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
        date: "2025-01-15T16:00:00Z",
        text: "Proveedor excepcional en términos de calidad"
      }
    ],
    settings: {
      allow_partial_save: true,
      require_comments: false,
      show_progress: true,
      notify_on_submit: true
    },
    questions: [
      {
        id: "q1",
        type: "rating_5",
        text: "Calidad general del servicio",
        required: true,
        weight: 1.0,
        order: 1,
        options: {}
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
    start_date: "2025-01-20T00:00:00Z",
    end_date: "2025-02-20T23:59:59Z",
    status: "active",
    score: 78,
    is_anonymous: false,
    created_at: "2025-01-19T14:00:00Z",
    updated_at: "2025-01-25T11:45:00Z",
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
        date: "2025-01-25T11:00:00Z",
        text: "Se requiere plan de acción para mitigar riesgos financieros"
      }
    ],
    settings: {
      allow_partial_save: true,
      require_comments: false,
      show_progress: true,
      notify_on_submit: true
    },
    questions: [
      {
        id: "q1",
        type: "rating_5",
        text: "Calidad general del servicio",
        required: true,
        weight: 1.0,
        order: 1,
        options: {}
      }
    ]
  }
];

// Mock recommendations data
export const mockRecommendations: Recommendation[] = [
  {
    id: "rec-1",
    evaluation_id: "eval-1",
    vendor_id: "vendor-1",
    title: "Mejora en Procesos de Seguridad",
    description: "Implementar medidas adicionales de seguridad en el acceso a datos",
    priority: "alta",
    status: "pendiente",
    assigned_to: "user-2",
    due_date: "2024-03-01T00:00:00Z",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    category: "seguridad",
    impact: "alto",
    effort: "medio",
    comments: [
      {
        author: "Ana García",
        date: "2024-01-15T11:30:00Z",
        text: "Necesitamos programar una reunión para discutir los detalles"
      }
    ]
  },
  {
    id: "rec-2",
    evaluation_id: "eval-2",
    vendor_id: "vendor-2",
    title: "Actualización de Certificaciones",
    description: "Renovar certificaciones de calidad ISO antes de su vencimiento",
    priority: "media",
    status: "en_progreso",
    assigned_to: "user-3",
    due_date: "2024-04-15T00:00:00Z",
    created_at: "2024-01-20T09:15:00Z",
    updated_at: "2024-01-22T14:30:00Z",
    category: "cumplimiento",
    impact: "medio",
    effort: "bajo",
    comments: [
      {
        author: "Carlos Martínez",
        date: "2024-01-22T14:30:00Z",
        text: "Proceso de renovación iniciado"
      }
    ]
  },
  {
    id: "rec-3",
    evaluation_id: "eval-3",
    vendor_id: "vendor-3",
    title: "Optimización de Tiempos de Entrega",
    description: "Reducir tiempos de entrega en pedidos urgentes",
    priority: "media",
    status: "completada",
    assigned_to: "user-4",
    due_date: "2024-02-28T00:00:00Z",
    created_at: "2024-01-10T15:45:00Z",
    updated_at: "2024-01-25T11:20:00Z",
    category: "operaciones",
    impact: "alto",
    effort: "alto",
    comments: [
      {
        author: "Jun Chen",
        date: "2024-01-25T11:20:00Z",
        text: "Implementación completada con éxito"
      }
    ]
  }
];

// Mock questions data
export const mockQuestions: Question[] = [
  {
    id: "q1",
    evaluation_id: "eval-1",
    text: "¿Cómo calificaría la calidad general del servicio?",
    type: "rating_5",
    required: true,
    order: 1,
    category: "calidad",
    weight: 1.0,
    options: {
      min_label: "Muy malo",
      max_label: "Excelente"
    }
  },
  {
    id: "q2",
    evaluation_id: "eval-1",
    text: "¿El proveedor cumple con los plazos de entrega establecidos?",
    type: "yes_no",
    required: true,
    order: 2,
    category: "cumplimiento",
    weight: 0.8,
    options: {}
  },
  {
    id: "q3",
    evaluation_id: "eval-2",
    text: "Seleccione las áreas que requieren mejora",
    type: "multiple_answer",
    required: false,
    order: 1,
    category: "mejoras",
    weight: 0.5,
    options: {
      choices: [
        "Comunicación",
        "Tiempos de respuesta",
        "Calidad del producto",
        "Soporte técnico"
      ]
    }
  }
];

// Evaluation types
export const evaluationTypes: { id: string; name: string }[] = [
  { id: 'performance', name: 'Evaluación de Desempeño' },
  { id: 'sustainability', name: 'Evaluación de Sostenibilidad' },
  { id: 'compliance', name: 'Evaluación de Cumplimiento' },
  { id: 'quality', name: 'Evaluación de Calidad' },
  { id: 'risk', name: 'Evaluación de Riesgos' }
];

// Question types
export const questionTypes = [
  {
    id: 'escala 1-5',
    name: 'Escala 1-5',
    description: 'Pregunta con respuesta en escala del 1 al 5'
  },
  {
    id: 'si/no/no aplica',
    name: 'Si/No/No Aplica',
    description: 'Pregunta con respuesta de Si, No o No Aplica'
  }
];
