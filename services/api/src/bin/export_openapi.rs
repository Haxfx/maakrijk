//! Writes the OpenAPI contract to `contracts/openapi.json` (repo root).
//! With `--check` it only compares and exits 1 when the file is stale.

use std::path::PathBuf;

fn main() {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../contracts/openapi.json");
    let fresh = maakrijk_api::http::openapi::json();
    if std::env::args().any(|a| a == "--check") {
        let current = std::fs::read_to_string(&path).unwrap_or_default();
        if current != fresh {
            eprintln!(
                "contracts/openapi.json is out of date: run `cargo run --bin export-openapi`"
            );
            std::process::exit(1);
        }
        println!("contracts/openapi.json is up to date");
        return;
    }
    std::fs::create_dir_all(path.parent().unwrap()).expect("create contracts folder");
    std::fs::write(&path, fresh).expect("write openapi.json");
    println!("wrote {}", path.display());
}
