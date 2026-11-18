-- PT-2 : un avancement saisi à la main porte sa justification, datée et signée
ALTER TABLE plan_activities ADD COLUMN progress_note TEXT NOT NULL DEFAULT '';
ALTER TABLE plan_activities ADD COLUMN progress_noted_at TIMESTAMPTZ;
ALTER TABLE plan_activities ADD COLUMN progress_noted_by TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX plan_activities_progress_noted_by_idx ON plan_activities (progress_noted_by);
