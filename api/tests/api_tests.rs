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
async fn malformed_json_returns_a_consistent_json_error() {
    let app = create_app(AppState::empty());
    let request = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .body(Body::from("{invalid"))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    assert_eq!(
        response.headers().get(header::CONTENT_TYPE).unwrap(),
        "application/json"
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(error["error"], "invalid_json");
    assert!(error["message"].as_str().is_some());
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
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let error: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(error["error"], "invalid_score");
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
    let body = overflow_res.into_body().collect().await.unwrap().to_bytes();
    let error: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(error["error"], "rate_limit_exceeded");
}

#[tokio::test]
async fn rate_limit_uses_socket_peer_when_no_proxy_is_trusted() {
    use axum::extract::ConnectInfo;
    use std::net::SocketAddr;

    let app = create_app(AppState::empty());
    let first_peer: SocketAddr = "203.0.113.10:4000".parse().unwrap();
    let second_peer: SocketAddr = "198.51.100.42:4000".parse().unwrap();

    for index in 0..MAX_SUBMISSIONS_PER_WINDOW {
        let payload = json!({
            "player_name": format!("Direct_{index}"),
            "score": 100,
            "wave": 1
        });
        let request = Request::builder()
            .method("POST")
            .uri("/api/scores")
            .header("content-type", "application/json")
            .header("x-forwarded-for", "192.0.2.99")
            .extension(ConnectInfo(first_peer))
            .body(Body::from(serde_json::to_vec(&payload).unwrap()))
            .unwrap();
        assert_eq!(
            app.clone().oneshot(request).await.unwrap().status(),
            StatusCode::CREATED
        );
    }

    let payload = json!({
        "player_name": "Independent",
        "score": 100,
        "wave": 1
    });
    let request = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .extension(ConnectInfo(second_peer))
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    assert_eq!(
        app.oneshot(request).await.unwrap().status(),
        StatusCode::CREATED
    );
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

#[tokio::test]
async fn rate_limit_is_isolated_per_client_ip_and_security_headers_are_present() {
    let app = create_app(AppState::empty().with_trusted_proxy_hops(1));

    for i in 0..MAX_SUBMISSIONS_PER_WINDOW {
        let payload = json!({
            "player_name": format!("Attacker_{}", i),
            "score": 100,
            "wave": 1
        });
        let req = Request::builder()
            .method("POST")
            .uri("/api/scores")
            .header("content-type", "application/json")
            .header("x-forwarded-for", "203.0.113.10, 10.42.0.1")
            .body(Body::from(serde_json::to_vec(&payload).unwrap()))
            .unwrap();
        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        assert_eq!(
            res.headers().get("x-content-type-options").unwrap(),
            "nosniff"
        );
        assert_eq!(res.headers().get("x-frame-options").unwrap(), "DENY");
    }

    let legit_payload = json!({
        "player_name": "Odysseus",
        "score": 4200,
        "wave": 8
    });
    let legit_req = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .header("x-forwarded-for", "198.51.100.42")
        .body(Body::from(serde_json::to_vec(&legit_payload).unwrap()))
        .unwrap();
    let legit_res = app.oneshot(legit_req).await.unwrap();
    assert_eq!(legit_res.status(), StatusCode::CREATED);
}

#[tokio::test]
async fn submitted_score_survives_an_api_state_restart() {
    use std::time::{SystemTime, UNIX_EPOCH};

    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let path = std::env::temp_dir().join(format!("tiny-myrmidon-api-test-{nonce}.json"));
    let state = AppState::from_file(&path, 0).unwrap();
    let app = create_app(state);

    let payload = json!({
        "player_name": "PersistentHero",
        "score": 1200,
        "wave": 3
    });
    let request = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .body(Body::from(serde_json::to_vec(&payload).unwrap()))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);

    let restarted_state = AppState::from_file(&path, 0).unwrap();
    let scores = restarted_state.scores.read().await;
    assert_eq!(scores.len(), 1);
    assert_eq!(scores[0].player_name, "PersistentHero");
    assert_eq!(scores[0].score, 1200);

    drop(scores);
    std::fs::remove_file(path).unwrap();
}

#[tokio::test]
async fn oversized_payload_returns_payload_too_large() {
    let app = create_app(AppState::empty());
    let oversized_body = "x".repeat(5000);

    let req = Request::builder()
        .method("POST")
        .uri("/api/scores")
        .header("content-type", "application/json")
        .body(Body::from(oversized_body))
        .unwrap();

    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::PAYLOAD_TOO_LARGE);
}
