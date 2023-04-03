match_code_snippet_explaination

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

query_embedding: number[]

create or replace function match_code_snippet_explaination (
    accountid uuid,
    query_embedding vector(1536),
    similarity_threshold float,
    match_count int
  )
  returns table (
    id integer,
    code_explaination text,
    code_string text,
    file_name text,
    relative_file_path text,
    created_at timestamptz,
    account_id uuid,
    similarity float
  )
  language plpgsql
  as $$
  begin
    return query
    select
      code_snippet.id,
      code_snippet.code_explaination,
      code_snippet.code_string,
      code_snippet.file_name,
      code_snippet.relative_file_path,
      code_snippet.created_at,
      code_snippet.account_id,
      1 - (code_snippet.code_explaination_embedding <=> query_embedding) as similarity
    from code_snippet
    where 1 - (code_snippet.code_explaination_embedding <=> query_embedding) > similarity_threshold and code_snippet.account_id = accountid
    order by code_snippet.code_explaination_embedding <=> query_embedding
    limit match_count;
  end;
  $$;