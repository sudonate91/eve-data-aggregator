-- Add unique constraint on tokens.job so token upserts update the existing row
-- instead of inserting duplicates.
--
-- For each database:
--   Step 1: Deduplicate — keep only the most recent row per job (highest id).
--   Step 2: Add the unique index.

SET SQL_SAFE_UPDATES = 0;

-- ─── S0b ─────────────────────────────────────────────────────────────────────
USE S0b;

DELETE t1
FROM tokens t1
INNER JOIN tokens t2
  ON t1.job = t2.job
 AND t1.id < t2.id;

ALTER TABLE tokens
  ADD UNIQUE INDEX uq_tokens_job (job);

-- ─── S0b_Struct ──────────────────────────────────────────────────────────────
USE S0b_Struct;

DELETE t1
FROM tokens t1
INNER JOIN tokens t2
  ON t1.job = t2.job
 AND t1.id < t2.id;

ALTER TABLE tokens
  ADD UNIQUE INDEX uq_tokens_job (job);

-- ─── Ven0m ───────────────────────────────────────────────────────────────────
USE Ven0m;

DELETE t1
FROM tokens t1
INNER JOIN tokens t2
  ON t1.job = t2.job
 AND t1.id < t2.id;

ALTER TABLE tokens
  ADD UNIQUE INDEX uq_tokens_job (job);

-- ─── KryTek ──────────────────────────────────────────────────────────────────
USE KryTek;

DELETE t1
FROM tokens t1
INNER JOIN tokens t2
  ON t1.job = t2.job
 AND t1.id < t2.id;

ALTER TABLE tokens
  ADD UNIQUE INDEX uq_tokens_job (job);

-- ─── S0b_Mart ────────────────────────────────────────────────────────────────
USE S0b_Mart;

DELETE t1
FROM tokens t1
INNER JOIN tokens t2
  ON t1.job = t2.job
 AND t1.id < t2.id;

ALTER TABLE tokens
  ADD UNIQUE INDEX uq_tokens_job (job);

SET SQL_SAFE_UPDATES = 1;
