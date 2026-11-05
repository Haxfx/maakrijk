//! The committed contract must match the code, so the web types stay in sync.

#[test]
fn openapi_file_is_current() {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../contracts/openapi.json");
    let committed = std::fs::read_to_string(path).unwrap_or_default();
    assert!(
        committed == maakrijk_api::http::openapi::json(),
        "contracts/openapi.json is stale: run `cargo run --bin export-openapi` and `npm run gen:api`"
    );
}
