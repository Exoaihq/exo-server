
create or replace function match_code_directory (
    accountid uuid,
    query_embedding vector(1536),
    similarity_threshold float,
    match_count int
  )
  returns table (
    id integer,
    directory_explaination text,
    directory_name text,
    file_path text,
    created_at timestamptz,
    account_id uuid,
    indexed_at timestamptz,
    saved boolean,
    similarity float
  )
  language plpgsql
  as $$
  begin
    return query
    select
      code_directory.id,
      code_directory.directory_explaination,
      code_directory.directory_name,
      code_directory.file_path,
      code_directory.created_at,
      code_directory.account_id,
      code_directory.indexed_at,
      code_directory.saved,
      1 - (code_directory.directory_explaination_embedding <=> query_embedding) as similarity
    from code_directory
    where 1 - (code_directory.directory_explaination_embedding <=> query_embedding) > similarity_threshold and code_directory.account_id = accountid
    order by code_directory.directory_explaination_embedding <=> query_embedding
    limit match_count;
  end;
  $$;