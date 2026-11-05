//! Build metadata for `GET /api/version`: git commit, dirty flag and build time.
//! `GIT_COMMIT` / `BUILD_TIME` from the environment win (e.g. in Docker).

use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

/// Days since 1970-01-01 to (year, month, day), proleptic Gregorian.
fn civil(days: i64) -> (i64, u32, u32) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    let y = yoe + era * 400 + i64::from(m <= 2);
    (y, m, d)
}

fn git(args: &[&str]) -> Option<String> {
    let out = Command::new("git").args(args).output().ok()?;
    out.status
        .success()
        .then(|| String::from_utf8_lossy(&out.stdout).trim().to_string())
}

fn main() {
    println!("cargo:rerun-if-env-changed=GIT_COMMIT");
    println!("cargo:rerun-if-env-changed=BUILD_TIME");
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=../../.git/HEAD");
    println!("cargo:rerun-if-changed=../../.git/index");
    println!("cargo:rerun-if-changed=src");
    println!("cargo:rerun-if-changed=migrations");

    let commit = std::env::var("GIT_COMMIT")
        .ok()
        .filter(|c| !c.is_empty())
        .or_else(|| git(&["rev-parse", "--short", "HEAD"]).filter(|c| !c.is_empty()))
        .unwrap_or_else(|| "unknown".into());
    // Uncommitted changes in the API folder make the build "dirty" (shown as `+`).
    let dirty = git(&["status", "--porcelain", "--", "."]).is_some_and(|s| !s.is_empty());
    println!("cargo:rustc-env=MAAKRIJK_GIT_COMMIT={commit}");
    println!("cargo:rustc-env=MAAKRIJK_GIT_DIRTY={dirty}");

    let time = std::env::var("BUILD_TIME")
        .ok()
        .filter(|t| !t.is_empty())
        .unwrap_or_else(|| {
            let secs = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_or(0, |d| d.as_secs() as i64);
            let (y, m, d) = civil(secs.div_euclid(86_400));
            let s = secs.rem_euclid(86_400);
            format!(
                "{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}Z",
                s / 3600,
                s % 3600 / 60,
                s % 60
            )
        });
    println!("cargo:rustc-env=MAAKRIJK_BUILD_TIME={time}");
}
