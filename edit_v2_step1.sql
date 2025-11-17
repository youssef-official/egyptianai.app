-- ==================================================================================
-- SQL Fix for "Database Error For Saving a new user" - STEP 1 of 2
-- This step safely adds the new ENUM value 'hospital' and must be committed.
-- ==================================================================================

-- 1. Safely update user_type ENUM to include 'hospital'
-- This command must be executed and committed before any function/check uses the new value.
ALTER TYPE public.user_type ADD VALUE 'hospital' AFTER 'doctor';

-- 2. Update user_roles table CHECK constraint to include 'hospital'
-- This can be done in the same step as it's a DDL change on a table constraint.
ALTER TABLE public.user_roles
DROP CONSTRAINT user_roles_role_check,
ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'user', 'doctor', 'hospital'));

-- ==================================================================================
-- END OF STEP 1
-- **IMPORTANT**: Run this file first, ensure it succeeds, and then run STEP 2.
-- ==================================================================================
