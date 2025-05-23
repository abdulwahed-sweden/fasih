use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    ai_client::DeepSeekClient,
    database::Database,
    models::{AnalyzeRequest, AnalyzeResponse, TextAnalysis},
};

pub type AppState = Arc<AppStateInner>;

pub struct AppStateInner {
    pub db: Database,
    pub ai_client: DeepSeekClient,
}

pub async fn analyze_text(
    State(state): State<AppState>,
    Json(payload): Json<AnalyzeRequest>,
) -> Result<Json<AnalyzeResponse>, StatusCode> {
    // تبسيط النص
    let simplified = state
        .ai_client
        .simplify_arabic_text(&payload.text)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // استخراج التعريفات
    let definitions = state
        .ai_client
        .get_definitions(&payload.text)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // إضافة التشكيل
    let tashkeel = state
        .ai_client
        .add_tashkeel(&payload.text)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // حفظ في قاعدة البيانات
    let id = state
        .db
        .save_analysis(&payload.text, &simplified, &definitions, &tashkeel)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response = AnalyzeResponse {
        id,
        original_text: payload.text,
        simplified_text: simplified,
        definitions,
        tashkeel_text: tashkeel,
    };

    Ok(Json(response))
}

pub async fn get_analysis(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<TextAnalysis>, StatusCode> {
    let analysis = state
        .db
        .get_analysis(id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(analysis))
}

pub async fn get_recent(
    State(state): State<AppState>,
) -> Result<Json<Vec<TextAnalysis>>, StatusCode> {
    let analyses = state
        .db
        .get_recent_analyses(10)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(analyses))
}
