--
-- PostgreSQL database dump
--

-- Dumped from database version 15.1
-- Dumped by pg_dump version 15.1 (Debian 15.1-1.pgdg110+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";


--
-- Name: next_auth; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA "next_auth";


ALTER SCHEMA "next_auth" OWNER TO "postgres";

--
-- Name: pgsodium; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";


--
-- Name: moddatetime; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


--
-- Name: pgjwt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";


--
-- Name: message_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."message_role" AS ENUM (
    'user',
    'system',
    'assistant'
);


ALTER TYPE "public"."message_role" OWNER TO "postgres";

--
-- Name: pricing_plan_interval; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."pricing_plan_interval" AS ENUM (
    'day',
    'week',
    'month',
    'year'
);


ALTER TYPE "public"."pricing_plan_interval" OWNER TO "postgres";

--
-- Name: pricing_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."pricing_type" AS ENUM (
    'one_time',
    'recurring'
);


ALTER TYPE "public"."pricing_type" OWNER TO "postgres";

--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."subscription_status" AS ENUM (
    'trialing',
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'unpaid'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";

--
-- Name: uid(); Type: FUNCTION; Schema: next_auth; Owner: postgres
--

CREATE FUNCTION "next_auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select
    coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
$$;


ALTER FUNCTION "next_auth"."uid"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: code_snippet; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."code_snippet" (
    "id" integer NOT NULL,
    "code_string" "text" DEFAULT '<h1>example</h1>'::"text",
    "code_explaination" "text" DEFAULT 'explaination'::"text",
    "code_explaination_embedding" "extensions"."vector"(1536),
    "code_embedding" "extensions"."vector"(1536),
    "relative_file_path" "text",
    "parsed_code_type" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "start_row" integer,
    "start_column" integer,
    "end_row" integer,
    "end_column" integer,
    "file_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code_file_id" integer,
    "account_id" "uuid",
    "name" "text",
    "language" "text",
    "has_external_methods" boolean
);


ALTER TABLE "public"."code_snippet" OWNER TO "postgres";

--
-- Name: find_long_snippets(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."find_long_snippets"("line_count" integer) RETURNS SETOF "public"."code_snippet"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY SELECT * FROM code_snippet
  WHERE end_row - start_row > line_count;
END;
$$;


ALTER FUNCTION "public"."find_long_snippets"("line_count" integer) OWNER TO "postgres";

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  insert into public.users (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  insert into public.account (user_id)
  values (new.id);
  return new;
end;

$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

--
-- Name: match_code("extensions"."vector", double precision, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."match_code"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) RETURNS TABLE("id" integer, "code_string" "text", "code_explaination" "text", "relative_file_path" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."match_code"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) OWNER TO "postgres";

--
-- Name: match_code_directory("uuid", "extensions"."vector", double precision, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."match_code_directory"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) RETURNS TABLE("id" integer, "directory_explaination" "text", "directory_name" "text", "file_path" "text", "created_at" timestamp with time zone, "account_id" "uuid", "indexed_at" timestamp with time zone, "saved" boolean, "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."match_code_directory"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) OWNER TO "postgres";

--
-- Name: match_code_file("uuid", "extensions"."vector", double precision, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."match_code_file"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) RETURNS TABLE("id" integer, "file_explaination" "text", "file_name" "text", "file_path" "text", "created_at" timestamp with time zone, "account_id" "uuid", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    code_file.id,
    code_file.file_explaination,
    code_file.file_name,
    code_file.file_path,
    code_file.created_at,
    code_file.account_id,
    1 - (code_file.file_explaination_embedding <=> query_embedding) as similarity
  from code_file
  where 1 - (code_file.file_explaination_embedding <=> query_embedding) > similarity_threshold and code_file.account_id = accountid
  order by code_file.file_explaination_embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_code_file"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) OWNER TO "postgres";

--
-- Name: match_code_snippet_explaination("uuid", "extensions"."vector", double precision, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."match_code_snippet_explaination"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) RETURNS TABLE("id" integer, "code_explaination" "text", "code_string" "text", "file_name" "text", "relative_file_path" "text", "created_at" timestamp with time zone, "account_id" "uuid", "parsed_code_type" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
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
      code_snippet.parsed_code_type,
      1 - (code_snippet.code_explaination_embedding <=> query_embedding) as similarity
    from code_snippet
    where 1 - (code_snippet.code_explaination_embedding <=> query_embedding) > similarity_threshold and code_snippet.account_id = accountid and code_snippet.parsed_code_type != 'import_statement'
    order by code_snippet.code_explaination_embedding <=> query_embedding
    limit match_count;
  end;
  $$;


ALTER FUNCTION "public"."match_code_snippet_explaination"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) OWNER TO "postgres";

--
-- Name: match_documents("extensions"."vector", double precision, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) RETURNS TABLE("id" bigint, "code_string" "text", "code_explaination" "text", "relative_file_path" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    id,
    code_string,
    code_explaination,
    relative_file_path,
    1 - (code_snippet.code_embedding <=> query_embedding) as similarity
  from code_snippet
  where 1 - (code_snippet.code_embedding <=> query_embedding) > similarity_threshold
  order by code_snippet.code_embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) OWNER TO "postgres";

--
-- Name: match_long_term_memory("extensions"."vector", double precision, integer, "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."match_long_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "accountid" "uuid") RETURNS TABLE("id" integer, "memory_text" "text", "memory_context" "text", "account_id" "uuid", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    long_term_memory.id,
    long_term_memory.memory_text,
    long_term_memory.memory_context,
    long_term_memory.account_id,
    1 - (long_term_memory.code_embedding <=> query_embedding) as similarity
  from long_term_memory
  where 1 - (long_term_memory.memory_embedding <=> query_embedding) > similarity_threshold and long_term_memory.account_id = accountid
  order by long_term_memory.memory_embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_long_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "accountid" "uuid") OWNER TO "postgres";

--
-- Name: match_short_term_memory("extensions"."vector", double precision, integer, "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."match_short_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "sessionid" "uuid") RETURNS TABLE("id" integer, "memory_text" "text", "memory_context" "text", "session_id" "uuid", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    short_term_memory.id,
    short_term_memory.memory_text,
    short_term_memory.memory_context,
    short_term_memory.session_id,
    1 - (short_term_memory.code_embedding <=> query_embedding) as similarity
  from short_term_memory
  where 1 - (short_term_memory.memory_embedding <=> query_embedding) > similarity_threshold and short_term_memory.session_id = sessionid
  order by short_term_memory.memory_embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_short_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "sessionid" "uuid") OWNER TO "postgres";

--
-- Name: accounts; Type: TABLE; Schema: next_auth; Owner: postgres
--

CREATE TABLE "next_auth"."accounts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "providerAccountId" "text" NOT NULL,
    "refresh_token" "text",
    "access_token" "text",
    "expires_at" bigint,
    "token_type" "text",
    "scope" "text",
    "id_token" "text",
    "session_state" "text",
    "oauth_token_secret" "text",
    "oauth_token" "text",
    "userId" "uuid"
);


ALTER TABLE "next_auth"."accounts" OWNER TO "postgres";

--
-- Name: sessions; Type: TABLE; Schema: next_auth; Owner: postgres
--

CREATE TABLE "next_auth"."sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "expires" timestamp with time zone NOT NULL,
    "sessionToken" "text" NOT NULL,
    "userId" "uuid"
);


ALTER TABLE "next_auth"."sessions" OWNER TO "postgres";

--
-- Name: users; Type: TABLE; Schema: next_auth; Owner: postgres
--

CREATE TABLE "next_auth"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text",
    "email" "text",
    "emailVerified" timestamp with time zone,
    "image" "text"
);


ALTER TABLE "next_auth"."users" OWNER TO "postgres";

--
-- Name: verification_tokens; Type: TABLE; Schema: next_auth; Owner: postgres
--

CREATE TABLE "next_auth"."verification_tokens" (
    "identifier" "text",
    "token" "text" NOT NULL,
    "expires" timestamp with time zone NOT NULL
);


ALTER TABLE "next_auth"."verification_tokens" OWNER TO "postgres";

--
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."account" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."account" OWNER TO "postgres";

--
-- Name: ai_created_code; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."ai_created_code" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "code" "text",
    "location" "text",
    "session_id" "uuid",
    "functionality" "text",
    "completed_at" timestamp with time zone,
    "path" "text",
    "file_name" "text",
    "writen_to_file_at" timestamp with time zone,
    "existing_code" "text",
    "account_id" "uuid"
);


ALTER TABLE "public"."ai_created_code" OWNER TO "postgres";

--
-- Name: app_helper_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."app_helper_messages" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "text" "text",
    "name" "text"
);


ALTER TABLE "public"."app_helper_messages" OWNER TO "postgres";

--
-- Name: app_helper_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."app_helper_messages" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."app_helper_messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: code_snippet_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "public"."code_snippet_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."code_snippet_id_seq" OWNER TO "postgres";

--
-- Name: code_snippet_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "public"."code_snippet_id_seq" OWNED BY "public"."code_snippet"."id";


--
-- Name: code_directory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."code_directory" (
    "id" integer DEFAULT "nextval"('"public"."code_snippet_id_seq"'::"regclass") NOT NULL,
    "directory_explaination_embedding" "extensions"."vector"(1536),
    "file_path" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "directory_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "account_id" "uuid",
    "saved" boolean,
    "indexed_at" timestamp with time zone,
    "directory_explaination" "text",
    "is_root_directory" boolean DEFAULT false NOT NULL,
    "parent_directory_id" integer
);


ALTER TABLE "public"."code_directory" OWNER TO "postgres";

--
-- Name: code_file; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."code_file" (
    "id" integer DEFAULT "nextval"('"public"."code_snippet_id_seq"'::"regclass") NOT NULL,
    "file_explaination" "text",
    "file_explaination_embedding" "extensions"."vector"(1536),
    "file_path" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "file_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code_directory_id" integer,
    "account_id" "uuid",
    "code_directory_parent_id" integer,
    "test_file_id" integer,
    "content" "text",
    "dependencies" "text"
);


ALTER TABLE "public"."code_file" OWNER TO "postgres";

--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."customers" (
    "id" "uuid" NOT NULL,
    "stripe_customer_id" "text"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";

--
-- Name: export_import_snippet_map; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."export_import_snippet_map" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "export_id" integer,
    "import_id" integer
);


ALTER TABLE "public"."export_import_snippet_map" OWNER TO "postgres";

--
-- Name: long_term_memory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."long_term_memory" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "memory_text" "text",
    "memory_context" "text",
    "memory_embedding" "extensions"."vector"(1536),
    "account_id" "uuid"
);


