use axum::{
    body::Body,
    http::{header, Method, Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use std::time::{SystemTime, UNIX_EPOCH};
use tiny_myrmidon_api::{create_app, models::MAX_LEADERBOARD_ENTRIES, AppState};
use tower::ServiceExt;

fn temp_store_path() -> std::path::PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    std::env::temp_dir().join(format!("tiny-myrmidon-concurrency-{nonce}.json"))
}

#[tokio::test]
async fn concurrent_score_submissions_maintain_consistency_under_load() {
    let file = temp_store_path();
    let state = AppState::from_file(&file, 1).expect("Failed to initialize state from file");
    let app = create_app(state.clone());

    let mut handles = Vec::new();

    for i in 0..20 {
        let app = app.clone();
        let handle = tokio::spawn(async move {
            let score_value = 1000 + i * 150;
            let wave_value = 2 + (i % 5);
            let payload = json!({
                "player_name": format!("Warrior_{i:02}"),
                "score": score_value,
                "wave": wave_value,
            });

            let req = Request::builder()
                .method(Method::POST)
                .uri("/api/scores")
                .header(header::CONTENT_TYPE, "application/json")
                .header("x-forwarded-for", format!("10.0.0.{}", i + 1))
                .body(Body::from(serde_json::to_vec(&payload).unwrap()))
                .unwrap();

            let response = app.oneshot(req).await.unwrap();
            response.status()
        });
        handles.push(handle);
    }

    for handle in handles {
        let status = handle.await.unwrap();
        assert_eq!(status, StatusCode::CREATED);
    }

    let scores = state.scores.read().await;
    assert!(scores.len() <= MAX_LEADERBOARD_ENTRIES);

    for pair in scores.windows(2) {
        let higher = &pair[0];
        let lower = &pair[1];
        assert!(
            higher.score > lower.score
                || (higher.score == lower.score && higher.wave >= lower.wave),
            "Scores must be strictly descending or break ties by wave: {} vs {}",
            higher.score,
            lower.score
        );
    }

    drop(scores);
    let _ = std::fs::remove_file(file);
}

#[tokio::test]
async fn tie_breaker_logic_orders_by_wave_then_first_submitted() {
    let state = AppState::empty().with_trusted_proxy_hops(1);
    let app = create_app(state.clone());

    let heroes = [("HeroA", 3000, 5), ("HeroB", 3000, 8), ("HeroC", 3000, 5)];

    for (idx, (name, score, wave)) in heroes.iter().enumerate() {
        let payload = json!({
            "player_name": name,
            "score": score,
            "wave": wave,
        });

        let req = Request::builder()
            .method(Method::POST)
            .uri("/api/scores")
            .header(header::CONTENT_TYPE, "application/json")
            .header("x-forwarded-for", format!("192.168.1.{}", idx + 1))
            .body(Body::from(serde_json::to_vec(&payload).unwrap()))
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
    }

    let scores = state.scores.read().await;
    assert_eq!(scores[0].player_name, "HeroB");
    assert_eq!(scores[0].wave, 8);

    assert_eq!(scores[1].player_name, "HeroA");
    assert_eq!(scores[1].wave, 5);

    assert_eq!(scores[2].player_name, "HeroC");
    assert_eq!(scores[2].wave, 5);
}

#[tokio::test]
async fn security_headers_present_on_all_endpoints() {
    let app = create_app(AppState::empty());

    let routes = [(Method::GET, "/api/health"), (Method::GET, "/api/scores")];

    for (method, uri) in routes {
        let req = Request::builder()
            .method(method)
            .uri(uri)
            .body(Body::empty())
            .unwrap();

        let response = app.clone().oneshot(req).await.unwrap();
        let headers = response.headers();

        assert_eq!(
            headers.get("x-content-type-options").unwrap(),
            "nosniff",
            "Missing nosniff on {uri}"
        );
        assert_eq!(
            headers.get("x-frame-options").unwrap(),
            "DENY",
            "Missing DENY on {uri}"
        );
        assert_eq!(
            headers.get("cache-control").unwrap(),
            "no-store",
            "Missing no-store on {uri}"
        );
    }
}

#[tokio::test]
async fn empty_post_body_returns_bad_request_with_json_error() {
    let app = create_app(AppState::empty());

    let req = Request::builder()
        .method(Method::POST)
        .uri("/api/scores")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::empty())
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let body: Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(body["error"], "invalid_json");
}

#[tokio::test]
async fn not_found_route_returns_404_status() {
    let app = create_app(AppState::empty());

    let req = Request::builder()
        .method(Method::GET)
        .uri("/api/nonexistent")
        .body(Body::empty())
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}
