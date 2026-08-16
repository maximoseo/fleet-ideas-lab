import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

// Secrets/signing live in android/local.properties (gitignored) — never in git.
// Required keys: APP_TOKEN, KEYSTORE_PATH, KEYSTORE_PASS, KEY_ALIAS, KEY_PASS
// (each falls back to the same-named environment variable for CI).
val localProps = Properties()
val localPropsFile = rootProject.file("local.properties")
if (localPropsFile.exists()) localPropsFile.inputStream().use { localProps.load(it) }

fun localProp(key: String): String =
    (localProps.getProperty(key) ?: System.getenv(key) ?: "").trim()
fun String.gradleEscaped(): String = replace("\\", "\\\\").replace("\"", "\\\"")

val hasReleaseKeystore = localProp("KEYSTORE_PATH").isNotEmpty()

android {
    namespace = "ai.maximo.ideaslab"
    compileSdk = 36

    defaultConfig {
        applicationId = "ai.maximo.ideaslab"
        minSdk = 24
        targetSdk = 36
        versionCode = 21
        versionName = "1.2.5"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }
        buildConfigField("String", "BASE_URL", "\"https://fleet-ideas-lab.maximo-seo.ai\"")
        // Bearer token for GET /api/app/fleet — injected at build time, never committed.
        buildConfigField("String", "APP_TOKEN", "\"${localProp("APP_TOKEN").gradleEscaped()}\"")
    }

    signingConfigs {
        create("release") {
            if (hasReleaseKeystore) {
                storeFile = file(localProp("KEYSTORE_PATH"))
                storePassword = localProp("KEYSTORE_PASS")
                keyAlias = localProp("KEY_ALIAS")
                keyPassword = localProp("KEY_PASS")
            }
        }
    }
    buildTypes {
        release {
            if (hasReleaseKeystore) signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
        debug {
            isDebuggable = true
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.14" }

    packaging { resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" } }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3:1.3.1")
    implementation("androidx.compose.material:material:1.7.3")
    implementation("androidx.compose.material:material-icons-extended:1.7.3")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("androidx.security:security-crypto:1.1.0")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.fragment:fragment-ktx:1.8.5")

    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("io.coil-kt:coil-compose:2.7.0")
    implementation("io.coil-kt:coil:2.7.0")
// In-app update + notifications
implementation("androidx.work:work-runtime-ktx:2.9.1")
implementation("androidx.core:core-ktx:1.12.0")

    // Room
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

ksp { arg("room.schemaLocation", "$projectDir/schemas") }
