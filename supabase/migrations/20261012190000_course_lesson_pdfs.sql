ALTER TABLE public.course_lessons
  ADD COLUMN pdf_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-materials', 'course-materials', true, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public read course materials" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'course-materials');
CREATE POLICY "Admins upload course materials" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update course materials" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete course materials" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));
