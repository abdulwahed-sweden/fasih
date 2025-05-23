use crate::models::TextAnalysis;
use anyhow::Result;
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct Database {
    pool: PgPool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = PgPool::connect(database_url).await?;

        // تشغيل migrations
        sqlx::migrate!("./migrations").run(&pool).await?;

        Ok(Database { pool })
    }

    pub async fn save_analysis(
        &self,
        original_text: &str,
        simplified_text: &str,
        definitions: &[String],
        tashkeel_text: &str,
    ) -> Result<Uuid> {
        let id = Uuid::new_v4();
        let definitions_json = serde_json::to_value(definitions)?;

        sqlx::query!(
            r#"
            INSERT INTO text_analyses (id, original_text, simplified_text, definitions, tashkeel_text)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            id,
            original_text,
            simplified_text,
            definitions_json,
            tashkeel_text
        )
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    pub async fn get_analysis(&self, id: Uuid) -> Result<Option<TextAnalysis>> {
        let analysis = sqlx::query_as!(
            TextAnalysis,
            "SELECT * FROM text_analyses WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(analysis)
    }

    pub async fn get_recent_analyses(&self, limit: i64) -> Result<Vec<TextAnalysis>> {
        let analyses = sqlx::query_as!(
            TextAnalysis,
            "SELECT * FROM text_analyses ORDER BY created_at DESC LIMIT $1",
            limit
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(analyses)
    }
}
