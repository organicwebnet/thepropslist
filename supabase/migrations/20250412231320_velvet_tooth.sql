/*
  # Add show collaborators

  1. Changes
    - Add collaborators array to shows table
    - Add policies for collaborator access

  2. Security
    - Enable RLS on shows table
    - Add policies for owner and collaborator access
*/

-- Add collaborators array to shows table
ALTER TABLE shows ADD COLUMN IF NOT EXISTS collaborators jsonb[] DEFAULT '{}';

-- Enable RLS
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read shows they own"
  ON shows
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read shows they collaborate on"
  ON shows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(collaborators) c
      WHERE c->>'email' = auth.email()
    )
  );

CREATE POLICY "Users can update shows they own"
  ON shows
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Collaborators with editor role can update shows"
  ON shows
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(collaborators) c
      WHERE c->>'email' = auth.email()
      AND c->>'role' = 'editor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(collaborators) c
      WHERE c->>'email' = auth.email()
      AND c->>'role' = 'editor'
    )
  );

CREATE POLICY "Users can delete shows they own"
  ON shows
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add policies for props table to allow collaborator access
CREATE POLICY "Collaborators can read props"
  ON props
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shows s, jsonb_array_elements(s.collaborators) c
      WHERE s.id = props.show_id
      AND c->>'email' = auth.email()
    )
  );

CREATE POLICY "Editor collaborators can insert props"
  ON props
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shows s, jsonb_array_elements(s.collaborators) c
      WHERE s.id = props.show_id
      AND c->>'email' = auth.email()
      AND c->>'role' = 'editor'
    )
  );

CREATE POLICY "Editor collaborators can update props"
  ON props
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shows s, jsonb_array_elements(s.collaborators) c
      WHERE s.id = props.show_id
      AND c->>'email' = auth.email()
      AND c->>'role' = 'editor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shows s, jsonb_array_elements(s.collaborators) c
      WHERE s.id = props.show_id
      AND c->>'email' = auth.email()
      AND c->>'role' = 'editor'
    )
  );

CREATE POLICY "Editor collaborators can delete props"
  ON props
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shows s, jsonb_array_elements(s.collaborators) c
      WHERE s.id = props.show_id
      AND c->>'email' = auth.email()
      AND c->>'role' = 'editor'
    )
  );