ALTER TABLE "public"."long_term_memory" OWNER TO "postgres";

--
-- Name: message_prompts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."message_prompts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "message_id" "uuid",
    "prompt_id" "uuid"
);


ALTER TABLE "public"."message_prompts" OWNER TO "postgres";

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "role" "public"."message_role",
    "content" "text",
    "session_id" "uuid",
    "created_location" "text",
    "is_helper_message" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."messages" OWNER TO "postgres";

--
-- Name: objective; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."objective" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "thought" "text",
    "question" "text",
    "reasoning" "text",
    "criticism" "text",
    "session_id" "uuid"
);


ALTER TABLE "public"."objective" OWNER TO "postgres";

--
-- Name: openai_models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."openai_models" (
    "id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "object" "text",
    "ready" boolean,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."openai_models" OWNER TO "postgres";

--
-- Name: prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."prices" (
    "id" "text" NOT NULL,
    "product_id" "text",
    "active" boolean,
    "description" "text",
    "unit_amount" bigint,
    "currency" "text",
    "type" "public"."pricing_type",
    "interval" "public"."pricing_plan_interval",
    "interval_count" integer,
    "trial_period_days" integer,
    "metadata" "jsonb",
    CONSTRAINT "prices_currency_check" CHECK (("char_length"("currency") = 3))
);


ALTER TABLE "public"."prices" OWNER TO "postgres";

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."products" (
    "id" "text" NOT NULL,
    "active" boolean,
    "name" "text",
    "description" "text",
    "image" "text",
    "metadata" "jsonb"
);


ALTER TABLE "public"."products" OWNER TO "postgres";

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "website" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";

--
-- Name: prompt; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."prompt" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "body" "text",
    "prefix" "text",
    "suffix" "text",
    "global" boolean,
    "name" "text",
    "message_id" "uuid",
    "description" "text"
);


ALTER TABLE "public"."prompt" OWNER TO "postgres";

--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."session" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "location" "text",
    "file_name" "text",
    "functionality" "text",
    "new_file" boolean,
    "user_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "file_path" "text",
    "code_content" "text",
    "expected_next_action" "text",
    "scratch_pad_content" "text"
);


ALTER TABLE "public"."session" OWNER TO "postgres";

--
-- Name: short_term_memory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."short_term_memory" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "memory_text" "text",
    "memory_context" "text",
    "memory_embedding" "extensions"."vector"(1536),
    "session_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."short_term_memory" OWNER TO "postgres";

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."subscriptions" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."subscription_status",
    "metadata" "jsonb",
    "price_id" "text",
    "quantity" integer,
    "cancel_at_period_end" boolean,
    "created" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "current_period_start" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "current_period_end" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ended_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "cancel_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "canceled_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "trial_start" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "trial_end" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";

--
-- Name: task; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."task" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "description" "text",
    "objective_id" "uuid",
    "tool_name" "text",
    "tool_input" "text",
    "tool_output" "text",
    "started_eval_at" timestamp with time zone,
    "loop_evaluated_at" timestamp with time zone,
    "marked_ready" boolean,
    "requires_loop" boolean,
    "index" integer
);


