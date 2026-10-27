UPDATE storage.buckets
SET file_size_limit = 314572800,
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/ogg'
    ]
WHERE id = 'club-content';
