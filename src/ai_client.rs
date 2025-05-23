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
            "قم بتبسيط النص العربي التالي بحيث يصبح مفهوماً للمبتدئين:\n\n{}",
            text
        );

        let response = self.call_api(&prompt).await?;
        Ok(response)
    }

    pub async fn get_definitions(&self, text: &str) -> Result<Vec<String>> {
        let prompt = format!(
            "استخرج الكلمات الصعبة من النص التالي مع تعريفاتها:\n\n{}\n\nالتنسيق: كلمة: تعريف",
            text
        );

        let response = self.call_api(&prompt).await?;
        let definitions: Vec<String> = response
            .lines()
            .filter(|line| line.contains(":"))
            .map(|line| line.to_string())
            .collect();

        Ok(definitions)
    }

    pub async fn add_tashkeel(&self, text: &str) -> Result<String> {
        let prompt = format!("أضف التشكيل (الحركات) للنص العربي التالي:\n\n{}", text);

        let response = self.call_api(&prompt).await?;
        Ok(response)
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

        let response = self
            .client
            .post(&format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        let deepseek_response: DeepSeekResponse = response.json().await?;

        Ok(deepseek_response
            .choices
            .first()
            .map(|choice| choice.message.content.clone())
            .unwrap_or_default())
    }
}
