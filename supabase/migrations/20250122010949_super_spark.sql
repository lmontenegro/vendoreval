/*
  # Initial Schema Setup for Supplier Evaluation Platform

  1. New Tables
    - `profiles`
      - Stores user profile information
      - Links to auth.users
      - Contains company details and role information
    
    - `evaluations`
      - Stores evaluation sessions
      - Tracks progress and completion status
    
    - `questions`
      - Stores evaluation questions
      - Includes category and scoring information
    
    - `responses`
      - Stores user responses to evaluation questions
      - Links responses to evaluations and questions
    
    - `recommendations`
      - Stores improvement recommendations
      - Links to specific questions and responses
    
  2. Security
    - Enable RLS on all tables
    - Add policies for data access based on user roles
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'evaluator', 'supplier');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz DEFAULT now(),
  company_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'supplier',
  company_logo text,
  contact_email text,
  contact_phone text,
  business_details jsonb,
  is_active boolean DEFAULT true
);

-- Create evaluations table
CREATE TABLE IF NOT EXISTS evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  supplier_id uuid REFERENCES profiles(id),
  evaluator_id uuid REFERENCES profiles(id),
  status text DEFAULT 'draft',
  progress integer DEFAULT 0,
  total_score numeric(5,2),
  metadata jsonb
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  subcategory text,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  weight numeric(3,2) DEFAULT 1.0,
  is_required boolean DEFAULT true,
  order_index integer
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id),
  response_value text NOT NULL,
  score numeric(5,2),
  notes text
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  question_id uuid REFERENCES questions(id),
  response_id uuid REFERENCES responses(id),
  recommendation_text text NOT NULL,
  action_plan text,
  resources jsonb,
  status text DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all evaluations" ON evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own evaluations" ON evaluations
  FOR SELECT USING (
    supplier_id = auth.uid() OR
    evaluator_id = auth.uid()
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

-- Create indexes
CREATE INDEX idx_evaluations_supplier ON evaluations(supplier_id);
CREATE INDEX idx_evaluations_evaluator ON evaluations(evaluator_id);
CREATE INDEX idx_responses_evaluation ON responses(evaluation_id);
CREATE INDEX idx_questions_category ON questions(category);