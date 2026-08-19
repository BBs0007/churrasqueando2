REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;