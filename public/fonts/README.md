# Ironhorse

The site's typography is set in **Ironhorse**, by the Fontry. **No font file is
committed here, and the site does not serve one.** That is a licensing
requirement, not an oversight — see below.

## Licence status: not cleared for web use

The freely circulating files are `FTY_IRONHORSE_NCV.ttf` — **NCV = Non
Commercial Version** — and they ship with a personal-use EULA. Two of its
clauses block serving the font from this website:

> **3. Third parties** — "You may not provide the font or make it accessible to
> any third parties."

Hosting a webfont does exactly this. Every visitor's browser downloads the font
file from the server, which makes it accessible to an unlimited number of third
parties.

> **5. Modifications** — "You may not modify, adapt, translate, reverse
> engineer, decompile, disassemble, or create derivative works based on the
> licensed font itself without Foundry's prior written consent."

Converting the TTF to WOFF2 — which is what makes a font usable on the web — is
a derivative work of the font.

Clause 1 also limits permitted web use to non-commercial work, giving "personal
web sites" as the example. A club's public site is at best a grey area even
before the two clauses above.

## Getting it cleared

The Fontry sells a commercial/web licence. The EULA gives the contact directly:

- Email: the_fontry@yahoo.com
- Web: http://thefontry.com/ironfamily

Once the club holds a web licence, wiring it up is a small job: convert the
licensed TTF to WOFF2, save it as `public/fonts/ironhorse.woff2`, and add the
`url(...)` sources back to the `@font-face` rule in `app/globals.css` alongside
the existing `local()` entries. Nothing else changes.

## What happens in the meantime

The `@font-face` rule lists **only `local()` sources**. This is licence-clean:
nothing is transmitted by the site, and the face is used only on machines where
the visitor has already installed it themselves — which the personal-use licence
permits them to do. Everyone else falls through to **Oswald**, a condensed
industrial face chosen as the closest widely available stand-in.

So club members who install the font on their own computer see the site in
Ironhorse; the site itself never distributes it.

The names in the rule are the fonts' real internal family names, read out of the
TTFs:

| File | Family name |
| --- | --- |
| `FTY_IRONHORSE_NCV.ttf` | `FTY IRONHORSE NCV` |
| `FTY_IRONRIDER_NCV.ttf` | `FTY IRONRIDER NCV` |

This matters: a plain `local("Ironhorse")` matches nothing, so before this was
corrected even a member who had installed the font would still have seen the
fallback.

## Restricting Ironhorse to headings

Ironhorse is a display face. It is applied site-wide, including body copy, which
is what gives the site its character but costs some legibility at small sizes.
To keep it for headings only, remove `"Ironhorse", ` from the `--font-sans`
declaration in `app/globals.css` and leave `--font-display` as it is.
