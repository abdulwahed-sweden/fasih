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
    println!("📝 تحليل النص: {}", &payload.text);

    // تبسيط النص
    let simplified = match state.ai_client.simplify_arabic_text(&payload.text).await {
        Ok(text) => text,
        Err(e) => {
            eprintln!("❌ خطأ في تبسيط النص: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // استخراج التعريفات
    let definitions = match state.ai_client.get_definitions(&payload.text).await {
        Ok(defs) => defs,
        Err(e) => {
            eprintln!("❌ خطأ في استخراج التعريفات: {}", e);
            Vec::new() // استمر مع قائمة فارغة
        }
    };

    // إضافة التشكيل
    let tashkeel = match state.ai_client.add_tashkeel(&payload.text).await {
        Ok(text) => text,
        Err(e) => {
            eprintln!("❌ خطأ في إضافة التشكيل: {}", e);
            payload.text.clone() // استخدم النص الأصلي
        }
    };

    // حفظ في قاعدة البيانات
    let id = match state
        .db
        .save_analysis(&payload.text, &simplified, &definitions, &tashkeel)
        .await
    {
        Ok(id) => id,
        Err(e) => {
            eprintln!("❌ خطأ في حفظ البيانات: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    println!("✅ تم التحليل بنجاح. ID: {}", id);

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
    println!("🔍 البحث عن التحليل: {}", id);

    let analysis = match state.db.get_analysis(id).await {
        Ok(Some(analysis)) => analysis,
        Ok(None) => {
            println!("❌ التحليل غير موجود: {}", id);
            return Err(StatusCode::NOT_FOUND);
        }
        Err(e) => {
            eprintln!("❌ خطأ في قاعدة البيانات: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    println!("✅ تم العثور على التحليل: {}", id);
    Ok(Json(analysis))
}

pub async fn get_recent(
    State(state): State<AppState>,
) -> Result<Json<Vec<TextAnalysis>>, StatusCode> {
    println!("📋 جلب التحاليل الحديثة");

    let analyses = match state.db.get_recent_analyses(10).await {
        Ok(analyses) => analyses,
        Err(e) => {
            eprintln!("❌ خطأ في جلب التحاليل: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    println!("✅ تم جلب {} تحليل", analyses.len());
    Ok(Json(analyses))
}

// دالة صحة للتأكد من عمل الخادم
pub async fn health_check() -> &'static str {
    "✅ الخادم يعمل بنجاح!"
}