ALTER TABLE "public"."task" OWNER TO "postgres";

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."users" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "billing_address" "jsonb",
    "payment_method" "jsonb",
    "email" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";

--
-- Name: wait_list; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "public"."wait_list" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text"
);


ALTER TABLE "public"."wait_list" OWNER TO "postgres";

--
-- Name: wait_list_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."wait_list" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."wait_list_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: code_snippet id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_snippet" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."code_snippet_id_seq"'::"regclass");


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: next_auth; Owner: postgres
--

ALTER TABLE ONLY "next_auth"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");


--
-- Name: users email_unique; Type: CONSTRAINT; Schema: next_auth; Owner: postgres
--

ALTER TABLE ONLY "next_auth"."users"
    ADD CONSTRAINT "email_unique" UNIQUE ("email");


--
-- Name: accounts provider_unique; Type: CONSTRAINT; Schema: next_auth; Owner: postgres
--

ALTER TABLE ONLY "next_auth"."accounts"
    ADD CONSTRAINT "provider_unique" UNIQUE ("provider", "providerAccountId");


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: next_auth; Owner: postgres
--

ALTER TABLE ONLY "next_auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");


--
-- Name: sessions sessiontoken_unique; Type: CONSTRAINT; Schema: next_auth; Owner: postgres
--

ALTER TABLE ONLY "next_auth"."sessions"
    ADD CONSTRAINT "sessiontoken_unique" UNIQUE ("sessionToken");


--
-- Name: verification_tokens token_identifier_unique; Type: CONSTRAINT; Schema: next_auth; Owner: postgres
--

ALTER TABLE ONLY "next_auth"."verification_tokens"
    ADD CONSTRAINT "token_identifier_unique" UNIQUE ("token", "identifier");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: next_auth; Owner: postgres
--

ALTER TABLE ONLY "next_auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: verification_tokens verification_tokens_pkey; Type: CONSTRAINT; Schema: next_auth; Owner: postgres
--

ALTER TABLE ONLY "next_auth"."verification_tokens"
    ADD CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("token");


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."account"
    ADD CONSTRAINT "account_pkey" PRIMARY KEY ("id");


--
-- Name: ai_created_code ai_created_code_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_created_code"
    ADD CONSTRAINT "ai_created_code_pkey" PRIMARY KEY ("id");


--
-- Name: app_helper_messages app_helper_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."app_helper_messages"
    ADD CONSTRAINT "app_helper_messages_pkey" PRIMARY KEY ("id");


--
-- Name: code_directory code_directory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_directory"
    ADD CONSTRAINT "code_directory_pkey" PRIMARY KEY ("id");


--
-- Name: code_file code_file_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_file"
    ADD CONSTRAINT "code_file_pkey" PRIMARY KEY ("id");


--
-- Name: code_snippet code_snippet_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_snippet"
    ADD CONSTRAINT "code_snippet_pkey" PRIMARY KEY ("id");


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");


--
-- Name: export_import_snippet_map exportImportMap_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."export_import_snippet_map"
    ADD CONSTRAINT "exportImportMap_pkey" PRIMARY KEY ("id");


--
-- Name: long_term_memory long_term_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."long_term_memory"
    ADD CONSTRAINT "long_term_memory_pkey" PRIMARY KEY ("id");


--
-- Name: message_prompts message_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."message_prompts"
    ADD CONSTRAINT "message_prompts_pkey" PRIMARY KEY ("id");


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");


--
-- Name: objective objective_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."objective"
    ADD CONSTRAINT "objective_pkey" PRIMARY KEY ("id");


--
-- Name: openai_models openai_models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."openai_models"
    ADD CONSTRAINT "openai_models_pkey" PRIMARY KEY ("id");


--
-- Name: prices prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."prices"
    ADD CONSTRAINT "prices_pkey" PRIMARY KEY ("id");


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");


--
-- Name: prompt prompt_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."prompt"
    ADD CONSTRAINT "prompt_pkey" PRIMARY KEY ("id");


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session"
    ADD CONSTRAINT "session_pkey" PRIMARY KEY ("id");


--
-- Name: short_term_memory short_term_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."short_term_memory"
    ADD CONSTRAINT "short_term_memory_pkey" PRIMARY KEY ("id");


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_pkey" PRIMARY KEY ("id");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- Name: wait_list wait_list_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."wait_list"
    ADD CONSTRAINT "wait_list_pkey" PRIMARY KEY ("id");


--
-- Name: code_snippet handle_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."code_snippet" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');


--
-- Name: accounts accounts_userId_fkey; Type: FK CONSTRAINT; Schema: next_auth; Owner: postgres
--

ALTER TABLE ONLY "next_auth"."accounts"
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "next_auth"."users"("id") ON DELETE CASCADE;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: next_auth; Owner: postgres
--

ALTER TABLE ONLY "next_auth"."sessions"
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "next_auth"."users"("id") ON DELETE CASCADE;


--
-- Name: account account_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."account"
    ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");


--
-- Name: ai_created_code ai_created_code_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_created_code"
    ADD CONSTRAINT "ai_created_code_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id");


--
-- Name: ai_created_code ai_created_code_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_created_code"
    ADD CONSTRAINT "ai_created_code_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id");


--
-- Name: code_directory code_directory_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_directory"
    ADD CONSTRAINT "code_directory_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE CASCADE;


--
-- Name: code_directory code_directory_parent_directory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_directory"
    ADD CONSTRAINT "code_directory_parent_directory_id_fkey" FOREIGN KEY ("parent_directory_id") REFERENCES "public"."code_directory"("id");


--
-- Name: code_file code_file_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_file"
    ADD CONSTRAINT "code_file_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id");


--
-- Name: code_file code_file_code_directory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_file"
    ADD CONSTRAINT "code_file_code_directory_id_fkey" FOREIGN KEY ("code_directory_id") REFERENCES "public"."code_directory"("id");


--
-- Name: code_file code_file_code_directory_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_file"
    ADD CONSTRAINT "code_file_code_directory_parent_id_fkey" FOREIGN KEY ("code_directory_parent_id") REFERENCES "public"."code_directory"("id");


--
-- Name: code_file code_file_test_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_file"
    ADD CONSTRAINT "code_file_test_file_id_fkey" FOREIGN KEY ("test_file_id") REFERENCES "public"."code_file"("id") ON DELETE SET DEFAULT;


--
-- Name: code_snippet code_snippet_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_snippet"
    ADD CONSTRAINT "code_snippet_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id");


--
-- Name: code_snippet code_snippet_code_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."code_snippet"
    ADD CONSTRAINT "code_snippet_code_file_id_fkey" FOREIGN KEY ("code_file_id") REFERENCES "public"."code_file"("id") ON DELETE CASCADE;


--
-- Name: customers customers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");


