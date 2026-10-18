-- Development only: the owner the "Dev Bypass Login" button signs in as
-- (fixed id used in app/(auth)/login/page.tsx). Never applied in production.
INSERT INTO users (id, cognito_sub, name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'dev-sub-001', 'Krishna Sindha', 'owner')
ON CONFLICT (id) DO NOTHING;
