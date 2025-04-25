-- Add many-to-many relationship between evaluations and vendors
CREATE TABLE IF NOT EXISTS evaluation_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid REFERENCES evaluations(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id),
  status varchar(50) DEFAULT 'pending',
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (evaluation_id, vendor_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_evaluation_vendors_evaluation_id ON evaluation_vendors(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_vendors_vendor_id ON evaluation_vendors(vendor_id);

-- Enable RLS for the new table
ALTER TABLE evaluation_vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins have full access to evaluation_vendors" ON evaluation_vendors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Evaluators can view and manage their evaluations' vendors" ON evaluation_vendors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM evaluations
      WHERE evaluations.id = evaluation_vendors.evaluation_id
      AND evaluations.evaluator_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can view their assigned evaluations" ON evaluation_vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'supplier'
      AND evaluation_vendors.vendor_id IN (
        SELECT vendor_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Add trigger to update updated_at column
CREATE TRIGGER update_evaluation_vendors_updated_at
    BEFORE UPDATE ON evaluation_vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 