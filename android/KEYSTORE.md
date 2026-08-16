# Release signing — Fleet Ideas Lab Android

## ⚠️ v1.2.0 signature change (breaking for installed v1.1.4 users)

The v1.1.4 release keystore was **lost** (never preserved). A **new** release key was
generated on 2026-08-16 for v1.2.0, so **v1.2.0 signatures DIFFER from v1.1.4**.

**Users with v1.1.4 installed must uninstall the old app first** — Android refuses to
install an update signed with a different certificate (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`).
App data (session, favorites) is wiped by the uninstall; this is unavoidable.

## Keystore locations (never in git)

| Purpose | Path |
|---|---|
| Active signing keystore | `/root/android-keys/fleet-ideas-lab.jks` (chmod 600) |
| Backup copy | `/root/.hermes/secure/keystores/fleet-ideas-lab.jks` (chmod 600) |
| Passwords / alias | `/root/.hermes/secure/credentials/fleet-ideas-lab-keystore.env` (chmod 600) |

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

v1.2.0 cert SHA-256: `4C:4F:8C:4A:23:42:F9:72:E2:CF:58:50:F4:55:22:51:9C:95:FC:FA:4A:1D:41:E3:CE:0A:CB:B2:62:0E:41:3F`
