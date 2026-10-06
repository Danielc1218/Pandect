-- The web app reads the shared question bank with the secret key (service_role) so the reads can be cached
-- for every user (web/lib/bank.ts). The tables were granted in api_grants; these two views were not.
GRANT SELECT ON question_type_counts, test_sections TO service_role;
