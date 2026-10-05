# Design system

Status: **Implemented** in Phase 2. The tokens live in
[`packages/design-tokens`](../packages/design-tokens) and the components in
[`packages/ui`](../packages/ui). The website's `/design-system` page shows all of it in both
themes and all three densities.

## Direction

### The subject

The screen is the second instrument in a DJ booth. A DJ glances at it for a fraction of a
second between the controller and the crowd, usually in the dark and sometimes in daylight,
and sometimes reaches out to touch it. Its job is to show the state of the music, what is
playing, where, how loud and whether it is in time, with no ambiguity.

### Principles

1. **Monochrome chrome, colour for signal.** The interface is neutral, like the mark. Hue
   appears only where it encodes something: frequency bands, deck identity, cue points,
   levels and status. A coloured pixel always means something.
2. **Numbers are instruments.** Tempo, time, pitch, key and gain use a monospaced face, so
   digits keep their place as values change, and readouts reserve room for their longest
   value so nothing around them shifts.
3. **Faceplate labels.** Controls are labelled with short uppercase words in a condensed
   width, like the legends printed on mixer hardware.
4. **Density follows the input.** Mouse and keyboard get compact or comfortable sizes; touch
   gets 44 px targets. A touch screen chooses touch sizes on its own.
5. **Controls never jump.** A stray click during a set must not change the sound: knobs and
   faders change only when dragged or moved with keys, never by clicking where the pointer
   lands.
6. **Motion confirms; it never decorates.** Transitions are short and only acknowledge a
   change of state. Meters and waveforms move because the audio moves; they are data, so
   reduced motion leaves them running.

### Signature

The faceplate pairing: condensed Archivo labels over Martian Mono readouts, like the legends
printed above the displays on DJ hardware. The bars of the mark recur only where bars mean
signal, in level meters and waveforms.

### How the direction was reviewed

The direction went through the two-pass review from the frontend-design skill: a plan of
palette, type, layout and signature, then a critique of anything that looked like a default
rather than a choice for this product.

| First plan                                                 | Revision and reason                                                                                                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One accent hue for primary buttons and selection           | Rejected. A near-black interface with one bright accent is a common default, and it would make colour mean "clickable" rather than "signal". The primary action inverts the chrome instead: light on dark, dark on light. |
| Mona Sans with Geist Mono                                  | Cleaner, but generic, and associated with other brands. Archivo with Martian Mono has the character of hardware labels and displays, and both faces have a width axis, which dense layouts need.                          |
| Signal colours at the same lightness (0.64) in both themes | Failed 3:1 against light panels. Light-theme signals moved to 0.55 with white labels; dark-theme signals sit at 0.76 with near-black labels. The token tests enforce both.                                                |
| A warm off-white light theme                               | Rejected as a default look. The light theme is a cool near-white with the same faint blue as the dark theme, so the two read as one product.                                                                              |
| Deck colours on every primary button of that deck          | Narrowed. Deck colour marks identity (the deck header and engaged deck controls, such as a lit sync); ordinary buttons stay neutral.                                                                                      |

The typefaces were chosen from rendered specimens of ten pairings with real deck content
(tempo, key, pitch, remaining time and gain, in a deck header and a library list), in both
themes. The sans candidates were Archivo, Mona Sans and Instrument Sans; the mono candidates
were Martian Mono, JetBrains Mono, Geist Mono, Fragment Mono, Red Hat Mono and Spline Sans
Mono.

## shadcn preset

The preset sets the shadcn style, base colour and radius. Waveform's own tokens then replace
shadcn's colours and fonts (see [Tokens](#tokens)).

| Setting        | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| Preset code    | `b1D0ekIC`                                                  |
| Style          | Mira, shadcn's compact style                                |
| Base colour    | Neutral                                                     |
| Theme          | Neutral                                                     |
| Radius         | Small (0.45rem)                                             |
| Icon library   | Phosphor                                                    |
| Menu           | Default, solid, with a subtle accent                        |
| Font           | Not used: fonts come from the design tokens                 |
| Component base | React Aria, set in `components.json` (preset codes omit it) |

