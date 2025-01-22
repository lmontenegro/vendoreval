import { mockVendors, mockEvaluations, mockQuestions, mockRecommendations } from './mock-data';

// Mock user data for testing
export const mockUsers = [
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

// Mock authentication functions
export const mockAuth = {
  signUp: async ({ email, password }: { email: string; password: string }) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser = {
      id: `mock-${Date.now()}`,
      email,
      profile: {
        id: `mock-${Date.now()}`,
        company_name: "",
        contact_email: email,
        role: "supplier",
        is_active: true,
        contact_phone: "",
        business_details: {}
      }
    };
    
    // Store in localStorage for persistence
    const users = JSON.parse(localStorage.getItem('mockUsers') || '[]');
    users.push(mockUser);
    localStorage.setItem('mockUsers', JSON.stringify(users));
    
    return { data: { user: mockUser }, error: null };
  },

  signIn: async ({ email, password }: { email: string; password: string }) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check mock users first
    const mockUser = mockUsers.find(u => u.email === email && u.password === password);
    if (mockUser) {
      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      return { data: { user: mockUser }, error: null };
    }
    
    // Check localStorage users
    const users = JSON.parse(localStorage.getItem('mockUsers') || '[]');
    const user = users.find((u: any) => u.email === email);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      return { data: { user }, error: null };
    }
    
    return { data: null, error: new Error('Invalid credentials') };
  },

  getUser: async () => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      return { data: { user: JSON.parse(currentUser) }, error: null };
    }
    return { data: { user: null }, error: null };
  },

  signOut: async () => {
    localStorage.removeItem('currentUser');
    return { error: null };
  }
};

// Mock database functions
export const mockDatabase = {
  from: (table: string) => ({
    select: (query: string = '*') => ({
      eq: (field: string, value: any) => ({
        single: async () => {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (table === 'profiles') {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser.profile && currentUser.profile.id === value) {
              return { data: currentUser.profile, error: null };
            }
            
            // Check mock users
            const mockUser = mockUsers.find(u => u.id === value);
            if (mockUser) {
              return { data: mockUser.profile, error: null };
            }
          }
          
          return { data: null, error: new Error('Not found') };
        },
        async execute() {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          switch (table) {
            case 'profiles':
              const users = [...mockUsers, ...JSON.parse(localStorage.getItem('mockUsers') || '[]')];
              return { data: users.map(u => u.profile), error: null };
            case 'vendors':
              return { data: mockVendors, error: null };
            case 'evaluations':
              return { data: mockEvaluations.filter(e => e[field] === value), error: null };
            case 'recommendations':
              return { data: mockRecommendations.filter(r => r[field] === value), error: null };
            default:
              return { data: [], error: null };
          }
        }
      }),
      order: (field: string, { ascending = true } = {}) => ({
        async execute() {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          switch (table) {
            case 'profiles':
              const users = [...mockUsers, ...JSON.parse(localStorage.getItem('mockUsers') || '[]')];
              const profiles = users.map(u => u.profile);
              return {
                data: profiles.sort((a, b) => {
                  return ascending
                    ? a[field].localeCompare(b[field])
                    : b[field].localeCompare(a[field]);
                }),
                error: null
              };
            case 'vendors':
              return {
                data: [...mockVendors].sort((a, b) => {
                  return ascending
                    ? a[field].localeCompare(b[field])
                    : b[field].localeCompare(a[field]);
                }),
                error: null
              };
            case 'evaluations':
              return {
                data: [...mockEvaluations].sort((a, b) => {
                  return ascending
                    ? a[field].localeCompare(b[field])
                    : b[field].localeCompare(a[field]);
                }),
                error: null
              };
            default:
              return { data: [], error: null };
          }
        }
      }),
      async execute() {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        switch (table) {
          case 'profiles':
            const users = [...mockUsers, ...JSON.parse(localStorage.getItem('mockUsers') || '[]')];
            return { data: users.map(u => u.profile), error: null };
          case 'vendors':
            return { data: mockVendors, error: null };
          case 'evaluations':
            return { data: mockEvaluations, error: null };
          case 'recommendations':
            return { data: mockRecommendations, error: null };
          case 'questions':
            return { data: mockQuestions, error: null };
          default:
            return { data: [], error: null };
        }
      }
    }),
    insert: (data: any) => ({
      async execute() {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { data, error: null };
      }
    }),
    update: (data: any) => ({
      eq: (field: string, value: any) => ({
        async execute() {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (table === 'profiles') {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUser.profile && currentUser.profile.id === value) {
              currentUser.profile = { ...currentUser.profile, ...data };
              localStorage.setItem('currentUser', JSON.stringify(currentUser));
              return { data: currentUser.profile, error: null };
            }
          }
          
          return { data: null, error: new Error('Not found') };
        }
      })
    })
  })
};