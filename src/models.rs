use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyzeRequest {
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyzeResponse {
    pub id: Uuid,
    pub original_text: String,
    pub simplified_text: String,
    pub definitions: Vec<String>,
    pub tashkeel_text: String,
}

#[derive(Debug, FromRow, Serialize)]
pub struct TextAnalysis {
    pub id: Uuid,
    pub original_text: String,
    pub simplified_text: Option<String>,
    pub definitions: serde_json::Value,
    pub tashkeel_text: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepSeekRequest {
    pub model: String,
    pub messages: Vec<DeepSeekMessage>,
    pub temperature: f32,
    pub max_tokens: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepSeekMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepSeekResponse {
    pub choices: Vec<DeepSeekChoice>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepSeekChoice {
    pub message: DeepSeekMessage,
}
