-- Add author column to posts table
ALTER TABLE posts ADD COLUMN author TEXT NOT NULL DEFAULT 'sam';

-- Update existing posts with null author to 'sam'
UPDATE posts SET author = 'sam' WHERE author IS NULL;
