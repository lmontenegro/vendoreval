-- Fix the assigned_to field in recommendations table to ensure it references profiles correctly

-- First, update any existing recommendations that have invalid assigned_to values
UPDATE recommendations
SET assigned_to = NULL
WHERE assigned_to IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = recommendations.assigned_to
);

-- Ensure the foreign key constraint is properly set
ALTER TABLE recommendations 
DROP CONSTRAINT IF EXISTS recommendations_assigned_to_fkey;

ALTER TABLE recommendations
ADD CONSTRAINT recommendations_assigned_to_fkey 
FOREIGN KEY (assigned_to) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Add comment to explain the field
COMMENT ON COLUMN recommendations.assigned_to IS 'References a profile ID (not vendor_id) of the person responsible for implementing this recommendation';

-- Ensure options column in questions table can store recommendation_text
DO $$
BEGIN
  -- Check if any questions have recommendation_text in options
  IF NOT EXISTS (
    SELECT 1 FROM questions 
    WHERE options::text LIKE '%recommendation_text%'
  ) THEN
    -- Update existing questions to add empty recommendation_text if not present
    UPDATE questions
    SET options = options || '{"recommendation_text": ""}'::jsonb
    WHERE options IS NOT NULL AND (options->'recommendation_text') IS NULL;
  END IF;
END $$;

-- Add policy to allow suppliers to view their recommendations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recommendations' AND policyname = 'Suppliers can view their recommendations'
  ) THEN
    CREATE POLICY "Suppliers can view their recommendations" ON recommendations
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM responses
        JOIN evaluation_vendors ON responses.evaluation_id = evaluation_vendors.evaluation_id
        WHERE responses.id = recommendations.response_id
        AND evaluation_vendors.vendor_id = (
          SELECT vendor_id FROM users WHERE id = auth.uid()
        )
      )
    );
  END IF;
END $$; 