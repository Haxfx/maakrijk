//! Runtime configuration, read once from the environment at start.

use std::net::SocketAddr;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub bind_addr: SocketAddr,
    /// Folder with a static Nuxt build. `None` when only the API runs.
    pub web_dir: Option<PathBuf>,
    pub cookie_secure: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("{0} is not set")]
    Missing(&'static str),
    #[error("{name} is invalid: {reason}")]
    Invalid { name: &'static str, reason: String },
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        let get = |name: &'static str| std::env::var(name).ok().filter(|v| !v.trim().is_empty());

        let database_url = get("DATABASE_URL").ok_or(ConfigError::Missing("DATABASE_URL"))?;
        let bind_addr = get("BIND_ADDR")
            .unwrap_or_else(|| "127.0.0.1:8800".into())
            .parse()
            .map_err(|e: std::net::AddrParseError| ConfigError::Invalid {
                name: "BIND_ADDR",
                reason: e.to_string(),
            })?;
        let web_dir = get("WEB_DIR").map(PathBuf::from);
        let cookie_secure = match get("COOKIE_SECURE").as_deref() {
            None | Some("false") | Some("0") => false,
            Some("true") | Some("1") => true,
            Some(other) => {
                return Err(ConfigError::Invalid {
                    name: "COOKIE_SECURE",
                    reason: format!("expected true or false, got {other}"),
                });
            }
        };
        Ok(Self {
            database_url,
            bind_addr,
            web_dir,
            cookie_secure,
        })
    }

    /// The database name only (never the credentials), for diagnostics.
    pub fn database_name(&self) -> String {
        database_name(&self.database_url)
    }
}

/// Last path segment of a connection URL, without query string.
pub fn database_name(url: &str) -> String {
    url.rsplit('/')
        .next()
        .unwrap_or_default()
        .split('?')
        .next()
        .unwrap_or_default()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::database_name;

    #[test]
    fn database_name_hides_credentials() {
        assert_eq!(
            database_name("postgres://u:secret@127.0.0.1:5450/maakrijk_dev"),
            "maakrijk_dev"
        );
        assert_eq!(
            database_name("postgres://u:p@h/maakrijk_test?sslmode=disable"),
            "maakrijk_test"
        );
    }
}
