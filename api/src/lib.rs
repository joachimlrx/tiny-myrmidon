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
    io,
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{io::AsyncWriteExt, sync::{Mutex, RwLock}};
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
    pub trusted_proxy_hops: usize,
    persistence_path: Option<PathBuf>,
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
            trusted_proxy_hops: 0,
            persistence_path: None,
        }
    }

    pub fn empty() -> Self {
        Self {
            scores: Arc::new(RwLock::new(Vec::new())),
            submission_timestamps: Arc::new(Mutex::new(HashMap::new())),
            trusted_proxy_hops: 0,
            persistence_path: None,
        }
    }

    pub fn with_trusted_proxy_hops(mut self, trusted_proxy_hops: usize) -> Self {
        self.trusted_proxy_hops = trusted_proxy_hops;
        self
    }

    pub fn from_file(path: impl Into<PathBuf>, trusted_proxy_hops: usize) -> io::Result<Self> {
        let path = path.into();
        let scores = match std::fs::read(&path) {
            Ok(contents) => serde_json::from_slice::<Vec<ScoreEntry>>(&contents)
                .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?,
            Err(error) if error.kind() == io::ErrorKind::NotFound => Vec::new(),
            Err(error) => return Err(error),
        };

        let mut scores = scores;
        scores.sort_by(|left, right| {
            right
                .score
                .cmp(&left.score)
                .then_with(|| right.wave.cmp(&left.wave))
        });
        scores.truncate(crate::models::MAX_LEADERBOARD_ENTRIES);

        Ok(Self {
            scores: Arc::new(RwLock::new(scores)),
            submission_timestamps: Arc::new(Mutex::new(HashMap::new())),
            trusted_proxy_hops,
            persistence_path: Some(path),
        })
    }

    pub async fn persist_scores(&self, scores: &[ScoreEntry]) -> io::Result<()> {
        let Some(path) = self.persistence_path.as_deref() else {
            return Ok(());
        };

        let parent = path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
            .unwrap_or_else(|| Path::new("."));
        tokio::fs::create_dir_all(parent).await?;

        let temporary_path = PathBuf::from(format!("{}.tmp", path.display()));
        let contents = serde_json::to_vec(scores)
            .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;

        let mut temporary_file = tokio::fs::File::create(&temporary_path).await?;
        temporary_file.write_all(&contents).await?;
        temporary_file.sync_all().await?;
        drop(temporary_file);

        tokio::fs::rename(&temporary_path, path).await?;
        tokio::fs::File::open(parent).await?.sync_all().await
    }

    pub async fn check_rate_limit(&self, client_ip: &str) -> bool {
        let now = Instant::now();
        let mut map = self.submission_timestamps.lock().await;

        if !map.contains_key(client_ip) && map.len() >= MAX_TRACKED_IPS {
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

            if map.len() >= MAX_TRACKED_IPS {
                return false;
            }
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

#[cfg(test)]
mod rate_limit_tests {
    use super::*;

    #[tokio::test]
    async fn rate_limiter_never_tracks_more_than_the_configured_ip_limit() {
        let state = AppState::empty();
        {
            let mut tracked = state.submission_timestamps.lock().await;
            for index in 0..MAX_TRACKED_IPS {
                tracked.insert(format!("192.0.2.{index}"), VecDeque::from([Instant::now()]));
            }
        }

        assert!(!state.check_rate_limit("198.51.100.1").await);
        assert_eq!(
            state.submission_timestamps.lock().await.len(),
            MAX_TRACKED_IPS
        );
    }

    #[tokio::test]
    async fn rate_limiter_keeps_existing_clients_available_at_capacity() {
        let state = AppState::empty();
        {
            let mut tracked = state.submission_timestamps.lock().await;
            for index in 0..MAX_TRACKED_IPS {
                tracked.insert(format!("192.0.2.{index}"), VecDeque::from([Instant::now()]));
            }
        }

        assert!(state.check_rate_limit("192.0.2.0").await);
        assert_eq!(
            state.submission_timestamps.lock().await.len(),
            MAX_TRACKED_IPS
        );
    }
}

#[cfg(test)]
mod persistence_tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_path() -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("tiny-myrmidon-scores-{nonce}.json"))
    }

    #[tokio::test]
    async fn persistent_store_round_trips_scores_and_sorts_them() {
        let path = temporary_path();
        let state = AppState::from_file(&path, 0).unwrap();
        let scores = vec![
            ScoreEntry::new("Lower".into(), 100, 2),
            ScoreEntry::new("Higher".into(), 500, 4),
        ];

        state.persist_scores(&scores).await.unwrap();

        let reloaded = AppState::from_file(&path, 0).unwrap();
        let stored = reloaded.scores.read().await;
        assert_eq!(stored.len(), 2);
        assert_eq!(stored[0].player_name, "Higher");
        assert_eq!(stored[1].player_name, "Lower");

        drop(stored);
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn persistent_store_rejects_corrupt_json_instead_of_silently_resetting() {
        let path = temporary_path();
        std::fs::write(&path, b"{invalid json").unwrap();

        let result = AppState::from_file(&path, 0);
        let error = result.err().unwrap();
        assert_eq!(error.kind(), io::ErrorKind::InvalidData);

        std::fs::remove_file(path).unwrap();
    }
}
