# Release signing — Fleet Ideas Lab Android

## ⚠️ v1.2.0 signature change (breaking for installed v1.1.4 users)

The v1.1.4 release keystore was **lost** (never preserved). A **new** release key was
generated on 2026-08-16 for v1.2.0, so **v1.2.0 signatures DIFFER from v1.1.4**.

**Users with v1.1.4 installed must uninstall the old app first** — Android refuses to
install an update signed with a different certificate (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`).
App data (session, favorites) is wiped by the uninstall; this is unavoidable.

## Keystore locations (never in git)

**Which server:** the key was generated on **`vilnius`** (`srv1631970`). It was copied to
**`srv1809735`** on 2026-08-16. It is NOT on the other eleven fleet servers — finding it
took a fleet-wide search, so record any further copy here.

| Purpose | Path |
|---|---|
| Active signing keystore | `/root/android-keys/fleet-ideas-lab.jks` (chmod 600) |
| Backup copy | `/root/.hermes/secure/keystores/fleet-ideas-lab.jks` (chmod 600) |
| Passwords / alias | `/root/.hermes/secure/keystores/fleet-ideas-lab.keystore.env` (chmod 600) |

⚠️ `/root/.hermes/secure/credentials/fleet-ideas-lab-keystore.env` also exists on
`vilnius` and looks like the right file, but its `KEYSTORE_PASS` **does not open the
keystore** — `keytool` fails with "keystore password was incorrect". Use the
`keystores/` one above. (Corrected 2026-08-16; this doc pointed at the wrong file.)

Key properties: RSA 4096, alias `fleetideaslab`, validity 10000 days, SHA384withRSA.

## How the build reads secrets (no secrets in git)

`app/build.gradle.kts` reads `android/local.properties` at configuration time
(already gitignored via `.gitignore` → `android/local.properties`) and falls back to
same-named environment variables:

```
sdk.dir=/root/android-sdk
APP_TOKEN=...            # bearer for GET /api/app/fleet → BuildConfig.APP_TOKEN
KEYSTORE_PATH=/root/android-keys/fleet-ideas-lab.jks
KEYSTORE_PASS=...
KEY_ALIAS=fleetideaslab
KEY_PASS=...
```

If `KEYSTORE_PATH` is absent the release build still compiles but is left **unsigned**
(CI-friendly). To rebuild local.properties from the vault:

```sh
source /root/.hermes/secure/credentials/fleet-ideas-lab-keystore.env
TOKEN=$(cut -d= -f2- /root/.hermes/secure/credentials/fleet-ideas-lab-app.env)
```

## Build & verify

```sh
cd android
./gradlew clean assembleRelease
apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk
```

v1.2.0 cert SHA-256:
`EE:E3:18:4E:93:C0:D8:FA:19:11:70:9E:C6:FA:AF:28:90:D0:B7:83:59:F2:C5:F8:E3:54:AB:04:9C:38:BB:F8`

Taken from the keystore itself AND from the published
`v1.2.0/fleet-ideas-lab-v1.2.0.apk`, which agree. A previous value in this file
(`4C:4F:8C:4A:…`) matched neither and was wrong; corrected 2026-08-16.

Reproduced on 2026-08-16 from commit `f8eedde` on `srv1809735`: `assembleRelease`
produced an APK whose 508 zip entries are byte-identical to the published release, with
the same signer certificate. The outer file hash differs (zip ordering and timestamps
are not reproducible), so compare entries, not `sha256sum`.
