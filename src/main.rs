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
    handlers::{analyze_text, get_analysis, get_recent, health_check, AppStateInner},
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // تحميل متغيرات البيئة
    dotenv().ok();

    // طباعة معلومات البداية
    println!("🚀 بدء تشغيل خادم فصيح...");

    // الحصول على متغيرات البيئة
    let database_url = env::var("DATABASE_URL").expect("❌ DATABASE_URL غير موجود في ملف .env");
    let deepseek_api_key =
        env::var("DEEPSEEK_API_KEY").expect("❌ DEEPSEEK_API_KEY غير موجود في ملف .env");
    let host = env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "3000".to_string());

    println!("🔗 الاتصال بقاعدة البيانات...");
    // إنشاء اتصالات قاعدة البيانات والـ AI
    let db = Database::new(&database_url)
        .await
        .expect("❌ فشل في الاتصال بقاعدة البيانات");
    println!("✅ تم الاتصال بقاعدة البيانات بنجاح");

    println!("🤖 إعداد عميل DeepSeek...");
    let ai_client = DeepSeekClient::new(deepseek_api_key);
    println!("✅ تم إعداد عميل AI بنجاح");

    let state = Arc::new(AppStateInner { db, ai_client });

    // إعداد المسارات
    let app = Router::new()
        // API endpoints
        .route("/api/analyze", post(analyze_text))
        .route("/api/analysis/:id", get(get_analysis))
        .route("/api/recent", get(get_recent))
        .route("/api/health", get(health_check))
        // Static files
        .nest_service("/", ServeDir::new("static"))
        // Middleware
        .layer(CorsLayer::permissive())
        .with_state(state);

    // تشغيل الخادم
    let addr = format!("{}:{}", host, port);
    println!("🌐 إعداد الخادم على العنوان: {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("❌ فشل في ربط المنفذ");

    println!();
    println!("🚀 الخادم يعمل على: http://{}", addr);
    println!("📝 صفحة الويب: http://{}", addr);
    println!("🔧 API Health Check: http://{}/api/health", addr);
    println!("📊 أحدث التحاليل: http://{}/api/recent", addr);
    println!();
    println!("✨ اضغط Ctrl+C لإيقاف الخادم");

    axum::serve(listener, app).await?;

    Ok(())
}
