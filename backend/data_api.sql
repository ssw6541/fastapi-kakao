-- Expose only the minimal profile function, never the private tables.
CREATE SCHEMA IF NOT EXISTS app_api;
REVOKE ALL ON SCHEMA app_api FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_api TO service_role;

CREATE OR REPLACE FUNCTION app_api.current_user_profile(p_token_hash text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT row_to_json(profile)
    FROM (
        SELECT u.id, u.name, u.email
        FROM fastapi_kakao.users AS u
        JOIN fastapi_kakao.sessions AS s ON s.user_id = u.id
        WHERE s.token_hash = p_token_hash
          AND s.expires_at > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
    ) AS profile;
$$;
REVOKE ALL ON FUNCTION app_api.current_user_profile(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_api.current_user_profile(text) TO service_role;
