create or replace function match_code_file (
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int
)
returns table (
  id integer,
  file_explaination text,
  file_name text,
  file_path text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    code_file.id,
    code_file.file_explaination,
    code_file.file_name,
    code_file.file_path,
    1 - (code_file.file_explaination_embedding <=> query_embedding) as similarity
  from code_file
  where 1 - (code_file.file_explaination_embedding <=> query_embedding) > similarity_threshold
  order by code_file.file_explaination_embedding <=> query_embedding
  limit match_count;
end;
$$;