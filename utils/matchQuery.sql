create or replace function match_code (
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int
)
returns table (
  id integer,
  code_string text,
  code_explaination text,
  relative_file_path text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    code_snippet.id,
    code_snippet.code_string,
    code_snippet.code_explaination,
    code_snippet.relative_file_path,
    1 - (code_snippet.code_embedding <=> query_embedding) as similarity
  from code_snippet
  where 1 - (code_snippet.code_embedding <=> query_embedding) > similarity_threshold
  order by code_snippet.code_embedding <=> query_embedding
  limit match_count;
end;
$$;