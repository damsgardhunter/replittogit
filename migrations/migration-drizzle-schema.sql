CREATE TABLE IF NOT EXISTS "users" (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT sql`gen_random_uuid(,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL
);