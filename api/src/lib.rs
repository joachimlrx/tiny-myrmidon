pub mod handlers;
pub mod models;

use axum::{
    extract::Request,
    http::{
        header::{CACHE_CONTROL, CONTENT_TYPE, X_CONTENT_TYPE_OPTIONS, X_FRAME_OPTIONS},
        HeaderValue, Method,
    },
    middleware::{self, Next},
    response::Response,
    routing::get,
    Router,
};
use models::ScoreEntry;
use std::{
    collections::{HashMap, VecDeque},
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::{Mutex, RwLock};
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    trace::TraceLayer,
};

pub const RATE_LIMIT_WINDOW: Duration = Duration::from_secs(10);
pub const MAX_SUBMISSIONS_PER_WINDOW: usize = 10;
const MAX_TRACKED_IPS: usize = 4096;

#[derive(Clone)]
pub struct AppState {
    pub scores: Arc<RwLock<Vec<ScoreEntry>>>,
    pub submission_timestamps: Arc<Mutex<HashMap<String, VecDeque<Instant>>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            scores: Arc::new(RwLock::new(vec![
                ScoreEntry::new("Achilles".into(), 5000, 10),
                ScoreEntry::new("Patroclus".into(), 3200, 7),
                ScoreEntry::new("Ajax".into(), 2100, 5),
            ])),
            submission_timestamps: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn empty() -> Self {
        Self {
            scores: Arc::new(RwLock::new(Vec::new())),
            submission_timestamps: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn check_rate_limit(&self, client_ip: &str) -> bool {
        let now = Instant::now();
        let mut map = self.submission_timestamps.lock().await;

        // Evict stale IP entries to prevent unbounded memory growth under IP-spoofing floods
        if map.len() >= MAX_TRACKED_IPS {
            map.retain(|_, queue| {
                while let Some(&oldest) = queue.front() {
                    if now.duration_since(oldest) > RATE_LIMIT_WINDOW {
                        queue.pop_front();
                    } else {
                        break;
                    }
                }
                !queue.is_empty()
            });
        }

        let timestamps = map.entry(client_ip.to_string()).or_default();

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

async fn security_headers(req: Request, next: Next) -> Response {
    let mut response = next.run(req).await;
    let headers = response.headers_mut();
    headers.insert(X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
    headers.insert(X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
    headers.insert(CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response
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
        .layer(middleware::from_fn(security_headers))
        .layer(build_cors_layer())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
