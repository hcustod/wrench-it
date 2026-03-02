# WrenchIt

WrenchIt is an auto service finder application. 

Our goal is to connect users to desired auto service stores more easily. 

Users can register, search and compare repair shops, view shop details, save shops, and manage portal workflows through a single web application.
User can review stores, and upload reciepts of services for verification. 

Store owners can create a profile then manage store listings by provide details such as services offered, location, and phone. 
We are excited to implement a full booking system in future releases. 

## Tools and Tech
- Frontend: React + Vite, served by Caddy
- Backend: Java 21, Spring Boot (modular services in `services/*`)
- Data: PostgreSQL
- Auth: Keycloak (JWT/OIDC)
- Deployment: Docker
- Integrations: Google Places / Google Maps (optional), ClamAV (file scan service - work in progress)

## What You Need
- Docker + Docker Compose
- A local `.env` file (copied from `.env.example`)

Required values in `.env`:
- `POSTGRES_AUTH_PASSWORD`
- `POSTGRES_APP_PASSWORD`
- `POSTGRES_KC_PASSWORD`
- `KEYCLOAK_ADMIN_PASSWORD`
- `KEYCLOAK_DEMO_USER_PASSWORD`
- `KEYCLOAK_DEMO_ADMIN_PASSWORD`

Optional (to change in future releases):
- `GOOGLE_PLACES_API_KEY`
- `WRENCHIT_FRONTEND_GOOGLE_MAPS_API_KEY`

## A simple Configuration Example
- Default API config: `services/api/src/main/resources/application.yml`
- Runtime/local secrets: `.env` (used by `docker compose`)
- `.env` is UNTRACKED and should NEVER be committed

Key env vars:
- `POSTGRES_APP_HOST` (default `localhost` for direct API run; compose uses `db_app`)
- `POSTGRES_APP_PORT` (default `5432`)
- `POSTGRES_APP_DB` (default `wrenchit_app`)
- `POSTGRES_APP_USER` (default `wrenchit_app_user`)
- `POSTGRES_APP_PASSWORD` (required)
- `POSTGRES_AUTH_PASSWORD` (required for compose)
- `POSTGRES_KC_PASSWORD` (required for compose)
- `KEYCLOAK_ADMIN_PASSWORD` (required for compose)
- `KEYCLOAK_DEMO_USER_PASSWORD` (required for realm import)
- `KEYCLOAK_DEMO_ADMIN_PASSWORD` (required for realm import)
- `GOOGLE_PLACES_API_KEY` (optional, backend Places integration)
- `WRENCHIT_FRONTEND_GOOGLE_MAPS_API_KEY` (optional, frontend map rendering)

Google backend config in `application.yml`:
```yaml
wrenchit:
  google:
    enabled: ${WRENCHIT_GOOGLE_ENABLED:false}
    api-key: ${GOOGLE_PLACES_API_KEY:}
```

If you update `WRENCHIT_FRONTEND_GOOGLE_MAPS_API_KEY`, rebuild the frontend container:
```bash
docker compose up -d --build www
```

## Bring the App Up
1. Create local env file:
```bash
cp .env.example .env
```
2. Edit `.env` and fill required values.
3. Start the full stack:
```bash
docker compose up --build -d
```
4. Open:
- Frontend: `http://localhost:8081`
- API health (via frontend proxy): `http://localhost:8081/api/actuator/health`
- Keycloak admin: `http://localhost:8082/admin`

First startup can take a few minutes because Maven dependencies are installed in the `api` container.

## Useful Commands
- Stop:
```bash
docker compose down
```
- Full reset (containers + volumes):
```bash
docker compose down -v
docker compose up --build -d
```
