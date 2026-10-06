-- The reasoning behind a question's answer: why the correct choice is right and the others are wrong.
-- Generated questions carry one (scripts/import_generated.py); other-bank ones do not, so it is nullable.
-- The web app only shows it once the question has been answered.
ALTER TABLE questions ADD COLUMN explanation TEXT;
