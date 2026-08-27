# Club patch

The MONARCHS MC patch is used as a fixed watermark behind the whole site.

## Adding the image

Save the artwork here, with exactly this name:

```
public/brand/monarchs-logo.png
```

A transparent-background PNG is what the styling expects — the watermark is
composited over black, so a white rectangle behind the patch would show as a
pale block. An SVG works too; point the `background-image` in
`app/globals.css` at it if you use one.

Nothing else needs changing. The rule that draws it is `.u-brand-watermark`
in `app/globals.css`, applied by a single element in `app/layout.tsx`.

## Until then

`background-image` pointing at a file that is not there resolves to nothing,
so the site renders on flat black exactly as before. A missing image never
breaks the build or the page.

## Tuning it

The watermark is deliberately faint — a few percent — because the artwork sits
directly beneath body copy and the site depends on gray-on-black contrast
staying readable. Adjust it in one place:

```css
:root {
  --brand-watermark-opacity: 0.06;   /* raise carefully, and re-check contrast */
}
```

Size and placement live in the same rule: `background-size` is
`min(70vw, 70vh)`, centred, and `position: fixed` keeps it still while the page
scrolls so it reads as a mark on the page rather than an image in the content.
