use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde_json::json;

use crate::models::{NewScore, ScoreEntry, MAX_LEADERBOARD_ENTRIES};
use crate::AppState;

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
    Json(payload): Json<NewScore>,
) -> Result<(StatusCode, Json<ScoreEntry>), StatusCode> {
    if !state.check_rate_limit().await {
        tracing::warn!("Rate limit exceeded on POST /api/scores");
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    let valid_name = payload.validate().map_err(|_| StatusCode::BAD_REQUEST)?;

    let entry = ScoreEntry::new(valid_name, payload.score, payload.wave);

    let mut scores = state.scores.write().await;
    scores.push(entry.clone());
    scores.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| b.wave.cmp(&a.wave)));
    scores.truncate(MAX_LEADERBOARD_ENTRIES);

    tracing::info!(
        player = %entry.player_name,
        score = entry.score,
        wave = entry.wave,
        "Recorded new hero score"
    );

    Ok((StatusCode::CREATED, Json(entry)))
}
