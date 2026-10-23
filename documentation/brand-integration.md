# Canadian AI brand integration

This application uses the **canonical Canadian AI** brand system from [canadian-ai/brand-components](https://github.com/canadian-ai/brand-components).

- `styles/generated-tokens.css` and `styles/semantic-theme.css` are synchronized from the brand repository. Do not hand-tune their colour values; update them in the brand source, then sync.
- `app/globals.css` is based on the brand repository's global stylesheet, with the same Inter + Playfair typography and hard-corner radius values.
- `components/cai-logo.tsx` carries the approved vector geometry from `components/component-library/starter-components/cai-logo.tsx`. The shape must not be replaced by text initials or generic glyphs.
- The public favicon/icon and social assets were previously rolled out from the same brand repository. Keep using that rollout pipeline for asset refreshes.
- The app supports system light/dark mode with an explicit switch. Both palettes come from the shared semantic theme.

## Verification

Run `npm test`, `npm run build`, and check light/dark contrast. Confirm that browser icons use the CAI mark, buttons/cards have sharp corners, and Open Graph metadata resolves to `https://favicon.canadian-ai.app`.
