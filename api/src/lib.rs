pub mod handlers;
pub mod models;

use axum::{
    http::{header::CONTENT_TYPE, HeaderValue, Method},
    routing::get,
    Router,
};
use models::ScoreEntry;
use std::{
    collections::VecDeque,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::{Mutex, RwLock};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::trace::TraceLayer;

pub const RATE_LIMIT_WINDOW: Duration = Duration::from_secs(10);
pub const MAX_SUBMISSIONS_PER_WINDOW: usize = 10;

#[derive(Clone)]
pub struct AppState {
    pub scores: Arc<RwLock<Vec<ScoreEntry>>>,
    pub submission_timestamps: Arc<Mutex<VecDeque<Instant>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            scores: Arc::new(RwLock::new(vec![
                ScoreEntry::new("Achilles".into(), 5000, 10),
                ScoreEntry::new("Patroclus".into(), 3200, 7),
                ScoreEntry::new("Ajax".into(), 2100, 5),
            ])),
            submission_timestamps: Arc::new(Mutex::new(VecDeque::new())),
        }
    }

    pub fn empty() -> Self {
        Self {
            scores: Arc::new(RwLock::new(Vec::new())),
            submission_timestamps: Arc::new(Mutex::new(VecDeque::new())),
        }
    }

    pub async fn check_rate_limit(&self) -> bool {
        let now = Instant::now();
        let mut timestamps = self.submission_timestamps.lock().await;

        while let Some(&oldest) = timestamps.front() {
            if now.duration_since(oldest) > RATE_LIMIT_WINDOW {
                timestamps.pop_front();
            } else {
                break;
            }
        }

        if timestamps.len() >= MAX_SUBMISSIONS_PER_WINDOW {
            return false;
        }

        timestamps.push_back(now);
        true
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

fn build_cors_layer() -> CorsLayer {
    let raw_origins = std::env::var("ALLOWED_ORIGINS").unwrap_or_else(|_| {
        "http://localhost:8080,http://127.0.0.1:8080,http://localhost:8000".to_string()
    });

    let origins: Vec<HeaderValue> = raw_origins
        .split(',')
        .filter_map(|origin| origin.trim().parse::<HeaderValue>().ok())
        .collect();

    CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([CONTENT_TYPE])
}

pub fn create_app(state: AppState) -> Router {
    Router::new()
        .route("/api/health", get(handlers::health_check))
        .route(
            "/api/scores",
            get(handlers::get_scores).post(handlers::add_score),
        )
        .layer(build_cors_layer())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
