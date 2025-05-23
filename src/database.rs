use crate::models::TextAnalysis;
use anyhow::Result;
use sqlx::PgPool;
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
        // استخدام query! بدلاً من query_as! للتحكم أكثر
        let row = sqlx::query!(
            "SELECT id, original_text, simplified_text, definitions, tashkeel_text, created_at, updated_at FROM text_analyses WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let analysis = TextAnalysis {
                id: row.id,
                original_text: row.original_text,
                simplified_text: row.simplified_text,
                definitions: row.definitions.unwrap_or_else(|| serde_json::json!([])),
                tashkeel_text: row.tashkeel_text,
                created_at: row.created_at,
                updated_at: row.updated_at,
            };
            Ok(Some(analysis))
        } else {
            Ok(None)
        }
    }

    pub async fn get_recent_analyses(&self, limit: i64) -> Result<Vec<TextAnalysis>> {
        let rows = sqlx::query!(
            "SELECT id, original_text, simplified_text, definitions, tashkeel_text, created_at, updated_at FROM text_analyses ORDER BY created_at DESC LIMIT $1",
            limit
        )
        .fetch_all(&self.pool)
        .await?;

        let analyses = rows
            .into_iter()
            .map(|row| TextAnalysis {
                id: row.id,
                original_text: row.original_text,
                simplified_text: row.simplified_text,
                definitions: row.definitions.unwrap_or_else(|| serde_json::json!([])),
                tashkeel_text: row.tashkeel_text,
                created_at: row.created_at,
                updated_at: row.updated_at,
            })
            .collect();

        Ok(analyses)
    }
}