It was applied with `shadcn apply b1D0ekIC --only theme`, which changed only the radius
(from 0.625rem) and reinstalled no components. To see what the project resolves to, run
`pnpm --dir packages/ui exec shadcn preset resolve --cwd ../../apps/web`.

## Tokens

[`src/tokens.ts`](../packages/design-tokens/src/tokens.ts) is the source of truth.
`src/tokens.css` is generated from it; never edit the CSS by hand. After changing a token, run
`pnpm --filter @waveform/design-tokens generate`. A test fails if the CSS is out of date.

Every token is a CSS custom property named `--wf-…`. The root element selects the variant:

| Choice  | Default                                          | Override on `<html>`                |
| ------- | ------------------------------------------------ | ----------------------------------- |
| Theme   | Follows the system (`prefers-color-scheme`)      | `class="light"` or `class="dark"`   |
| Density | Comfortable, or touch when the pointer is coarse | `data-density="compact"` and so on  |
| Motion  | Follows the system (`prefers-reduced-motion`)    | `data-motion="reduced"` or `"full"` |

The defaults need no JavaScript, so the first paint is already right. The providers in
`packages/ui` set the overrides when someone chooses one.

### Colour

All colours are OKLCH, inside the sRGB gamut so every display shows them as specified, and
the neutrals carry a faint blue (hue 286) taken from the icon. The dark canvas is exactly the
icon tile, `#0e0e10`.

| Group    | Roles                                                               | Use                                                                                              |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Surfaces | `canvas`, `sunken`, `surface`, `raised`, `control`, `control-hover` | The app background, wells for waveforms, panels, popovers and cards, and control fills.          |
| Lines    | `divider`, `control-border`, `focus`                                | Dividers are decoration. Control borders and the focus ring identify controls, so they keep 3:1. |
| Text     | `text`, `text-muted`                                                | Muted text still keeps 4.5:1 on every surface.                                                   |
| Primary  | `primary`, `primary-text`                                           | The primary action, as inverted chrome.                                                          |
| Status   | `danger`, `warning`, `positive`, each with a `-surface` tint        | Errors, warnings and confirmations, as text or icons, and the tinted backgrounds of alerts.      |
| Signal   | `band-low/mid/high`, `deck-a…d`, `cue-1…8`, `level-safe/hot/clip`   | Waveform bands (warm for bass to cool for treble), decks, hot cues, and meter segments.          |
| Labels   | `on-signal`                                                         | Text and icons drawn on any signal colour: white in light, near-black in dark.                   |

Signal colours share one lightness per theme (0.55 light, 0.76 dark) and take the strongest
chroma sRGB allows at their hue, up to 0.16, so no colour shouts louder than another. Cue
colours are spaced evenly around the hue circle.

**Contrast** follows WCAG 2.2 AA: 4.5:1 for text and 3:1 for controls and graphics.
[`src/contrast.ts`](../packages/design-tokens/src/contrast.ts) lists every pairing the
interface draws, and the tests check all of them in both themes. The design-system page
shows the live ratios.

### Typography

