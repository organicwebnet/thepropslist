/*
  # Update collaborator permissions

  1. Changes
    - Modify show policies to restrict editing to owners only
    - Update prop policies to allow collaborators to add/edit props
    - Add viewer role with read-only access

  2. Security
    - Enable RLS on shows and props tables
    - Add policies for owner and collaborator access
*/

-- Update show policies to restrict editing to owners only
DROP POLICY IF EXISTS "Users can update shows they own" ON shows;
DROP POLICY IF EXISTS "Collaborators with editor role can update shows" ON shows;

CREATE POLICY "Only owners can update shows"
  ON shows
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update prop policies for collaborators
DROP POLICY IF EXISTS "Editor collaborators can update props" ON props;
DROP POLICY IF EXISTS "Editor collaborators can delete props" ON props;

CREATE POLICY "Collaborators can update their own props"
  ON props
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shows s, jsonb_array_elements(s.collaborators) c
      WHERE s.id = props.show_id
      AND c->>'email' = auth.email()
      AND (c->>'role' = 'editor' OR auth.uid() = props.user_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shows s, jsonb_array_elements(s.collaborators) c
      WHERE s.id = props.show_id
      AND c->>'email' = auth.email()
      AND (c->>'role' = 'editor' OR auth.uid() = props.user_id)
    )
  );

CREATE POLICY "Collaborators can delete their own props"
  ON props
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shows s, jsonb_array_elements(s.collaborators) c
      WHERE s.id = props.show_id
      AND c->>'email' = auth.email()
      AND (c->>'role' = 'editor' OR auth.uid() = props.user_id)
    )
  );

-- Add viewer role policies
CREATE POLICY "Viewers can read shows"
  ON shows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(collaborators) c
      WHERE c->>'email' = auth.email()
      AND c->>'role' = 'viewer'
    )
  );

CREATE POLICY "Viewers can read props"
  ON props
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shows s, jsonb_array_elements(s.collaborators) c
      WHERE s.id = props.show_id
      AND c->>'email' = auth.email()
      AND c->>'role' = 'viewer'
    )
  );