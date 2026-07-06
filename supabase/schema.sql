-- ============================================
-- KANBAN BOARD — SUPABASE SCHEMA
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Enable UUID generation (for auto-creating unique IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================
-- 1. TASKS — the core table, one row per card
-- ============================================
-- status: which column the card is in
-- position: order within that column (0 = top)
-- completed_at: managed by Go backend (set when
--   moved to 'done', cleared when moved back)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high')),
  due_date DATE,
  "position" INTEGER NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================
-- 2. LABELS — colored tags (e.g. "Feature", "Bug")
-- ============================================
-- Each user creates their own labels.
-- color stores a hex value like '#378ADD'
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#378ADD',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================
-- 3. TASK_LABELS — many-to-many join table
-- ============================================
-- A task can have multiple labels.
-- A label can be on multiple tasks.
-- UNIQUE constraint prevents duplicate assignments.
CREATE TABLE task_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  UNIQUE(task_id, label_id)
);


-- ============================================
-- 4. TEAM MEMBERS — people who can be assigned
-- ============================================
-- These are NOT real auth users — just names the board owner creates to assign to tasks.
-- avatar_color: user-chosen, persisted as preference
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#378ADD',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================
-- 5. TASK_ASSIGNEES — many-to-many join table
-- ============================================
-- A task can have multiple assignees. A member can be on multiple tasks.
CREATE TABLE task_assignees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  UNIQUE(task_id, member_id)
);


-- ============================================
-- 6. COMMENTS — threaded on a task
-- ============================================
-- author_name: fallback display name for anonymous users.
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Guest',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================
-- 7. ACTIVITY LOG — audit trail per task
-- ============================================
-- Tracks events like "created", "status_changed", "commented", "priority_changed".
-- details: JSONB for flexible metadata (e.g. {"new_status": "in_progress"})
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================
-- INDEXES — speed up common queries
-- ============================================
-- We frequently filter tasks by user, status, and position
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_position ON tasks("position");
CREATE INDEX idx_labels_user_id ON labels(user_id);
CREATE INDEX idx_task_labels_task_id ON task_labels(task_id);
CREATE INDEX idx_task_labels_label_id ON task_labels(label_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_activity_log_task_id ON activity_log(task_id);


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- This is what makes the app secure. Each user can only see and modify their own data.
-- Supabase checks auth.uid() (from the JWT token) against the user_id column on every query.

-- Turn on RLS for all tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- TASKS: users can only CRUD their own tasks
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tasks"
  ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE USING (auth.uid() = user_id);

-- LABELS: users can only CRUD their own labels
CREATE POLICY "Users can view their own labels"
  ON labels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own labels"
  ON labels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own labels"
  ON labels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own labels"
  ON labels FOR DELETE USING (auth.uid() = user_id);

-- TASK_LABELS: access based on task ownership
-- (if you own the task, you can manage its labels)
CREATE POLICY "Users can view task_labels for their tasks"
  ON task_labels FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_labels.task_id
    AND tasks.user_id = auth.uid()
  ));
CREATE POLICY "Users can create task_labels for their tasks"
  ON task_labels FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_labels.task_id
    AND tasks.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete task_labels for their tasks"
  ON task_labels FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_labels.task_id
    AND tasks.user_id = auth.uid()
  ));

-- TEAM_MEMBERS: users can only CRUD their own members
CREATE POLICY "Users can view their own team members"
  ON team_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own team members"
  ON team_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own team members"
  ON team_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own team members"
  ON team_members FOR DELETE USING (auth.uid() = user_id);

-- TASK_ASSIGNEES: access based on task ownership
CREATE POLICY "Users can view task_assignees for their tasks"
  ON task_assignees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_assignees.task_id
    AND tasks.user_id = auth.uid()
  ));
CREATE POLICY "Users can create task_assignees for their tasks"
  ON task_assignees FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_assignees.task_id
    AND tasks.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete task_assignees for their tasks"
  ON task_assignees FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_assignees.task_id
    AND tasks.user_id = auth.uid()
  ));

-- COMMENTS: view if you own the task, delete only your own
CREATE POLICY "Users can view comments on their tasks"
  ON comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = comments.task_id
    AND tasks.user_id = auth.uid()
  ));
CREATE POLICY "Users can create comments on their tasks"
  ON comments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = comments.task_id
    AND tasks.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE USING (auth.uid() = user_id);

-- ACTIVITY_LOG: view and create for your own tasks
CREATE POLICY "Users can view activity for their tasks"
  ON activity_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = activity_log.task_id
    AND tasks.user_id = auth.uid()
  ));
CREATE POLICY "Users can create activity for their tasks"
  ON activity_log FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = activity_log.task_id
    AND tasks.user_id = auth.uid()
  ));


-- ============================================
-- TRIGGERS
-- ============================================
-- updated_at — every update should refresh the timestamp regardless of what changed.

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();