| Family                                               | Role                                | Axes                           |
| ---------------------------------------------------- | ----------------------------------- | ------------------------------ |
| [Archivo](https://github.com/Omnibus-Type/Archivo)   | Interface text, labels at 75% width | Weight 100–900, width 62–125   |
| [Martian Mono](https://github.com/evilmartians/mono) | Readouts at 87.5% width             | Weight 100–800, width 75–112.5 |

Both are under the SIL Open Font License 1.1 and are bundled from the Fontsource packages
(`@fontsource-variable/archivo` and `@fontsource-variable/martian-mono`). Nothing is loaded
from a font service. Browsers download only the subsets a page uses (about 90 KB for
Archivo's Latin subset and 38 KB for Martian Mono's).

| Role                                                | Size                       | Notes                                            |
| --------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| `label`                                             | 11 px                      | Uppercase, 75% width, weight 600, tracked 0.06em |
| `caption`                                           | 12 px                      |                                                  |
| `body`                                              | 13, 14 or 16 px by density |                                                  |
| `title`, `heading`, `display`                       | 15, 20 and 44 px           | Weights 600, 600 and 700                         |
| `readout-sm`, `readout`, `readout-lg`, `readout-xl` | 12, 15, 24 and 44 px       | Martian Mono at 87.5% width                      |

Numbers follow the formatters in `@waveform/core-utils`: a true minus sign (−) rather than a
hyphen, and a no-break space before the unit, as in "−3.5 dB". Archivo and Martian Mono have
no ♭, ♯ or ∞ glyphs, so those come from the system fonts listed after them (Apple Symbols,
Segoe UI Symbol or DejaVu); they may look slightly different from the surrounding digits.

### Density

| Token                 | Compact | Comfortable | Touch  |
| --------------------- | ------- | ----------- | ------ |
| Control height, small | 24 px   | 28 px       | 44 px  |
| Control height        | 28 px   | 32 px       | 48 px  |
| Control height, large | 32 px   | 40 px       | 56 px  |
| Minimum target        | 24 px   | 28 px       | 44 px  |
| Icon                  | 14 px   | 16 px       | 20 px  |
| Body text             | 13 px   | 14 px       | 16 px  |
| Knob                  | 40 px   | 48 px       | 64 px  |
| Fader travel          | 120 px  | 144 px      | 192 px |

Sizes are in rem, so they grow with the system text size; the pixel values assume the
default 16 px. Compact still meets the WCAG 2.2 minimum target size of 24 px.

### Shape and elevation

The radius scale comes from the preset's 0.45rem: 4.3 px for small parts (badges, keys),
5.8 px for controls, 7.2 px for panels and 10 px for overlays. Dark surfaces show elevation
by getting lighter; light surfaces use soft shadows (`shadow-raised`, `shadow-overlay`).

### Motion

| Token           | Value  | Use                       |
| --------------- | ------ | ------------------------- |
| `duration-fast` | 80 ms  | Press and toggle feedback |
| `duration-base` | 140 ms | Hover and state changes   |
| `duration-slow` | 220 ms | Panels and overlays       |

Easing is `ease-standard` (cubic-bezier(0.2, 0, 0, 1)) for changes in place, `ease-enter`
for things arriving and `ease-exit` for things leaving. With reduced motion (from the system,
or chosen in the app), the durations become 0 and CSS animations stop.

### Layers

`layer-base` (0), `layer-raised` (1), `layer-sticky` (10), `layer-drag` (20) and
`layer-overlay` (50). Dialogs, popovers and menus stack themselves at the overlay layer; do
not give them a z-index.

## Icons

Icons come from [Phosphor](https://phosphoricons.com) (`@phosphor-icons/react`).

- **Size:** inside controls, icons follow the density's icon size (14, 16 or 20 px). Elsewhere,
  use 16, 20, 24 or 32 px; 32 px is for empty states.
- **Weight:** regular from 16 px up. Below 16 px Phosphor's regular strokes are under 1 px, so
  compact density switches icons to bold. Fill marks an engaged state, such as a lit loop,
  never decoration. Thin, light and duotone are not used.
- **Labels:** an icon-only button always has an accessible name.
- **Custom glyphs** are drawn only where Phosphor has nothing suitable, on Phosphor's 256-unit
  grid with matching strokes. Phase 2 needed none: DJ hardware labels cue, sync and loop
  buttons with words, and Waveform does the same.

## Interaction states

| State    | Treatment                                                                                     |
| -------- | --------------------------------------------------------------------------------------------- |
| Hover    | The fill moves one step up the surface scale.                                                 |
| Pressed  | The fill moves up again, without delay (`duration-fast`).                                     |
| Focus    | A 2 px ring in the `focus` colour with a 2 px gap, shown for keyboard focus only.             |
| Selected | The control inverts (primary colours).                                                        |
| Engaged  | Deck controls that are on, such as sync, light up in the deck's colour with `on-signal` text. |
| Disabled | 50% opacity, no pointer events, and the control explains elsewhere why it is unavailable.     |
| Invalid  | The `danger` colour on the border, with a message in words.                                   |

Keyboard shortcuts are shown with the `Kbd` component next to the action they trigger.

## Controls

The DJ controls are built on React Aria's slider hooks, so they behave like native sliders for
keyboards and screen readers.

| Control      | What it is                                                                                |
| ------------ | ----------------------------------------------------------------------------------------- |
| `Knob`       | A rotary control. Drag up or down anywhere on it; double-click returns it to its default. |
| `Fader`      | A vertical or horizontal slider. Only the cap moves it; clicking the track does nothing.  |
| `Readout`    | A labelled value in the readout face, with room reserved for its longest value.           |
| `LevelMeter` | A segmented meter, with the hot and clip segments in the level colours and a peak marker. |

- **Keyboard:** arrow keys move by one step, Shift with an arrow or Page Up and Page Down by a
  larger step, and Home and End to the ends of the range.
- **Screen readers:** values are announced with their units, for example "−3.5 dB", through
  `aria-valuetext`. Meters use the `meter` role.

## Using the system

- **In components,** use the Tailwind classes generated from the tokens: colours such as
  `bg-canvas`, `bg-surface` and `text-muted-foreground`; type roles such as `text-body`,
  `text-title` and `text-readout-lg`; and density sizes such as `h-control`, `px-control-x`,
  `size-knob` and `h-target`. Two utilities set a whole face: `faceplate` for control labels
  and `readout` for numbers. Inside `data-deck="a"` (or `b`, `c`, `d`), `bg-deck`,
  `border-deck` and `text-deck` use that deck's colour. shadcn's variables (`--background`,
  `--primary`, …) point at the tokens, so shadcn components follow them too.
- **For preferences,** wrap the app in `PreferencesProvider` and put `AppearanceSettings`
  where people change them. `useTheme`, `useDensity` and `useMotion` give the resolved values.
  With no saved choice, nothing needs JavaScript: CSS follows the system theme, the pointer
  type and the reduced-motion setting. Saved choices are applied before the first paint, by
  `savedPreferencesScript` in a server-rendered page's head or `applySavedPreferences()` in
  a client-rendered app.
- **In TypeScript,** import token values and names from `@waveform/design-tokens`; `cssVar()`
  gives a `var(--wf-…)` reference.
- **In canvas code,** such as waveform renderers, `readToken()` returns a token's current value.
  Read it again when the theme changes.

## Examples

The website's [`/design-system`](../apps/web/app/design-system) page shows the tokens,
type, densities, states, motion and two composed specimens (a deck header and a
transport strip). Specimens are labelled as specimens and are not connected to audio.

Light and dark screenshots live in [`docs/screenshots/`](screenshots/): the website
page (`design-system-light.png`, `design-system-dark.png`) and the desktop About and
appearance shell (`desktop-light.png`, `desktop-dark.png`).

## macOS Liquid Glass icon

Deferred. Tauri 2.12 can take a `.icon` (Icon Composer) asset and compile it with
`actool` during bundling, but that path still crashes
([tauri-apps/tauri#15315](https://github.com/tauri-apps/tauri/issues/15315), last
confirmed open on 2026-10-04 on `@tauri-apps/cli` 2.12.1). The app keeps the existing
`.icns` / PNG / ICO set from `tauri icon`. A Liquid Glass icon will be added when that
bug is closed, or by committing a precompiled `Assets.car` alongside the `.icns`
fallback.
