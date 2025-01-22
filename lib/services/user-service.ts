import { mockUsers } from '../supabase/mock-auth';

export interface User {
  id: string;
  company_name: string;
  contact_email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string;
  department: string;
  avatar_url: string;
  contact_phone: string;
  business_details: {
    position: string;
    address: string;
  };
}

// TODO: Replace this mock implementation with actual Supabase integration
export async function getUsers(): Promise<{ data: User[] | null; error: Error | null }> {
  try {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Transform mock data to match the expected User interface
    const users = mockUsers.map(user => ({
      id: user.profile.id,
      company_name: user.profile.company_name,
      contact_email: user.profile.contact_email,
      role: user.profile.role,
      is_active: user.profile.is_active,
      created_at: user.profile.created_at || new Date().toISOString(),
      last_login: user.profile.last_login || new Date().toISOString(),
      department: user.profile.department || 'General',
      avatar_url: user.profile.avatar_url || '',
      contact_phone: user.profile.contact_phone,
      business_details: {
        position: user.profile.business_details?.position || 'No especificado',
        address: user.profile.business_details?.address || 'No especificada'
      }
    }));

    return { data: users, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function getUserById(id: string): Promise<{ data: User | null; error: Error | null }> {
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = mockUsers.find(u => u.profile.id === id);
    
    if (!user) {
      return { data: null, error: new Error('Usuario no encontrado') };
    }

    return {
      data: {
        id: user.profile.id,
        company_name: user.profile.company_name,
        contact_email: user.profile.contact_email,
        role: user.profile.role,
        is_active: user.profile.is_active,
        created_at: user.profile.created_at || new Date().toISOString(),
        last_login: user.profile.last_login || new Date().toISOString(),
        department: user.profile.department || 'General',
        avatar_url: user.profile.avatar_url || '',
        contact_phone: user.profile.contact_phone,
        business_details: {
          position: user.profile.business_details?.position || 'No especificado',
          address: user.profile.business_details?.address || 'No especificada'
        }
      },
      error: null
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}