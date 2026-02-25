# Current WrenchIt Backend

WrenchIt uses a multi-module Spring Boot backend for a mechanic marketplace.
It provides store search (including optional Google Places integration), reviews, saved shops, and user profile linkage via Keycloak-compatible JWTs.

## Repo Structure
- `services/api` — HTTP API gateway (controllers + security)
- `services/stores` — store domain, search, Google Places integration
- `services/engagement` — reviews and saved shops
- `services/auth` — auth helper service (resource server + `/auth/me`)
- `main` — (IN PROGRESS) - app module
- `docker-compose.yml` — Postgres + Keycloak + ClamAV

## Requirements
- Java 21
- Maven (or `./mvnw`)
- Docker (for Postgres/Keycloak)

## Quick Start
1) Start infrastructure:
```
docker-compose up -d
```

2) Run API service (optional if not using the compose `api` container):
```
./mvnw -pl services/api -am spring-boot:run
```

3) (Optional) Run auth service:
```
./mvnw -pl services/auth -am spring-boot:run
```

Demo URLs:
- Frontend: `http://localhost:8081`
- API health: `http://localhost:8080/actuator/health`
- Keycloak admin: `http://localhost:8082/admin`

### Local Map Key (No .env Required)
Use this when you want to keep the repo public and avoid exposing keys.

1) Edit `www/public/config.js` and paste your browser Maps API key in `googleMapsApiKey`.

2) Rebuild frontend container:
```
docker-compose up -d --build www
```

3) Open `http://localhost:8081/search`.

## Build
Build all modules:
```
./mvnw clean install
```

Build only API:
```
./mvnw -pl services/api -am clean install
```

## Configuration
Default configuration is in `services/api/src/main/resources/application.yml`.

Key env vars:
- `POSTGRES_APP_HOST` (default `localhost`)
- `POSTGRES_APP_PORT` (default `5432`)
- `POSTGRES_APP_DB` (default `wrenchit_app`)
- `POSTGRES_APP_USER` (default `wrenchit_app_user`)
- `POSTGRES_APP_PASSWORD` (default `wrenchitApp123`)
- `GOOGLE_PLACES_API_KEY` (optional)

Google Places integration (disabled by default):
```
wrenchit:
  google:
    enabled: true
    api-key: ${GOOGLE_PLACES_API_KEY}
```

## Core Endpoints
Base URL: `http://localhost:8080`

Store search:
- `GET /api/stores/search?q=brakes&limit=20&offset=0`
- Optional filters: `minRating`, `services`, `city`, `state`, `hasWebsite`, `hasPhone`, `openNow`
- Optional geo: `lat`, `lng`, `radiusKm`

Store details:
- `GET /api/stores/{id}`
- `GET /api/stores/place/{placeId}` (syncs from Google if enabled)

Compare stores:
- `GET /api/stores/compare?ids=uuid&ids=uuid&sort=RATING&direction=DESC`

Reviews:
- `GET /api/stores/{storeId}/reviews`
- `POST /api/stores/{storeId}/reviews`

Saved shops:
- `POST /api/stores/{storeId}/save`
- `DELETE /api/stores/{storeId}/save`
- `GET /api/me/saved`

```

## Notes
- Auth is handled via JWT resource server configuration. Keycloak setup is expected but not required for local.
- Search uses Postgres full-text search + trigram matching. Radius search uses a Haversine query.
