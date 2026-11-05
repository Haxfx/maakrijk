-- Anonymous households, their sign-in sessions and child profiles.
-- No real names, e-mail or other personal data: a nickname and an avatar id.

CREATE TABLE households (
    id          uuid PRIMARY KEY,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Only the SHA-256 hash of a session token is stored.
CREATE TABLE auth_sessions (
    token_hash    bytea PRIMARY KEY CHECK (octet_length(token_hash) = 32),
    household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_seen_at  timestamptz NOT NULL DEFAULT now(),
    expires_at    timestamptz NOT NULL
);
CREATE INDEX auth_sessions_household_idx ON auth_sessions (household_id);

CREATE TABLE profiles (
    id            uuid PRIMARY KEY,
    household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    nickname      text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 20),
    avatar        text NOT NULL CHECK (char_length(avatar) BETWEEN 1 AND 32),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_household_idx ON profiles (household_id, created_at);
-- Two children in one household cannot share a nickname (case-insensitive).
CREATE UNIQUE INDEX profiles_household_nickname_uq ON profiles (household_id, lower(nickname));
