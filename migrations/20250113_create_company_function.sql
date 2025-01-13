-- Create a function to handle company creation
CREATE OR REPLACE FUNCTION create_company(
  p_company_name TEXT,
  p_industry TEXT,
  p_contact_email TEXT,
  p_target_audience TEXT DEFAULT NULL,
  p_audience_description TEXT DEFAULT NULL,
  p_website_url TEXT DEFAULT NULL
) RETURNS companies AS $$
DECLARE
  v_company companies;
BEGIN
  INSERT INTO companies (
    company_name,
    industry,
    contact_email,
    target_audience,
    audience_description,
    website_url
  ) VALUES (
    p_company_name,
    p_industry,
    p_contact_email,
    p_target_audience,
    p_audience_description,
    p_website_url
  )
  RETURNING * INTO v_company;
  
  RETURN v_company;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
