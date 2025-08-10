-- Migration to rename organization tables to workspace tables
-- This migration renames the existing org/org_users tables to workspaces/workspace_users

-- First, create the new workspace tables
CREATE TABLE IF NOT EXISTS "workspaces" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "name" text,
    "description" text,
    "owner_user_id" uuid NOT NULL,
    "metadata" jsonb DEFAULT '{}' NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspace_users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "workspace_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" text DEFAULT '' NOT NULL,
    "metadata" jsonb DEFAULT '{}' NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspace_invites" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "workspace_id" uuid NOT NULL,
    "roles" text[] DEFAULT '{}' NOT NULL,
    "invited_by" uuid NOT NULL,
    "user_id" uuid,
    "accepted_at" timestamp with time zone
);

-- Migrate data from old tables to new tables (if they exist)
DO $$
BEGIN
    -- Check if old tables exist and migrate data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orgs') THEN
        INSERT INTO workspaces (id, created_at, updated_at, name, description, owner_user_id, metadata)
        SELECT id, created_at, COALESCE(updated_at, created_at), name, description, owner_user_id, COALESCE(metadata, '{}')
        FROM orgs;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'org_users') THEN
        INSERT INTO workspace_users (id, created_at, updated_at, workspace_id, user_id, role, metadata)
        SELECT 
            gen_random_uuid(), -- Generate new IDs if old table doesn't have them
            COALESCE(created_at, now()), 
            COALESCE(updated_at, now()),
            org_id, 
            user_id, 
            COALESCE(role, ''), 
            '{}'
        FROM org_users;
    END IF;
END $$;

-- Add foreign key constraints
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk" 
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_workspace_id_workspaces_id_fk" 
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" 
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_invited_by_users_id_fk" 
    FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

-- Enable RLS for the new tables
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_invites" ENABLE ROW LEVEL SECURITY;

-- Drop old tables if they exist (uncomment these lines when ready to remove old tables)
-- DROP TABLE IF EXISTS "org_users";
-- DROP TABLE IF EXISTS "orgs";
