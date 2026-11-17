use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::json;

use crate::models::{NewScore, ScoreEntry, MAX_LEADERBOARD_ENTRIES};
use crate::AppState;

fn extract_client_ip(headers: &HeaderMap) -> String {
    if let Some(xff) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        if let Some(first_ip) = xff.split(',').next() {
            let trimmed = first_ip.trim();
            if !trimmed.is_empty() && trimmed.len() <= 45 {
                return trimmed.to_string();
            }
        }
    }

    if let Some(real_ip) = headers.get("x-real-ip").and_then(|v| v.to_str().ok()) {
        let trimmed = real_ip.trim();
        if !trimmed.is_empty() && trimmed.len() <= 45 {
            return trimmed.to_string();
        }
    }

    "unknown".to_string()
}

pub async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "service": "tiny-myrmidon-api"
    }))
}

pub async fn get_scores(State(state): State<AppState>) -> impl IntoResponse {
    let scores = state.scores.read().await;
    Json(scores.clone())
}

pub async fn add_score(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<NewScore>,
) -> Result<(StatusCode, Json<ScoreEntry>), StatusCode> {
    let client_ip = extract_client_ip(&headers);

    if !state.check_rate_limit(&client_ip).await {
        tracing::warn!(client_ip = %client_ip, "Rate limit exceeded on POST /api/scores");
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    let valid_name = payload.validate().map_err(|_| StatusCode::BAD_REQUEST)?;

    let entry = ScoreEntry::new(valid_name, payload.score, payload.wave);

    let mut scores = state.scores.write().await;
    scores.push(entry.clone());
    scores.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| b.wave.cmp(&a.wave)));
    scores.truncate(MAX_LEADERBOARD_ENTRIES);

    tracing::info!(
        client_ip = %client_ip,
        player = %entry.player_name,
        score = entry.score,
        wave = entry.wave,
        "Recorded new hero score"
    );

    Ok((StatusCode::CREATED, Json(entry)))
}
