//! OpenAPI description of the HTTP contract. Exported to
//! `contracts/openapi.json` by `cargo run --bin export-openapi`; the web app
//! generates its TypeScript types from that file.

use utoipa::OpenApi;
use utoipa::openapi::security::{ApiKey, ApiKeyValue, HttpAuthScheme, HttpBuilder, SecurityScheme};

use crate::http::{error, health, profiles, session, version};
use crate::platform;

#[derive(OpenApi)]
#[openapi(
    info(title = "Maakrijk API", description = "Server-authoritative game platform API."),
    paths(
        health::health,
        version::version,
        session::ensure_session,
        profiles::list,
        profiles::create,
        profiles::update,
        profiles::delete,
    ),
    components(schemas(
        error::ErrorBody,
        health::Health,
        version::VersionInfo,
        session::SessionInfo,
        platform::profiles::Profile,
        profiles::NewProfile,
        profiles::ProfilePatch,
    )),
    modifiers(&Security)
)]
pub struct ApiDoc;

struct Security;

impl utoipa::Modify for Security {
    fn modify(&self, api: &mut utoipa::openapi::OpenApi) {
        let c = api.components.get_or_insert_with(Default::default);
        c.add_security_scheme(
            "cookie",
            SecurityScheme::ApiKey(ApiKey::Cookie(ApiKeyValue::new(
                platform::auth::COOKIE_NAME,
            ))),
        );
        c.add_security_scheme(
            "bearer",
            SecurityScheme::Http(HttpBuilder::new().scheme(HttpAuthScheme::Bearer).build()),
        );
    }
}

/// Pretty JSON, stable between runs.
pub fn json() -> String {
    ApiDoc::openapi()
        .to_pretty_json()
        .expect("serialize openapi")
        + "\n"
}
