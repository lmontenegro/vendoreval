/*
  # Schema for Supplier Evaluation Platform

  1. Core Tables
    - `profiles`: User profiles linked to auth.users
    - `evaluations`: Evaluation sessions and progress tracking
    - `questions`: Evaluation questions and scoring criteria
    - `responses`: User responses to evaluation questions
    - `recommendations`: Improvement recommendations and action plans
  
  2. Security
    - RLS enabled on all tables
    - Role-based access policies
    - Secure data access patterns
*/

-- Custom types with more specific roles
CREATE TYPE user_role AS ENUM ('admin', 'evaluator', 'supplier');
CREATE TYPE evaluation_status AS ENUM ('draft', 'in_progress', 'pending_review', 'completed', 'archived');
CREATE TYPE recommendation_status AS ENUM ('pending', 'in_progress', 'implemented', 'rejected');

-- Profiles table with enhanced business details
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'supplier',
  company_logo text CHECK (company_logo ~ '^https?://.*'),
  contact_email text CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  contact_phone text,
  business_details jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Evaluations table with enhanced tracking
CREATE TABLE IF NOT EXISTS evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  supplier_id uuid REFERENCES profiles(id) NOT NULL,
  evaluator_id uuid REFERENCES profiles(id) NOT NULL,
  status evaluation_status DEFAULT 'draft',
  progress integer DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  total_score numeric(5,2) CHECK (total_score BETWEEN 0 AND 100),
  start_date timestamptz,
  end_date timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT evaluations_dates_check CHECK (start_date <= end_date)
);

-- Questions table with improved categorization
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  category text NOT NULL,
  subcategory text,
  question_text text NOT NULL,
  description text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  weight numeric(3,2) DEFAULT 1.0 CHECK (weight > 0),
  is_required boolean DEFAULT true,
  order_index integer,
  validation_rules jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT positive_weight CHECK (weight > 0)
);

-- Responses table with validation
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES questions(id) NOT NULL,
  response_value text NOT NULL,
  score numeric(5,2) CHECK (score BETWEEN 0 AND 100),
  notes text,
  evidence_urls text[],
  reviewed_by uuid REFERENCES profiles(id),
  review_date timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Recommendations table with action tracking
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  question_id uuid REFERENCES questions(id) NOT NULL,
  response_id uuid REFERENCES responses(id) NOT NULL,
  recommendation_text text NOT NULL,
  priority integer CHECK (priority BETWEEN 1 AND 5),
  action_plan text,
  due_date timestamptz,
  resources jsonb DEFAULT '{}'::jsonb,
  status recommendation_status DEFAULT 'pending',
  assigned_to uuid REFERENCES profiles(id),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Enhanced security policies
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins have full access to evaluations" ON evaluations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their related evaluations" ON evaluations
  FOR SELECT USING (
    supplier_id = auth.uid() OR
    evaluator_id = auth.uid()
  );

CREATE POLICY "Evaluators can create and update evaluations" ON evaluations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'evaluator'
    )
  );

CREATE POLICY "Questions are viewable by authenticated users" ON questions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Responses are viewable by evaluation participants" ON responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = responses.evaluation_id
      AND (evaluations.supplier_id = auth.uid() OR evaluations.evaluator_id = auth.uid())
    )
  );

-- Optimized indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_evaluations_supplier ON evaluations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON evaluations(status);
CREATE INDEX IF NOT EXISTS idx_responses_evaluation ON responses(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
    BEFORE UPDATE ON evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_responses_updated_at
    BEFORE UPDATE ON responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at
    BEFORE UPDATE ON recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();