# BAMCO Visual Layout Editor (Builder.io)

This integration is intentionally **zero-impact by default**. If no Builder Content Public API Key is configured, the current BAMCO app behaves exactly as before and the Builder CDN is not loaded.

## One-time Builder setup

1. Create/open a Builder Content Space.
2. Create two Section/Page models with these exact API names:
   - `bamco-login-layout`
   - `bamco-welcome-layout`
3. Copy the **Builder Content Public API Key** from Builder Space Settings.
4. Put that value in `assets/js/builder-config.js` as `apiKey`.
5. In Builder, set the Preview URL to:
   `https://nazanin-ghaemizadeh.github.io/BAMCO-TASK-MANAGEMENT/`

## Blocks available in Builder

After the key is configured, the Visual Editor receives these BAMCO blocks:

- `BAMCO Login Brand / Welcome` — moves the existing brand/title block without recreating it.
- `BAMCO Login Form` — moves the real existing login form, so its authentication/verification logic stays intact.
- `BAMCO Welcome Card` — moves the existing post-login welcome card.

Use Builder Boxes/Sections/Grid around these blocks to change positioning, width, spacing, alignment, and responsive layout visually.

## Safety / fallback

- The original login and welcome markup remains the source of truth.
- Builder only takes over a view after one of the registered BAMCO blocks is actually rendered inside Builder content.
- With an empty/invalid key, no visual takeover occurs.
- Kanban, Archive, Dashboard, Supabase logic, task logic, and authentication logic are not changed by this integration.
