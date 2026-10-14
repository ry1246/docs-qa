CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id		bigserial PRIMARY KEY,
  source_path   text NOT NULL,
  heading	text NOT NULL,
  chunk_index	integer NOT NULL,
  content	text NOT NULL,
  content_hash	text NOT NULL,
  embedding	vector(1024) NOT NULL,
  UNIQUE (source_path, chunk_index)
);

CREATE INDEX chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX chunks_source_path_idx ON chunks (source_path);
