# Validation record — widget/automation scope

Current work removes the website and prioritizes Android. Historical browser checks do not apply to the deleted dashboard. Keep native compilation, JavaScript exports, synthetic source automation and live Clash export separate.

## Current checks

| Check | Outcome |
| --- | --- |
| TypeScript | Pass. |
| Domain/automation tests | 24 pass, including serialized save/publish/ack, idempotence, failed publication retry, fresh/wrong-village guards, atomic-file watch and profile validation. |
| Native JavaScript exports | Android and iOS exports pass after the website removal. |
| Updated Android native compilation | In progress. |
| Updated automatic file/clipboard receiver on emulator | In progress. |
| Export-menu runner using synthetic development source | In progress. |
| Export-menu calibration against real Clash client | Not verified; no live client/device profile has been established here. |
| Full iOS compilation/device testing | Not verified; deferred to the iOS phase. |

## Prior native widget observations

The earlier standalone APK was tested on Pixel 3a ARM64 / Android API 34 / Pixel launcher. It rendered native countdowns, absolute completion dates, export freshness and next action. An accepted synthetic import updated an installed widget. App account changes did not alter its configured village. At a synthetic completion boundary the timer row disappeared and expected-free builders increased.

Those checks establish the existing widget behavior. They are not a claim that the newly added automatic receiver/runner has passed its current device checks. Update the table and observations after those tests.

## Reproduce

```sh
npm run check
npx expo prebuild --platform android --no-install
cd android
./gradlew :app:assembleDebug --no-daemon --console=plain
```

The manual Native compilation CI workflow can also build Android and an unsigned iOS simulator target. Its hosted execution is not implied by local checks.
