mod ai_client;
mod database;
mod handlers;
mod models;

use axum::{
    routing::{get, post},
    Router,
};
use dotenvy::dotenv;
use std::{env, sync::Arc};
use tower_http::{cors::CorsLayer, services::ServeDir};

use crate::{
    ai_client::DeepSeekClient,
    database::Database,
    handlers::{analyze_text, get_analysis, get_recent, AppStateInner},
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // تحميل متغيرات البيئة
    dotenv().ok();

    // الحصول على متغيرات البيئة
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let deepseek_api_key = env::var("DEEPSEEK_API_KEY").expect("DEEPSEEK_API_KEY must be set");
    let host = env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "3000".to_string());

    // إنشاء اتصالات قاعدة البيانات والـ AI
    let db = Database::new(&database_url).await?;
    let ai_client = DeepSeekClient::new(deepseek_api_key);

    let state = Arc::new(AppStateInner { db, ai_client });

    // إعداد المسارات
    let app = Router::new()
        .route("/api/analyze", post(analyze_text))
        .route("/api/analysis/:id", get(get_analysis))
        .route("/api/recent", get(get_recent))
        .nest_service("/", ServeDir::new("static"))
        .layer(CorsLayer::permissive())
        .with_state(state);

    // تشغيل الخادم
    let addr = format!("{}:{}", host, port);
    println!("🚀 الخادم يعمل على: http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
