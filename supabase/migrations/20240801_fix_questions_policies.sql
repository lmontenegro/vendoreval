-- Enable Row Level Security for questions and evaluation_questions tables
ALTER TABLE IF EXISTS questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evaluation_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Questions are viewable by authenticated users" ON questions;
DROP POLICY IF EXISTS "Admins can create questions" ON questions;
DROP POLICY IF EXISTS "Evaluators can create questions" ON questions;
DROP POLICY IF EXISTS "Admins can update questions" ON questions;
DROP POLICY IF EXISTS "Evaluators can update questions" ON questions;

DROP POLICY IF EXISTS "Evaluation questions are viewable by authenticated users" ON evaluation_questions;
DROP POLICY IF EXISTS "Admins can manage evaluation_questions" ON evaluation_questions;
DROP POLICY IF EXISTS "Evaluators can manage evaluation_questions" ON evaluation_questions;

-- SELECT policies for both tables
CREATE POLICY "Questions are viewable by authenticated users" ON questions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Evaluation questions are viewable by authenticated users" ON evaluation_questions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insert and Update policies for questions
CREATE POLICY "Admins can create questions" ON questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      JOIN roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name = 'admin'
    )
  );

CREATE POLICY "Evaluators can create questions" ON questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      JOIN roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name = 'evaluator'
    )
  );

CREATE POLICY "Admins can update questions" ON questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name = 'admin'
    )
  );

CREATE POLICY "Evaluators can update questions" ON questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name = 'evaluator'
    )
  );

-- RLS for evaluation_questions table
CREATE POLICY "Admins can manage evaluation_questions" ON evaluation_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name = 'admin'
    )
  );

CREATE POLICY "Evaluators can manage evaluation_questions" ON evaluation_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN roles ON users.role_id = roles.id
      WHERE users.id = auth.uid()
      AND roles.name = 'evaluator'
    )
  );

-- For debugging purposes, temporarily disable RLS on these tables if needed
-- COMMENT THESE OUT AFTER TESTING:
-- ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE evaluation_questions DISABLE ROW LEVEL SECURITY; 