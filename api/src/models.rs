use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

pub const MAX_NAME_LENGTH: usize = 30;
pub const MAX_LEADERBOARD_ENTRIES: usize = 50;
pub const MAX_WAVE: u32 = 1_000;
pub const MAX_POINTS_PER_WAVE: u64 = 10_000;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScoreEntry {
    pub player_name: String,
    pub score: u64,
    pub wave: u32,
    pub created_at: u64,
}

impl ScoreEntry {
    pub fn new(player_name: String, score: u64, wave: u32) -> Self {
        Self {
            player_name,
            score,
            wave,
            created_at: current_timestamp(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewScore {
    pub player_name: String,
    pub score: u64,
    pub wave: u32,
}

impl NewScore {
    pub fn validate(&self) -> Result<String, &'static str> {
        let trimmed = self.player_name.trim();

        if trimmed.is_empty() {
            return Err("Player name cannot be empty");
        }
        if trimmed.chars().count() > MAX_NAME_LENGTH {
            return Err("Player name exceeds maximum length");
        }
        if trimmed.chars().any(|c| c.is_control()) {
            return Err("Player name cannot contain control characters");
        }
        if self.wave > MAX_WAVE {
            return Err("Wave exceeds maximum allowed value");
        }
        if self.wave == 0 && self.score > 0 {
            return Err("Score cannot be positive at wave 0");
        }

        let max_plausible_score = (u64::from(self.wave) + 1).saturating_mul(MAX_POINTS_PER_WAVE);
        if self.score > max_plausible_score {
            return Err("Score exceeds maximum plausible value for this wave");
        }

        Ok(trimmed.to_string())
    }
}

pub fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_validate_valid_player_name() {
        let score = NewScore {
            player_name: "  Leonidas  ".into(),
            score: 1000,
            wave: 5,
        };
        assert_eq!(score.validate().unwrap(), "Leonidas");
    }

    #[test]
    fn should_validate_unicode_player_name_by_char_count() {
        let score = NewScore {
            player_name: "é".repeat(MAX_NAME_LENGTH),
            score: 1000,
            wave: 1,
        };
        assert_eq!(score.validate().unwrap().chars().count(), MAX_NAME_LENGTH);
    }

    #[test]
    fn should_reject_empty_player_name() {
        let score = NewScore {
            player_name: "   ".into(),
            score: 500,
            wave: 2,
        };
        assert!(score.validate().is_err());
    }

    #[test]
    fn should_reject_too_long_player_name() {
        let score = NewScore {
            player_name: "A".repeat(MAX_NAME_LENGTH + 1),
            score: 500,
            wave: 2,
        };
        assert!(score.validate().is_err());
    }

    #[test]
    fn should_reject_control_characters_in_player_name() {
        let score = NewScore {
            player_name: "Hercules\nFakeLogEntry".into(),
            score: 500,
            wave: 2,
        };
        assert!(score.validate().is_err());
    }

    #[test]
    fn should_reject_positive_score_at_wave_zero() {
        let score = NewScore {
            player_name: "Cheater".into(),
            score: 100,
            wave: 0,
        };
        assert!(score.validate().is_err());
    }

    #[test]
    fn should_reject_implausible_score_for_wave() {
        let score = NewScore {
            player_name: "Cheater".into(),
            score: 999_999_999,
            wave: 1,
        };
        assert!(score.validate().is_err());
    }

    #[test]
    fn should_reject_excessive_wave() {
        let score = NewScore {
            player_name: "Cheater".into(),
            score: 100,
            wave: MAX_WAVE + 1,
        };
        assert!(score.validate().is_err());
    }
}
