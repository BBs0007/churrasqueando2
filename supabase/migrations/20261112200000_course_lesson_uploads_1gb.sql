INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('course-videos', 'course-videos', true, 1073741824),
  ('course-materials', 'course-materials', true, 1073741824)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;
