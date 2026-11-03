# Interface review

Mode: **full**, within the shared app/browser scope. Framework: React Native/React Native Web; existing `StyleSheet` primitives and `src/ui/theme.ts` tokens. Reviewed the five main screens, import/explanation/settings/recovery dialogs, desktop/phone navigation, and native widget layout source. Native iOS rendering and physical-device accessibility remain outside the verified boundary.

## Coverage

| Category | Evidence inspected | Result |
| --- | --- | --- |
| Typography | `theme.ts`, common text styles, Today statistics/countdowns, five phone pages, desktop screenshot | Muted-text contrast corrected; dynamic numerals use tabular figures. |
| Surfaces | Cards, hero, import/settings sheets, buttons, navigation; 390×844 and 1440×1050 screenshots | Touch targets and hero artwork corrected; no horizontal page overflow. |
| Animations | Common Pressable states and Modal fade; source inspection | Restrained press feedback; no recurring list entrance animation. Slow-motion native modal playback is not verified. |
| Icons | Shared SVG `Icon`, active navigation, bundled game artwork | One outline icon system with color state; incorrect Phoenix asset key corrected. |
| Performance | Bundled assets, responsive views, `useMemo` projections, widget serialization | Artwork is bundled; no animation library, continuous JS widget timer or broad transition declarations. OS widget performance still needs device profiling. |

## Resolved findings

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `src/ui/theme.ts`, sidebar/page eyebrow text | Muted text `#76806E` | Shared `#65715F`; measured contrast about 4.82:1 on canvas and 5.15:1 on white | Small supporting labels need readable contrast. |
| MEDIUM | `src/ui/components.tsx` | Compact buttons could be 40 high; focus/hover were not explicit | Minimum 44; visible keyboard outline, hover cue and 0.96 press scale | Touch and keyboard interactions have visible, usable states. |
| LOW | `src/ui/artwork.tsx`, Today hero | Generic fallback on Phoenix; inset artwork tile competed with the hero circle | Correct item-ID asset mapping and transparent art treatment in the existing circle | The leading recommendation has recognizable, uncluttered context. |
| MEDIUM | iOS layout and Android provider | Fixed row spacing/counts risked clipping smaller widgets | Compact SwiftUI spacing; Android chooses row count by height and refreshes after resizing | Source layout fits smaller footprints; final native rendering is recorded separately. |
| MEDIUM | `src/ui/dialogs.tsx` import review | Review was appended below the full paste form, requiring several phone scrolls | Replace the entry form with a compact review and an Edit JSON action; valid handoff links open directly at review | Saving a reviewed snapshot stays reachable on a phone. |
| MEDIUM | `App.tsx` compact village switcher | Long imported tags/names could push Preferences past the phone edge | Constrained, single-line name with a shrinking switcher | Account controls stay within the phone viewport. |

## Considered but rejected

| Location | Candidate | Rejected because |
| --- | --- | --- |
| Today/cards | Make every panel dark with heavier shadows | The dark next-action card already establishes hierarchy; repeated dark surfaces compete with it. |
| Navigation/timer lists | Stagger content on every tab selection or timer update | These are frequent actions; repeated entrance motion adds attention cost without explaining a change. |
| Game art | Add another image border around transparent character cutouts | Transparent cutouts already sit inside a structured tile/circle; a rectangular image outline would expose their bounding box. |

## Verification and verdict

`npm run check` passes. Seven Playwright browser flows pass, covering queue/explanation, persisted equipment, account/history isolation, accepted/rejected import, all five phone screens, corrupted-storage recovery and explicit backup replacement. Desktop and phone screenshots are inspected and saved under `docs/screenshots/`. Empty and error states are exercised through those flows; native system share-sheet delivery is not established by browser checks.

The standalone Android app, compact import review, long account name truncation and native three-row widget are also inspected on the API 34 emulator; see [VALIDATION.md](VALIDATION.md) for the exact interactions and screenshots.

**Approve for the browser preview and inspected Android paths.** No actionable interface findings remain in the inspected scope. **Not verified:** iOS rendering, physical-device larger text/VoiceOver/TalkBack, native modal playback at 10% speed, OS widget profiling and alternate Android launchers. These remain explicit native/release goals, not implied approvals.
