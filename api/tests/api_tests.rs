use axum::{
    body::Body,
    http::{header, Method, Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tiny_myrmidon_api::{
    create_app,
    models::{ScoreEntry, MAX_LEADERBOARD_ENTRIES},
    AppState, MAX_SUBMISSIONS_PER_WINDOW,
};
use tower::ServiceExt;

#[tokio::test]
async fn health_check_returns_ok() {
    let app = create_app(AppState::empty());

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["status"], "ok");
    assert_eq!(json["service"], "tiny-myrmidon-api");
}

#[tokio::test]
async fn get_scores_returns_initial_leaderboard() {
    let app = create_app(AppState::new());

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/scores")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let scores: Value = serde_json::from_slice(&body).unwrap();
    let array = scores.as_array().expect("Expected JSON array");

    assert_eq!(array.len(), 3);
    assert_eq!(array[0]["player_name"], "Achilles");
    assert_eq!(array[0]["score"], 5000);
}

#[tokio::test]
async fn add_score_with_valid_payload_persists_and_sorts() {
    let app = create_app(AppState::new());

    let new_score = json!({
        "player_name": "Hercules",
        "score": 8500,
        "wave": 14
    });

    let post_req = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&new_score).unwrap()))
        .unwrap();

    let response = app.clone().oneshot(post_req).await.unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);

    let get_req = Request::builder()
        .uri("/api/scores")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(get_req).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let scores: Value = serde_json::from_slice(&body).unwrap();
    let array = scores.as_array().unwrap();

    assert_eq!(array[0]["player_name"], "Hercules");
    assert_eq!(array[0]["score"], 8500);
    assert_eq!(array[1]["player_name"], "Achilles");
}

#[tokio::test]
async fn add_score_with_empty_name_returns_bad_request() {
    let app = create_app(AppState::empty());

    let payload = json!({
        "player_name": "   ",
        "score": 100,
        "wave": 1
    });

    let req = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn add_score_with_too_long_name_returns_bad_request() {
    let app = create_app(AppState::empty());

    let payload = json!({
        "player_name": "H".repeat(50),
        "score": 100,
        "wave": 1
    });

    let req = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn add_score_with_control_chars_returns_bad_request() {
    let app = create_app(AppState::empty());

    let payload = json!({
        "player_name": "Hacker\nAdmin",
        "score": 500,
        "wave": 2
    });

    let req = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn add_score_with_cheated_score_returns_bad_request() {
    let app = create_app(AppState::empty());

    let payload = json!({
        "player_name": "Cheater",
        "score": 999_999_999u64,
        "wave": 1
    });

    let req = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn add_score_with_positive_score_at_wave_zero_returns_bad_request() {
    let app = create_app(AppState::empty());

    let payload = json!({
        "player_name": "Cheater",
        "score": 100,
        "wave": 0
    });

    let req = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn cors_blocks_untrusted_origin_and_allows_trusted_origin() {
    let app = create_app(AppState::empty());

    let evil_req = Request::builder()
        .uri("/api/scores")
        .header(header::ORIGIN, "https://evil-site.com")
        .body(Body::empty())
        .unwrap();

    let evil_res = app.clone().oneshot(evil_req).await.unwrap();
    assert!(evil_res
        .headers()
        .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
        .is_none());

    let trusted_req = Request::builder()
        .uri("/api/scores")
        .header(header::ORIGIN, "http://localhost:8080")
        .body(Body::empty())
        .unwrap();

    let trusted_res = app.oneshot(trusted_req).await.unwrap();
    assert_eq!(
        trusted_res
            .headers()
            .get(header::ACCESS_CONTROL_ALLOW_ORIGIN)
            .unwrap(),
        "http://localhost:8080"
    );
}

#[tokio::test]
async fn unsupported_http_method_returns_method_not_allowed() {
    let app = create_app(AppState::empty());

    let req = Request::builder()
        .method(Method::DELETE)
        .uri("/api/scores")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
async fn add_score_rate_limits_excessive_requests() {
    let app = create_app(AppState::empty());

    for i in 0..MAX_SUBMISSIONS_PER_WINDOW {
        let payload = json!({
            "player_name": format!("Hero_{}", i),
            "score": 100,
            "wave": 1
        });

        let req = Request::builder()
            .method("POST")
            .uri("/api/scores")
            .header("content-type", "application/json")
            .body(Body::from(serde_json::to_vec(&payload).unwrap()))
            .unwrap();

        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
    }

    let overflow_payload = json!({
        "player_name": "Spammer",
        "score": 100,
        "wave": 1
    });

    let overflow_req = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&overflow_payload).unwrap()))
        .unwrap();

    let overflow_res = app.oneshot(overflow_req).await.unwrap();
    assert_eq!(overflow_res.status(), StatusCode::TOO_MANY_REQUESTS);
}

#[tokio::test]
async fn leaderboard_truncation_limits_to_max_entries() {
    let state = AppState::empty();
    {
        let mut scores = state.scores.write().await;
        for i in 0..(MAX_LEADERBOARD_ENTRIES + 10) {
            scores.push(ScoreEntry::new(
                format!("Warrior_{}", i),
                (i * 10) as u64,
                1,
            ));
        }
        scores.sort_by_key(|a| std::cmp::Reverse(a.score));
        scores.truncate(MAX_LEADERBOARD_ENTRIES);
    }

    let app = create_app(state);
    let get_req = Request::builder()
        .uri("/api/scores")
        .body(Body::empty())
        .unwrap();

    let res = app.oneshot(get_req).await.unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let scores: Value = serde_json::from_slice(&body).unwrap();
    let array = scores.as_array().unwrap();

    assert_eq!(array.len(), MAX_LEADERBOARD_ENTRIES);
}
