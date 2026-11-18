use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::net::IpAddr;

use crate::models::{NewScore, ScoreEntry, MAX_LEADERBOARD_ENTRIES};
use crate::AppState;

fn extract_client_ip(headers: &HeaderMap, trusted_proxy_hops: usize) -> String {
    if trusted_proxy_hops == 0 {
        return "unknown".to_string();
    }

    let Some(forwarded_for) = headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
    else {
        return "unknown".to_string();
    };

    let addresses: Vec<&str> = forwarded_for
        .split(',')
        .map(str::trim)
        .filter(|address| !address.is_empty())
        .collect();

    let Some(index) = addresses.len().checked_sub(trusted_proxy_hops) else {
        return "unknown".to_string();
    };

    addresses[index]
        .parse::<IpAddr>()
        .map(|address| address.to_string())
        .unwrap_or_else(|_| "unknown".to_string())
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
    let client_ip = extract_client_ip(&headers, state.trusted_proxy_hops);

    if !state.check_rate_limit(&client_ip).await {
        tracing::warn!(client_ip = %client_ip, "Rate limit exceeded on POST /api/scores");
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    let valid_name = payload.validate().map_err(|_| StatusCode::BAD_REQUEST)?;

    let entry = ScoreEntry::new(valid_name, payload.score, payload.wave);

    let mut scores = state.scores.write().await;
    let mut updated_scores = scores.clone();
    updated_scores.push(entry.clone());
    updated_scores.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| b.wave.cmp(&a.wave)));
    updated_scores.truncate(MAX_LEADERBOARD_ENTRIES);

    state
        .persist_scores(&updated_scores)
        .await
        .map_err(|error| {
            tracing::error!(error = %error, "Failed to persist leaderboard");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    *scores = updated_scores;

    tracing::info!(
        client_ip = %client_ip,
        player = %entry.player_name,
        score = entry.score,
        wave = entry.wave,
        "Recorded new hero score"
    );

    Ok((StatusCode::CREATED, Json(entry)))
}

#[cfg(test)]
mod client_ip_tests {
    use super::*;

    #[test]
    fn ignores_forwarded_headers_without_a_trusted_proxy() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "198.51.100.99".parse().unwrap());

        assert_eq!(extract_client_ip(&headers, 0), "unknown");
    }

    #[test]
    fn selects_the_client_address_before_the_trusted_proxy_chain() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-forwarded-for",
            "203.0.113.200, 198.51.100.42".parse().unwrap(),
        );

        assert_eq!(extract_client_ip(&headers, 1), "198.51.100.42");
        assert_eq!(extract_client_ip(&headers, 2), "203.0.113.200");
    }

    #[test]
    fn rejects_incomplete_or_invalid_forwarded_chains() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "not-an-ip".parse().unwrap());

        assert_eq!(extract_client_ip(&headers, 1), "unknown");
        assert_eq!(extract_client_ip(&headers, 2), "unknown");
    }
}