--
-- Name: export_import_snippet_map export_import_snippet_map_export_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."export_import_snippet_map"
    ADD CONSTRAINT "export_import_snippet_map_export_id_fkey" FOREIGN KEY ("export_id") REFERENCES "public"."code_snippet"("id") ON DELETE CASCADE;


--
-- Name: export_import_snippet_map export_import_snippet_map_import_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."export_import_snippet_map"
    ADD CONSTRAINT "export_import_snippet_map_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."code_snippet"("id") ON DELETE CASCADE;


--
-- Name: long_term_memory long_term_memory_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."long_term_memory"
    ADD CONSTRAINT "long_term_memory_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id");


--
-- Name: message_prompts message_prompts_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."message_prompts"
    ADD CONSTRAINT "message_prompts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id");


--
-- Name: message_prompts message_prompts_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."message_prompts"
    ADD CONSTRAINT "message_prompts_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompt"("id");


--
-- Name: messages messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: objective objective_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."objective"
    ADD CONSTRAINT "objective_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id");


--
-- Name: prices prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."prices"
    ADD CONSTRAINT "prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: prompt prompt_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."prompt"
    ADD CONSTRAINT "prompt_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id");


--
-- Name: prompt prompt_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."prompt"
    ADD CONSTRAINT "prompt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


--
-- Name: session session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."session"
    ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: short_term_memory short_term_memory_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."short_term_memory"
    ADD CONSTRAINT "short_term_memory_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id");


--
-- Name: subscriptions subscriptions_price_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_price_id_fkey" FOREIGN KEY ("price_id") REFERENCES "public"."prices"("id");


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");


--
-- Name: task task_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "public"."objective"("id");


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");


--
-- Name: prices Allow public read-only access.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public read-only access." ON "public"."prices" FOR SELECT USING (true);


--
-- Name: products Allow public read-only access.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public read-only access." ON "public"."products" FOR SELECT USING (true);


--
-- Name: subscriptions Can only view own subs data.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Can only view own subs data." ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: users Can update own user data.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Can update own user data." ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));


--
-- Name: users Can view own user data.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Can view own user data." ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));


--
-- Name: session Enable all actions for user based on user id; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable all actions for user based on user id" ON "public"."session" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: account Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON "public"."account" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: code_file Enable insert for authenticated users only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable insert for authenticated users only" ON "public"."code_file" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: code_file Enable read access for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users" ON "public"."code_file" FOR SELECT USING (true);


--
-- Name: code_snippet Enable read access for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users" ON "public"."code_snippet" FOR SELECT USING (true);


--
-- Name: session Enable read access for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read access for all users" ON "public"."session" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: code_snippet Enable read and write access for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable read and write access for all users" ON "public"."code_snippet";


--
-- Name: session Enable select for users based on user_id; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable select for users based on user_id" ON "public"."session" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: profiles Public profiles are viewable by everyone.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);


--
-- Name: ai_created_code User can do all crud actions if account or session match; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "User can do all crud actions if account or session match" ON "public"."ai_created_code" USING ((EXISTS ( SELECT 1
   FROM ( SELECT "session"."user_id"
           FROM "public"."session"
          WHERE ("ai_created_code"."session_id" = "session"."id")
        UNION
         SELECT "account"."user_id"
           FROM "public"."account"
          WHERE ("ai_created_code"."account_id" = "account"."id")) "user_id"))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ( SELECT "session"."user_id"
           FROM "public"."session"
          WHERE ("ai_created_code"."session_id" = "session"."id")
        UNION
         SELECT "account"."user_id"
           FROM "public"."account"
          WHERE ("ai_created_code"."account_id" = "account"."id")) "user_id")));


--
-- Name: ai_created_code Users can access ai generated code that is part of their sessio; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can access ai generated code that is part of their sessio" ON "public"."ai_created_code" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ( SELECT "session"."user_id"
           FROM "public"."session"
          WHERE ("ai_created_code"."session_id" = "session"."id")
        UNION
         SELECT "account"."user_id"
           FROM "public"."account"
          WHERE ("ai_created_code"."account_id" = "account"."id")) "user_id")));


--
-- Name: profiles Users can insert their own profile.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));


--
-- Name: profiles Users can update own profile.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));


--
-- Name: ai_created_code; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."ai_created_code" ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;

--
-- Name: openai_models; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."openai_models" ENABLE ROW LEVEL SECURITY;

--
-- Name: prices; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."prices" ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: session; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."session" ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA "net"; Type: ACL; Schema: -; Owner: supabase_admin
--

-- GRANT USAGE ON SCHEMA "net" TO "supabase_functions_admin";
-- GRANT USAGE ON SCHEMA "net" TO "anon";
-- GRANT USAGE ON SCHEMA "net" TO "authenticated";
-- GRANT USAGE ON SCHEMA "net" TO "service_role";


--
-- Name: SCHEMA "next_auth"; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA "next_auth" TO "service_role";


