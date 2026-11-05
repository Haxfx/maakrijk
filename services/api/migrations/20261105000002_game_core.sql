-- Shared game core (docs/build/contracts/0.2-game-core.md): immutable scenario
-- definitions, one game instance per profile and scenario, idempotent command
-- log and the coin ledger.

CREATE TABLE scenario_definitions (
    scenario_id  text    NOT NULL,
    version      integer NOT NULL CHECK (version > 0),
    hash         bytea   NOT NULL CHECK (octet_length(hash) = 32),
    manifest     jsonb   NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (scenario_id, version)
);

CREATE TABLE game_instances (
    id                uuid PRIMARY KEY,
    profile_id        uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    scenario_id       text    NOT NULL,
    scenario_version  integer NOT NULL,
    ruleset_id        text    NOT NULL,
    ruleset_version   integer NOT NULL,
    revision          bigint  NOT NULL DEFAULT 0 CHECK (revision >= 0),
    coins             bigint  NOT NULL CHECK (coins >= 0),
    state             jsonb   NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (scenario_id, scenario_version) REFERENCES scenario_definitions (scenario_id, version),
    UNIQUE (profile_id, scenario_id)
);

CREATE TABLE game_commands (
    instance_id   uuid  NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
    command_id    uuid  NOT NULL,
    payload_hash  bytea NOT NULL CHECK (octet_length(payload_hash) = 32),
    response      jsonb NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (instance_id, command_id)
);

CREATE TABLE economy_transactions (
    id             uuid PRIMARY KEY,
    instance_id    uuid   NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
    kind           text   NOT NULL CHECK (char_length(kind) BETWEEN 1 AND 32),
    amount         bigint NOT NULL CHECK (amount <> 0),
    reference      text   NOT NULL CHECK (char_length(reference) BETWEEN 1 AND 128),
    command_id     uuid,
    revision       bigint NOT NULL,
    balance_after  bigint NOT NULL CHECK (balance_after >= 0),
    created_at     timestamptz NOT NULL DEFAULT now(),
    -- One booking per economic reference: a sale or purchase can never be paid twice.
    UNIQUE (instance_id, reference)
);
CREATE INDEX economy_transactions_instance_idx ON economy_transactions (instance_id, revision);
