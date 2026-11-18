use axum::{
    extract::{rejection::JsonRejection, ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Extension, Json,
};
use serde::Serialize;
use serde_json::json;
use std::net::{IpAddr, SocketAddr};

use crate::models::{NewScore, ScoreEntry, MAX_LEADERBOARD_ENTRIES};
use crate::AppState;

#[derive(Serialize)]
struct ApiErrorBody {
    error: &'static str,
    message: String,
}

pub struct ApiError {
    status: StatusCode,
    code: &'static str,
    message: String,
}

impl ApiError {
    fn new(status: StatusCode, code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status,
            code,
            message: message.into(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(ApiErrorBody {
                error: self.code,
                message: self.message,
            }),
        )
            .into_response()
    }
}

fn extract_client_ip(
    headers: &HeaderMap,
    trusted_proxy_hops: usize,
    peer_address: Option<SocketAddr>,
) -> String {
    if trusted_proxy_hops == 0 {
        return peer_address
            .map(|address| address.ip().to_string())
            .unwrap_or_else(|| "unknown".to_string());
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

    // X-Forwarded-For omits the socket peer; skip one entry per trusted proxy hop.
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
    peer: Option<Extension<ConnectInfo<SocketAddr>>>,
    payload: Result<Json<NewScore>, JsonRejection>,
) -> Result<(StatusCode, Json<ScoreEntry>), ApiError> {
    let peer_address = peer.map(|Extension(ConnectInfo(address))| address);
    let client_ip = extract_client_ip(&headers, state.trusted_proxy_hops, peer_address);

    if !state.check_rate_limit(&client_ip).await {
        tracing::warn!(client_ip = %client_ip, "Rate limit exceeded on POST /api/scores");
        return Err(ApiError::new(
            StatusCode::TOO_MANY_REQUESTS,
            "rate_limit_exceeded",
            "Too many score submissions. Try again later.",
        ));
    }

    let Json(payload) = payload.map_err(|rejection| match rejection {
        JsonRejection::BytesRejection(_) => ApiError::new(
            StatusCode::PAYLOAD_TOO_LARGE,
            "payload_too_large",
            "Request body exceeds the 4 KB maximum limit.",
        ),
        _ => ApiError::new(
            StatusCode::BAD_REQUEST,
            "invalid_json",
            "Request body must be valid JSON containing player_name, score, and wave.",
        ),
    })?;
    let valid_name = payload
        .validate()
        .map_err(|message| ApiError::new(StatusCode::BAD_REQUEST, "invalid_score", message))?;

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
            ApiError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                "persistence_failed",
                "The score could not be saved.",
            )
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

        assert_eq!(extract_client_ip(&headers, 0, None), "unknown");
    }

    #[test]
    fn uses_the_socket_peer_when_no_proxy_is_trusted() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "198.51.100.99".parse().unwrap());
        let peer = "203.0.113.7:4321".parse().unwrap();

        assert_eq!(extract_client_ip(&headers, 0, Some(peer)), "203.0.113.7");
    }

    #[test]
    fn selects_address_by_configured_trusted_proxy_hop_count() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-forwarded-for",
            "203.0.113.200, 198.51.100.42".parse().unwrap(),
        );

        assert_eq!(extract_client_ip(&headers, 1, None), "198.51.100.42");
        assert_eq!(extract_client_ip(&headers, 2, None), "203.0.113.200");
    }

    #[test]
    fn accepts_a_single_forwarded_address_for_one_trusted_proxy() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "203.0.113.200".parse().unwrap());

        assert_eq!(extract_client_ip(&headers, 1, None), "203.0.113.200");
    }

    #[test]
    fn rejects_incomplete_or_invalid_forwarded_chains() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "not-an-ip".parse().unwrap());

        assert_eq!(extract_client_ip(&headers, 1, None), "unknown");
        assert_eq!(extract_client_ip(&headers, 2, None), "unknown");
    }
}
