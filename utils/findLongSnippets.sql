CREATE OR REPLACE FUNCTION find_long_snippets(lineCount int)
RETURNS SETOF code_snippet AS $$
BEGIN
  RETURN QUERY SELECT * FROM code_snippet
  WHERE end_row - start_row > lineCount;
END;
$$ LANGUAGE plpgsql;