//! A signed-in test device.

use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use serde_json::{Value, json};

use super::{Res, send};

/// A signed-in device: either a browser (cookie + CSRF header) or a native shell (bearer).
pub struct Client {
    pub cookie: Option<String>,
    pub bearer: Option<String>,
}

impl Client {
    pub async fn browser(app: &Router) -> Self {
        let req = Request::post("/api/session")
            .header("x-maakrijk", "1")
            .body(Body::empty())
            .unwrap();
        let res = send(app, req).await;
        assert_eq!(res.status, StatusCode::OK);
        assert_eq!(res.body["created"], true);
        assert!(
            res.body.get("token").is_none(),
            "web clients never get the token"
        );
        let set = res.headers[header::SET_COOKIE]
            .to_str()
            .unwrap()
            .to_string();
        assert!(set.contains("HttpOnly") && set.contains("SameSite=Strict"));
        let cookie = set.split(';').next().unwrap().to_string();
        Client {
            cookie: Some(cookie),
            bearer: None,
        }
    }

    pub async fn native(app: &Router) -> Self {
        let req = Request::post("/api/session")
            .header("x-maakrijk-client", "native")
            .body(Body::empty())
            .unwrap();
        let res = send(app, req).await;
        assert_eq!(res.status, StatusCode::OK);
        let token = res.body["token"]
            .as_str()
            .expect("native gets token")
            .to_string();
        Client {
            cookie: None,
            bearer: Some(token),
        }
    }

    pub fn req(&self, method: &str, uri: &str, body: Option<Value>) -> Request<Body> {
        let mut b = Request::builder().method(method).uri(uri);
        if let Some(c) = &self.cookie {
            b = b.header(header::COOKIE, c).header("x-maakrijk", "1");
        }
        if let Some(t) = &self.bearer {
            b = b.header(header::AUTHORIZATION, format!("Bearer {t}"));
        }
        match body {
            Some(v) => b
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(v.to_string()))
                .unwrap(),
            None => b.body(Body::empty()).unwrap(),
        }
    }

    pub async fn call(&self, app: &Router, method: &str, uri: &str, body: Option<Value>) -> Res {
        send(app, self.req(method, uri, body)).await
    }

    pub async fn create(&self, app: &Router, nickname: &str) -> Res {
        self.call(
            app,
            "POST",
            "/api/profiles",
            Some(json!({"nickname": nickname, "avatar": "kid-1"})),
        )
        .await
    }
}
