-- جدول تحليل النصوص
CREATE TABLE IF NOT EXISTS text_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_text TEXT NOT NULL,
    simplified_text TEXT,
    definitions JSONB DEFAULT '[]',
    tashkeel_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهرس للبحث في النصوص
CREATE INDEX idx_text_analyses_created_at ON text_analyses(created_at);
CREATE INDEX idx_text_analyses_original_text ON text_analyses USING gin(to_tsvector('arabic', original_text));