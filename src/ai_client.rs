use crate::models::{DeepSeekMessage, DeepSeekRequest, DeepSeekResponse};
use anyhow::Result;
use reqwest::Client;

pub struct DeepSeekClient {
    client: Client,
    api_key: String,
    base_url: String,
}

impl DeepSeekClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: "https://api.deepseek.com/v1".to_string(),
        }
    }

    pub async fn simplify_arabic_text(&self, text: &str) -> Result<String> {
        let prompt = format!(
            "قم بتبسيط النص العربي التالي بحيث يصبح مفهوماً للمبتدئين مع الحفاظ على المعنى الأصلي:\n\n{}",
            text
        );

        self.call_api(&prompt).await
    }

    pub async fn get_definitions(&self, text: &str) -> Result<Vec<String>> {
        let prompt = format!(
            "استخرج الكلمات الصعبة من النص العربي التالي مع تعريفاتها المبسطة.\nالنص: {}\n\nأرجع التعريفات بالتنسيق التالي:\nالكلمة: التعريف المبسط",
            text
        );

        let response = self.call_api(&prompt).await?;

        // تحويل الإجابة إلى قائمة تعريفات
        let definitions: Vec<String> = response
            .lines()
            .filter(|line| line.contains(":") && !line.trim().is_empty())
            .map(|line| line.trim().to_string())
            .take(10) // حد أقصى 10 تعريفات
            .collect();

        Ok(definitions)
    }

    pub async fn add_tashkeel(&self, text: &str) -> Result<String> {
        let prompt = format!(
            "أضف التشكيل الكامل (الحركات) للنص العربي التالي. أرجع النص فقط مع التشكيل:\n\n{}",
            text
        );

        self.call_api(&prompt).await
    }

    async fn call_api(&self, prompt: &str) -> Result<String> {
        let request = DeepSeekRequest {
            model: "deepseek-chat".to_string(),
            messages: vec![DeepSeekMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            temperature: 0.7,
            max_tokens: 1000,
        };

        println!("🤖 إرسال طلب إلى DeepSeek API...");

        let response = self
            .client
            .post(&format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("DeepSeek API error: {} - {}", status, error_text);
        }

        let deepseek_response: DeepSeekResponse = response.json().await?;

        let result = deepseek_response
            .choices
            .first()
            .map(|choice| choice.message.content.clone())
            .unwrap_or_default();

        println!("✅ تم استلام الرد من DeepSeek API");
        Ok(result)
    }
}
