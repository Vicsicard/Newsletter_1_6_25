-- Create a function to refresh the schema cache
CREATE OR REPLACE FUNCTION refresh_schema()
RETURNS void AS $$
BEGIN
  -- Notify PostgREST to reload its schema cache
  NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_schema() TO authenticated;
