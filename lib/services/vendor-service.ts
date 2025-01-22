import { mockVendors } from '../supabase/mock-data';

export interface Vendor {
  id: string;
  name: string;
  category: string;
  status: string;
  rating: string;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  services: string[];
  certifications: string[];
  performance: {
    onTimeDelivery: number;
    qualityScore: number;
    responseTime: number;
  };
  compliance_status?: 'compliant' | 'non_compliant' | 'pending';
}

export async function getVendors(): Promise<{ data: Vendor[] | null; error: Error | null }> {
  try {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Add compliance status based on performance metrics
    const vendorsWithCompliance = mockVendors.map(vendor => ({
      ...vendor,
      compliance_status: getComplianceStatus(vendor.performance)
    }));

    return { data: vendorsWithCompliance, error: null };
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return { data: null, error: error as Error };
  }
}

function getComplianceStatus(performance: { onTimeDelivery: number; qualityScore: number; responseTime: number }): 'compliant' | 'non_compliant' | 'pending' {
  const threshold = 85;
  const scores = [performance.onTimeDelivery, performance.qualityScore, performance.responseTime];
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  if (average >= threshold) {
    return 'compliant';
  } else if (average >= 70) {
    return 'pending';
  } else {
    return 'non_compliant';
  }
}