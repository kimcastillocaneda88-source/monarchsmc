# Ironhorse

The site's typography is set in **Ironhorse**. The font files themselves are
deliberately **not committed to this repository**: Ironhorse is a licensed
display face and is not available from Google Fonts or any other font CDN, so
redistributing it here would breach its licence.

## Installing the font

1. Obtain Ironhorse under a licence that permits web embedding (a webfont or
   desktop licence with `@font-face` rights).
2. Convert it to WOFF2 (and optionally WOFF for older browsers).
3. Drop the files into this directory using exactly these names:

   ```
   public/fonts/ironhorse.woff2
   public/fonts/ironhorse.woff     # optional
   ```

4. Redeploy. Nothing else needs changing — the `@font-face` rule at the top of
   `app/globals.css` already points at these paths.

## What happens until then

The `@font-face` rule lists `local("Ironhorse")` first, so a copy already
installed on a visitor's machine is used with no download at all. If neither a
local copy nor a hosted file is found, the rule simply never matches and the
font stacks in `app/globals.css` fall through to **Oswald** — a condensed
industrial face chosen as the closest widely available stand-in.

This means a missing font file never breaks the build and never leaves the site
unstyled. It just renders in the fallback until the licensed file is added.

## Restricting Ironhorse to headings

Ironhorse is a display face. It is currently applied site-wide, including body
copy, which is what gives the site its character but costs some legibility at
small sizes. To keep it for headings only, remove `"Ironhorse", ` from the
`--font-sans` declaration in `app/globals.css` and leave `--font-display`
as it is.
