## WrenchIT Frontend (www/)

Modern React/Vite frontend for the WrenchIT platform – a marketplace to help drivers find honest local mechanics, compare prices, and manage reviews and bookings. This app focuses on a pixel-perfect, dark-theme UI that mirrors the Figma design while providing clean seams for backend integration.

### Tech stack

- **Runtime / Framework**: React 18+ with functional components and hooks
- **Build tool**: Vite
- **Routing**: `react-router-dom`
- **Styling**:
  - Bootstrap utility classes for layout and grids
  - Custom dark theme in `src/styles/theme.css` (single source of truth for colors, typography, inputs, buttons)
- **Icons**: `react-icons/lu` (Lucide icon set)
- **API layer**:
  - Central `src/api/client.js` using `fetch` with `credentials: 'include'` and `/api` base path
  - Domain modules in `src/api/*.js` (`stores`, `reviews`, `saved`, etc.)

### Key features (frontend)

- **Public pages**: Home, search, shop profile, price comparison, login/register, not found
- **Review flows**: Write review, review verification dashboard, user dashboard for reviews/bookings/saved shops
- **Dashboards**: User dashboard plus mechanic, shop-owner, and admin dashboards wired to backend endpoints
- **Management screens**: Manage shop info and services for shop owners via `/api/shop/me/*`

### Project structure (high level)

- `src/App.jsx` – router shell and route definitions
- `src/main.jsx` – React/Vite entrypoint, global CSS imports
- `src/styles/theme.css` – dark theme, typography, buttons, inputs, badges
- `src/pages/` – route-level pages (HomePage, SearchPage, ShopProfilePage, dashboards, auth, management, etc.)
- `src/components/` – shared UI components (layout, cards, review widgets, status badges)
- `src/api/` – API client and domain-specific modules

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm (comes with Node)

### Local development

From the `www/` directory:

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the dev server**

   ```bash
   npm run dev
   ```

3. Open the URL printed by Vite (typically `http://localhost:5173`).

During development, the frontend expects the backend to be reachable via the `/api` path (this is usually handled by the dev proxy/Caddy configuration in this repository).

### Production build

From the `www/` directory:

```bash
npm run build
```

This produces an optimized, static build in `www/dist/` suitable for serving behind Caddy or Nginx. To verify the build locally:

```bash
npm run preview
```
