import { mockEvaluations } from '../supabase/mock-data';

export interface EvaluationCategory {
  name: string;
  score: number | null;
  weight: number;
  comments: string;
}

export interface EvaluationComment {
  author: string;
  date: string;
  text: string;
}

export interface Evaluation {
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
  categories: EvaluationCategory[];
  comments: EvaluationComment[];
}

export async function getEvaluations(): Promise<{ data: Evaluation[] | null; error: Error | null }> {
  try {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!mockEvaluations || !Array.isArray(mockEvaluations)) {
      console.error('Mock evaluations data is invalid:', mockEvaluations);
      throw new Error('Invalid mock data');
    }
    return { data: mockEvaluations, error: null };
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    return { data: null, error: error as Error };
  }
}

export function calculateCategoryScore(categories: EvaluationCategory[]): number | null {
  if (categories.some(cat => cat.score === null)) return null;

  const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);
  const weightedScore = categories.reduce((sum, cat) => sum + ((cat.score || 0) * cat.weight), 0);

  return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) / 100 : null;
}