--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "vector_in"("cstring", "oid", integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_in"("cstring", "oid", integer) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_out"("extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_out"("extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_recv"("internal", "oid", integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_recv"("internal", "oid", integer) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_send"("extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_send"("extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_typmod_in"("cstring"[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_typmod_in"("cstring"[]) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "array_to_vector"(real[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."array_to_vector"(real[], integer, boolean) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "array_to_vector"(double precision[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."array_to_vector"(double precision[], integer, boolean) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "array_to_vector"(integer[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."array_to_vector"(integer[], integer, boolean) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "array_to_vector"(numeric[], integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."array_to_vector"(numeric[], integer, boolean) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_to_float4"("extensions"."vector", integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_to_float4"("extensions"."vector", integer, boolean) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector"("extensions"."vector", integer, boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector"("extensions"."vector", integer, boolean) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "algorithm_sign"("signables" "text", "secret" "text", "algorithm" "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."algorithm_sign"("signables" "text", "secret" "text", "algorithm" "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."algorithm_sign"("signables" "text", "secret" "text", "algorithm" "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."algorithm_sign"("signables" "text", "secret" "text", "algorithm" "text") TO "dashboard_user";


--
-- Name: FUNCTION "armor"("bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."armor"("bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea") TO "dashboard_user";


--
-- Name: FUNCTION "armor"("bytea", "text"[], "text"[]); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."armor"("bytea", "text"[], "text"[]) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea", "text"[], "text"[]) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."armor"("bytea", "text"[], "text"[]) TO "dashboard_user";


--
-- Name: FUNCTION "cosine_distance"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."cosine_distance"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "crypt"("text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."crypt"("text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."crypt"("text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."crypt"("text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "dearmor"("text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."dearmor"("text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."dearmor"("text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."dearmor"("text") TO "dashboard_user";


--
-- Name: FUNCTION "decrypt"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."decrypt"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."decrypt"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."decrypt"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "decrypt_iv"("bytea", "bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."decrypt_iv"("bytea", "bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."decrypt_iv"("bytea", "bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."decrypt_iv"("bytea", "bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "digest"("bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."digest"("bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."digest"("bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."digest"("bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "digest"("text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."digest"("text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."digest"("text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."digest"("text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "encrypt"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."encrypt"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."encrypt"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."encrypt"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "encrypt_iv"("bytea", "bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."encrypt_iv"("bytea", "bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."encrypt_iv"("bytea", "bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."encrypt_iv"("bytea", "bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "gen_random_bytes"(integer); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."gen_random_bytes"(integer) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."gen_random_bytes"(integer) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."gen_random_bytes"(integer) TO "dashboard_user";


--
-- Name: FUNCTION "gen_random_uuid"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."gen_random_uuid"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."gen_random_uuid"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."gen_random_uuid"() TO "dashboard_user";


--
-- Name: FUNCTION "gen_salt"("text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."gen_salt"("text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text") TO "dashboard_user";


--
-- Name: FUNCTION "gen_salt"("text", integer); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."gen_salt"("text", integer) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text", integer) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."gen_salt"("text", integer) TO "dashboard_user";


--
-- Name: FUNCTION "hmac"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."hmac"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."hmac"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."hmac"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "hmac"("text", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."hmac"("text", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."hmac"("text", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."hmac"("text", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "inner_product"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."inner_product"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "ivfflathandler"("internal"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."ivfflathandler"("internal") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "l2_distance"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."l2_distance"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "moddatetime"(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."moddatetime"() TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "pg_stat_statements"("showtext" boolean, OUT "userid" "oid", OUT "dbid" "oid", OUT "toplevel" boolean, OUT "queryid" bigint, OUT "query" "text", OUT "plans" bigint, OUT "total_plan_time" double precision, OUT "min_plan_time" double precision, OUT "max_plan_time" double precision, OUT "mean_plan_time" double precision, OUT "stddev_plan_time" double precision, OUT "calls" bigint, OUT "total_exec_time" double precision, OUT "min_exec_time" double precision, OUT "max_exec_time" double precision, OUT "mean_exec_time" double precision, OUT "stddev_exec_time" double precision, OUT "rows" bigint, OUT "shared_blks_hit" bigint, OUT "shared_blks_read" bigint, OUT "shared_blks_dirtied" bigint, OUT "shared_blks_written" bigint, OUT "local_blks_hit" bigint, OUT "local_blks_read" bigint, OUT "local_blks_dirtied" bigint, OUT "local_blks_written" bigint, OUT "temp_blks_read" bigint, OUT "temp_blks_written" bigint, OUT "blk_read_time" double precision, OUT "blk_write_time" double precision, OUT "temp_blk_read_time" double precision, OUT "temp_blk_write_time" double precision, OUT "wal_records" bigint, OUT "wal_fpi" bigint, OUT "wal_bytes" numeric, OUT "jit_functions" bigint, OUT "jit_generation_time" double precision, OUT "jit_inlining_count" bigint, OUT "jit_inlining_time" double precision, OUT "jit_optimization_count" bigint, OUT "jit_optimization_time" double precision, OUT "jit_emission_count" bigint, OUT "jit_emission_time" double precision); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pg_stat_statements"("showtext" boolean, OUT "userid" "oid", OUT "dbid" "oid", OUT "toplevel" boolean, OUT "queryid" bigint, OUT "query" "text", OUT "plans" bigint, OUT "total_plan_time" double precision, OUT "min_plan_time" double precision, OUT "max_plan_time" double precision, OUT "mean_plan_time" double precision, OUT "stddev_plan_time" double precision, OUT "calls" bigint, OUT "total_exec_time" double precision, OUT "min_exec_time" double precision, OUT "max_exec_time" double precision, OUT "mean_exec_time" double precision, OUT "stddev_exec_time" double precision, OUT "rows" bigint, OUT "shared_blks_hit" bigint, OUT "shared_blks_read" bigint, OUT "shared_blks_dirtied" bigint, OUT "shared_blks_written" bigint, OUT "local_blks_hit" bigint, OUT "local_blks_read" bigint, OUT "local_blks_dirtied" bigint, OUT "local_blks_written" bigint, OUT "temp_blks_read" bigint, OUT "temp_blks_written" bigint, OUT "blk_read_time" double precision, OUT "blk_write_time" double precision, OUT "temp_blk_read_time" double precision, OUT "temp_blk_write_time" double precision, OUT "wal_records" bigint, OUT "wal_fpi" bigint, OUT "wal_bytes" numeric, OUT "jit_functions" bigint, OUT "jit_generation_time" double precision, OUT "jit_inlining_count" bigint, OUT "jit_inlining_time" double precision, OUT "jit_optimization_count" bigint, OUT "jit_optimization_time" double precision, OUT "jit_emission_count" bigint, OUT "jit_emission_time" double precision) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements"("showtext" boolean, OUT "userid" "oid", OUT "dbid" "oid", OUT "toplevel" boolean, OUT "queryid" bigint, OUT "query" "text", OUT "plans" bigint, OUT "total_plan_time" double precision, OUT "min_plan_time" double precision, OUT "max_plan_time" double precision, OUT "mean_plan_time" double precision, OUT "stddev_plan_time" double precision, OUT "calls" bigint, OUT "total_exec_time" double precision, OUT "min_exec_time" double precision, OUT "max_exec_time" double precision, OUT "mean_exec_time" double precision, OUT "stddev_exec_time" double precision, OUT "rows" bigint, OUT "shared_blks_hit" bigint, OUT "shared_blks_read" bigint, OUT "shared_blks_dirtied" bigint, OUT "shared_blks_written" bigint, OUT "local_blks_hit" bigint, OUT "local_blks_read" bigint, OUT "local_blks_dirtied" bigint, OUT "local_blks_written" bigint, OUT "temp_blks_read" bigint, OUT "temp_blks_written" bigint, OUT "blk_read_time" double precision, OUT "blk_write_time" double precision, OUT "temp_blk_read_time" double precision, OUT "temp_blk_write_time" double precision, OUT "wal_records" bigint, OUT "wal_fpi" bigint, OUT "wal_bytes" numeric, OUT "jit_functions" bigint, OUT "jit_generation_time" double precision, OUT "jit_inlining_count" bigint, OUT "jit_inlining_time" double precision, OUT "jit_optimization_count" bigint, OUT "jit_optimization_time" double precision, OUT "jit_emission_count" bigint, OUT "jit_emission_time" double precision) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements"("showtext" boolean, OUT "userid" "oid", OUT "dbid" "oid", OUT "toplevel" boolean, OUT "queryid" bigint, OUT "query" "text", OUT "plans" bigint, OUT "total_plan_time" double precision, OUT "min_plan_time" double precision, OUT "max_plan_time" double precision, OUT "mean_plan_time" double precision, OUT "stddev_plan_time" double precision, OUT "calls" bigint, OUT "total_exec_time" double precision, OUT "min_exec_time" double precision, OUT "max_exec_time" double precision, OUT "mean_exec_time" double precision, OUT "stddev_exec_time" double precision, OUT "rows" bigint, OUT "shared_blks_hit" bigint, OUT "shared_blks_read" bigint, OUT "shared_blks_dirtied" bigint, OUT "shared_blks_written" bigint, OUT "local_blks_hit" bigint, OUT "local_blks_read" bigint, OUT "local_blks_dirtied" bigint, OUT "local_blks_written" bigint, OUT "temp_blks_read" bigint, OUT "temp_blks_written" bigint, OUT "blk_read_time" double precision, OUT "blk_write_time" double precision, OUT "temp_blk_read_time" double precision, OUT "temp_blk_write_time" double precision, OUT "wal_records" bigint, OUT "wal_fpi" bigint, OUT "wal_bytes" numeric, OUT "jit_functions" bigint, OUT "jit_generation_time" double precision, OUT "jit_inlining_count" bigint, OUT "jit_inlining_time" double precision, OUT "jit_optimization_count" bigint, OUT "jit_optimization_time" double precision, OUT "jit_emission_count" bigint, OUT "jit_emission_time" double precision) TO "dashboard_user";


--
-- Name: FUNCTION "pg_stat_statements_info"(OUT "dealloc" bigint, OUT "stats_reset" timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pg_stat_statements_info"(OUT "dealloc" bigint, OUT "stats_reset" timestamp with time zone) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements_info"(OUT "dealloc" bigint, OUT "stats_reset" timestamp with time zone) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements_info"(OUT "dealloc" bigint, OUT "stats_reset" timestamp with time zone) TO "dashboard_user";


--
-- Name: FUNCTION "pg_stat_statements_reset"("userid" "oid", "dbid" "oid", "queryid" bigint); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pg_stat_statements_reset"("userid" "oid", "dbid" "oid", "queryid" bigint) FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements_reset"("userid" "oid", "dbid" "oid", "queryid" bigint) TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pg_stat_statements_reset"("userid" "oid", "dbid" "oid", "queryid" bigint) TO "dashboard_user";


--
-- Name: FUNCTION "pgp_armor_headers"("text", OUT "key" "text", OUT "value" "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_armor_headers"("text", OUT "key" "text", OUT "value" "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_armor_headers"("text", OUT "key" "text", OUT "value" "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_armor_headers"("text", OUT "key" "text", OUT "value" "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_key_id"("bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_key_id"("bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_key_id"("bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_key_id"("bytea") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt"("bytea", "bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt"("bytea", "bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt"("bytea", "bytea", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt_bytea"("bytea", "bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt_bytea"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_decrypt_bytea"("bytea", "bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_decrypt_bytea"("bytea", "bytea", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_encrypt"("text", "bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_encrypt"("text", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt"("text", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_encrypt_bytea"("bytea", "bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_pub_encrypt_bytea"("bytea", "bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_pub_encrypt_bytea"("bytea", "bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_decrypt"("bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_decrypt"("bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt"("bytea", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_decrypt_bytea"("bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_decrypt_bytea"("bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_decrypt_bytea"("bytea", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_encrypt"("text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_encrypt"("text", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt"("text", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_encrypt_bytea"("bytea", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text") TO "dashboard_user";


--
-- Name: FUNCTION "pgp_sym_encrypt_bytea"("bytea", "text", "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text", "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text", "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."pgp_sym_encrypt_bytea"("bytea", "text", "text") TO "dashboard_user";


--
-- Name: FUNCTION "sign"("payload" "json", "secret" "text", "algorithm" "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."sign"("payload" "json", "secret" "text", "algorithm" "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."sign"("payload" "json", "secret" "text", "algorithm" "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."sign"("payload" "json", "secret" "text", "algorithm" "text") TO "dashboard_user";


--
-- Name: FUNCTION "try_cast_double"("inp" "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."try_cast_double"("inp" "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."try_cast_double"("inp" "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."try_cast_double"("inp" "text") TO "dashboard_user";


--
-- Name: FUNCTION "url_decode"("data" "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."url_decode"("data" "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."url_decode"("data" "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."url_decode"("data" "text") TO "dashboard_user";


--
-- Name: FUNCTION "url_encode"("data" "bytea"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."url_encode"("data" "bytea") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."url_encode"("data" "bytea") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."url_encode"("data" "bytea") TO "dashboard_user";


--
-- Name: FUNCTION "uuid_generate_v1"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_generate_v1"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_generate_v1mc"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_generate_v1mc"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1mc"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v1mc"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_generate_v3"("namespace" "uuid", "name" "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_generate_v3"("namespace" "uuid", "name" "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v3"("namespace" "uuid", "name" "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v3"("namespace" "uuid", "name" "text") TO "dashboard_user";


--
-- Name: FUNCTION "uuid_generate_v4"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_generate_v4"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v4"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v4"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_generate_v5"("namespace" "uuid", "name" "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_generate_v5"("namespace" "uuid", "name" "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v5"("namespace" "uuid", "name" "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_generate_v5"("namespace" "uuid", "name" "text") TO "dashboard_user";


--
-- Name: FUNCTION "uuid_nil"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_nil"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_nil"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_nil"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_ns_dns"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_ns_dns"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_dns"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_dns"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_ns_oid"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_ns_oid"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_oid"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_oid"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_ns_url"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_ns_url"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_url"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_url"() TO "dashboard_user";


--
-- Name: FUNCTION "uuid_ns_x500"(); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."uuid_ns_x500"() FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_x500"() TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."uuid_ns_x500"() TO "dashboard_user";


--
-- Name: FUNCTION "vector_accum"(double precision[], "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_accum"(double precision[], "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_add"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_add"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_avg"(double precision[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_avg"(double precision[]) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_cmp"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_cmp"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_combine"(double precision[], double precision[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_combine"(double precision[], double precision[]) TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_dims"("extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_dims"("extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_eq"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_eq"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_ge"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_ge"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_gt"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_gt"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_l2_squared_distance"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_l2_squared_distance"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_le"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_le"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_lt"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_lt"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_ne"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_ne"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_negative_inner_product"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_negative_inner_product"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_norm"("extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_norm"("extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_spherical_distance"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_spherical_distance"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "vector_sub"("extensions"."vector", "extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."vector_sub"("extensions"."vector", "extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: FUNCTION "verify"("token" "text", "secret" "text", "algorithm" "text"); Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON FUNCTION "extensions"."verify"("token" "text", "secret" "text", "algorithm" "text") FROM "postgres";
-- GRANT ALL ON FUNCTION "extensions"."verify"("token" "text", "secret" "text", "algorithm" "text") TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON FUNCTION "extensions"."verify"("token" "text", "secret" "text", "algorithm" "text") TO "dashboard_user";


--
-- Name: FUNCTION "comment_directive"("comment_" "text"); Type: ACL; Schema: graphql; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "graphql"."comment_directive"("comment_" "text") TO "postgres";
-- GRANT ALL ON FUNCTION "graphql"."comment_directive"("comment_" "text") TO "anon";
-- GRANT ALL ON FUNCTION "graphql"."comment_directive"("comment_" "text") TO "authenticated";
-- GRANT ALL ON FUNCTION "graphql"."comment_directive"("comment_" "text") TO "service_role";


--
-- Name: FUNCTION "exception"("message" "text"); Type: ACL; Schema: graphql; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "graphql"."exception"("message" "text") TO "postgres";
-- GRANT ALL ON FUNCTION "graphql"."exception"("message" "text") TO "anon";
-- GRANT ALL ON FUNCTION "graphql"."exception"("message" "text") TO "authenticated";
-- GRANT ALL ON FUNCTION "graphql"."exception"("message" "text") TO "service_role";


--
-- Name: FUNCTION "get_schema_version"(); Type: ACL; Schema: graphql; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "graphql"."get_schema_version"() TO "postgres";
-- GRANT ALL ON FUNCTION "graphql"."get_schema_version"() TO "anon";
-- GRANT ALL ON FUNCTION "graphql"."get_schema_version"() TO "authenticated";
-- GRANT ALL ON FUNCTION "graphql"."get_schema_version"() TO "service_role";


--
-- Name: FUNCTION "increment_schema_version"(); Type: ACL; Schema: graphql; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "graphql"."increment_schema_version"() TO "postgres";
-- GRANT ALL ON FUNCTION "graphql"."increment_schema_version"() TO "anon";
-- GRANT ALL ON FUNCTION "graphql"."increment_schema_version"() TO "authenticated";
-- GRANT ALL ON FUNCTION "graphql"."increment_schema_version"() TO "service_role";


--
-- Name: FUNCTION "graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb"); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "postgres";
-- GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "anon";
-- GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "authenticated";
-- GRANT ALL ON FUNCTION "graphql_public"."graphql"("operationName" "text", "query" "text", "variables" "jsonb", "extensions" "jsonb") TO "service_role";


--
-- Name: FUNCTION "http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer); Type: ACL; Schema: net; Owner: supabase_admin
--

-- REVOKE ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) FROM PUBLIC;
-- GRANT ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "supabase_functions_admin";
-- GRANT ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "postgres";
-- GRANT ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "anon";
-- GRANT ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "authenticated";
-- GRANT ALL ON FUNCTION "net"."http_get"("url" "text", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "service_role";


--
-- Name: FUNCTION "http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer); Type: ACL; Schema: net; Owner: supabase_admin
--

-- REVOKE ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) FROM PUBLIC;
-- GRANT ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "supabase_functions_admin";
-- GRANT ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "postgres";
-- GRANT ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "anon";
-- GRANT ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "authenticated";
-- GRANT ALL ON FUNCTION "net"."http_post"("url" "text", "body" "jsonb", "params" "jsonb", "headers" "jsonb", "timeout_milliseconds" integer) TO "service_role";


--
-- Name: FUNCTION "crypto_aead_det_decrypt"("message" "bytea", "additional" "bytea", "key_uuid" "uuid", "nonce" "bytea"); Type: ACL; Schema: pgsodium; Owner: pgsodium_keymaker
--

-- GRANT ALL ON FUNCTION "pgsodium"."crypto_aead_det_decrypt"("message" "bytea", "additional" "bytea", "key_uuid" "uuid", "nonce" "bytea") TO "service_role";


--
-- Name: FUNCTION "crypto_aead_det_encrypt"("message" "bytea", "additional" "bytea", "key_uuid" "uuid", "nonce" "bytea"); Type: ACL; Schema: pgsodium; Owner: pgsodium_keymaker
--

-- GRANT ALL ON FUNCTION "pgsodium"."crypto_aead_det_encrypt"("message" "bytea", "additional" "bytea", "key_uuid" "uuid", "nonce" "bytea") TO "service_role";


--
-- Name: FUNCTION "crypto_aead_det_keygen"(); Type: ACL; Schema: pgsodium; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "pgsodium"."crypto_aead_det_keygen"() TO "service_role";


--
-- Name: TABLE "code_snippet"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."code_snippet" TO "anon";
GRANT ALL ON TABLE "public"."code_snippet" TO "authenticated";
GRANT ALL ON TABLE "public"."code_snippet" TO "service_role";


--
-- Name: FUNCTION "find_long_snippets"("line_count" integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."find_long_snippets"("line_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_long_snippets"("line_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_long_snippets"("line_count" integer) TO "service_role";


--
-- Name: FUNCTION "handle_new_user"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


--
-- Name: FUNCTION "match_code"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer); Type: ACL; Schema: public; Owner: postgres
--

-- GRANT ALL ON FUNCTION "public"."match_code"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "anon";
-- GRANT ALL ON FUNCTION "public"."match_code"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."match_code"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "service_role";


--
-- Name: FUNCTION "match_code_directory"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer); Type: ACL; Schema: public; Owner: postgres
--

-- GRANT ALL ON FUNCTION "public"."match_code_directory"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "anon";
-- GRANT ALL ON FUNCTION "public"."match_code_directory"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."match_code_directory"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "service_role";


--
-- Name: FUNCTION "match_code_file"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer); Type: ACL; Schema: public; Owner: postgres
--

-- GRANT ALL ON FUNCTION "public"."match_code_file"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "anon";
-- GRANT ALL ON FUNCTION "public"."match_code_file"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."match_code_file"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "service_role";


--
-- Name: FUNCTION "match_code_snippet_explaination"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer); Type: ACL; Schema: public; Owner: postgres
--

-- GRANT ALL ON FUNCTION "public"."match_code_snippet_explaination"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "anon";
-- GRANT ALL ON FUNCTION "public"."match_code_snippet_explaination"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."match_code_snippet_explaination"("accountid" "uuid", "query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "service_role";


--
-- Name: FUNCTION "match_documents"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer); Type: ACL; Schema: public; Owner: postgres
--

-- GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "anon";
-- GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer) TO "service_role";


--
-- Name: FUNCTION "match_long_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "accountid" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

-- GRANT ALL ON FUNCTION "public"."match_long_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "accountid" "uuid") TO "anon";
-- GRANT ALL ON FUNCTION "public"."match_long_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "accountid" "uuid") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."match_long_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "accountid" "uuid") TO "service_role";


--
-- Name: FUNCTION "match_short_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "sessionid" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

-- GRANT ALL ON FUNCTION "public"."match_short_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "sessionid" "uuid") TO "anon";
-- GRANT ALL ON FUNCTION "public"."match_short_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "sessionid" "uuid") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."match_short_term_memory"("query_embedding" "extensions"."vector", "similarity_threshold" double precision, "match_count" integer, "sessionid" "uuid") TO "service_role";


--
-- Name: FUNCTION "avg"("extensions"."vector"); Type: ACL; Schema: extensions; Owner: supabase_admin
--

-- GRANT ALL ON FUNCTION "extensions"."avg"("extensions"."vector") TO "postgres" WITH GRANT OPTION;


--
-- Name: TABLE "pg_stat_statements"; Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON TABLE "extensions"."pg_stat_statements" FROM "postgres";
-- GRANT ALL ON TABLE "extensions"."pg_stat_statements" TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON TABLE "extensions"."pg_stat_statements" TO "dashboard_user";


--
-- Name: TABLE "pg_stat_statements_info"; Type: ACL; Schema: extensions; Owner: postgres
--

-- REVOKE ALL ON TABLE "extensions"."pg_stat_statements_info" FROM "postgres";
-- GRANT ALL ON TABLE "extensions"."pg_stat_statements_info" TO "postgres" WITH GRANT OPTION;
-- GRANT ALL ON TABLE "extensions"."pg_stat_statements_info" TO "dashboard_user";


--
-- Name: SEQUENCE "seq_schema_version"; Type: ACL; Schema: graphql; Owner: supabase_admin
--

-- GRANT ALL ON SEQUENCE "graphql"."seq_schema_version" TO "postgres";
-- GRANT ALL ON SEQUENCE "graphql"."seq_schema_version" TO "anon";
-- GRANT ALL ON SEQUENCE "graphql"."seq_schema_version" TO "authenticated";
-- GRANT ALL ON SEQUENCE "graphql"."seq_schema_version" TO "service_role";


--
-- Name: TABLE "accounts"; Type: ACL; Schema: next_auth; Owner: postgres
--

GRANT ALL ON TABLE "next_auth"."accounts" TO "service_role";


--
-- Name: TABLE "sessions"; Type: ACL; Schema: next_auth; Owner: postgres
--

GRANT ALL ON TABLE "next_auth"."sessions" TO "service_role";


--
-- Name: TABLE "users"; Type: ACL; Schema: next_auth; Owner: postgres
--

GRANT ALL ON TABLE "next_auth"."users" TO "service_role";


--
-- Name: TABLE "verification_tokens"; Type: ACL; Schema: next_auth; Owner: postgres
--

GRANT ALL ON TABLE "next_auth"."verification_tokens" TO "service_role";


--
-- Name: TABLE "decrypted_key"; Type: ACL; Schema: pgsodium; Owner: supabase_admin
--

-- GRANT ALL ON TABLE "pgsodium"."decrypted_key" TO "pgsodium_keyholder";


--
-- Name: TABLE "masking_rule"; Type: ACL; Schema: pgsodium; Owner: supabase_admin
--

-- GRANT ALL ON TABLE "pgsodium"."masking_rule" TO "pgsodium_keyholder";


--
-- Name: TABLE "mask_columns"; Type: ACL; Schema: pgsodium; Owner: supabase_admin
--

-- GRANT ALL ON TABLE "pgsodium"."mask_columns" TO "pgsodium_keyholder";


--
-- Name: TABLE "account"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."account" TO "anon";
GRANT ALL ON TABLE "public"."account" TO "authenticated";
GRANT ALL ON TABLE "public"."account" TO "service_role";


--
-- Name: TABLE "ai_created_code"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."ai_created_code" TO "anon";
GRANT ALL ON TABLE "public"."ai_created_code" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_created_code" TO "service_role";


--
-- Name: TABLE "app_helper_messages"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."app_helper_messages" TO "anon";
GRANT ALL ON TABLE "public"."app_helper_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."app_helper_messages" TO "service_role";


--
-- Name: SEQUENCE "app_helper_messages_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."app_helper_messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."app_helper_messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."app_helper_messages_id_seq" TO "service_role";


--
-- Name: SEQUENCE "code_snippet_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."code_snippet_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."code_snippet_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."code_snippet_id_seq" TO "service_role";


--
-- Name: TABLE "code_directory"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."code_directory" TO "anon";
GRANT ALL ON TABLE "public"."code_directory" TO "authenticated";
GRANT ALL ON TABLE "public"."code_directory" TO "service_role";


--
-- Name: TABLE "code_file"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."code_file" TO "anon";
GRANT ALL ON TABLE "public"."code_file" TO "authenticated";
GRANT ALL ON TABLE "public"."code_file" TO "service_role";


--
-- Name: TABLE "customers"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";


--
-- Name: TABLE "export_import_snippet_map"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."export_import_snippet_map" TO "anon";
GRANT ALL ON TABLE "public"."export_import_snippet_map" TO "authenticated";
GRANT ALL ON TABLE "public"."export_import_snippet_map" TO "service_role";


--
-- Name: TABLE "long_term_memory"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."long_term_memory" TO "anon";
GRANT ALL ON TABLE "public"."long_term_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."long_term_memory" TO "service_role";


--
-- Name: TABLE "message_prompts"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."message_prompts" TO "anon";
GRANT ALL ON TABLE "public"."message_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."message_prompts" TO "service_role";


--
-- Name: TABLE "messages"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";


--
-- Name: TABLE "objective"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."objective" TO "anon";
GRANT ALL ON TABLE "public"."objective" TO "authenticated";
GRANT ALL ON TABLE "public"."objective" TO "service_role";


--
-- Name: TABLE "openai_models"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."openai_models" TO "anon";
GRANT ALL ON TABLE "public"."openai_models" TO "authenticated";
GRANT ALL ON TABLE "public"."openai_models" TO "service_role";


--
-- Name: TABLE "prices"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."prices" TO "anon";
GRANT ALL ON TABLE "public"."prices" TO "authenticated";
GRANT ALL ON TABLE "public"."prices" TO "service_role";


--
-- Name: TABLE "products"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";


--
-- Name: TABLE "profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";


--
-- Name: TABLE "prompt"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."prompt" TO "anon";
GRANT ALL ON TABLE "public"."prompt" TO "authenticated";
GRANT ALL ON TABLE "public"."prompt" TO "service_role";


--
-- Name: TABLE "session"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."session" TO "anon";
GRANT ALL ON TABLE "public"."session" TO "authenticated";
GRANT ALL ON TABLE "public"."session" TO "service_role";


--
-- Name: TABLE "short_term_memory"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."short_term_memory" TO "anon";
GRANT ALL ON TABLE "public"."short_term_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."short_term_memory" TO "service_role";


--
-- Name: TABLE "subscriptions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";


--
-- Name: TABLE "task"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."task" TO "anon";
GRANT ALL ON TABLE "public"."task" TO "authenticated";
GRANT ALL ON TABLE "public"."task" TO "service_role";


--
-- Name: TABLE "users"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";


--
-- Name: TABLE "wait_list"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."wait_list" TO "anon";
GRANT ALL ON TABLE "public"."wait_list" TO "authenticated";
GRANT ALL ON TABLE "public"."wait_list" TO "service_role";


--
-- Name: SEQUENCE "wait_list_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."wait_list_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wait_list_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wait_list_id_seq" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";


--
-- PostgreSQL database dump complete
--

RESET ALL;
