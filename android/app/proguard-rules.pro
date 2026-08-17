# R8 rules for the release build.
#
# Most of what this app depends on ships its own consumer rules (Compose,
# OkHttp, Room, DataStore, Navigation), so this file only covers what R8 cannot
# see: reflection, and the classes named from outside Kotlin code.
#
# The honest caveat, written here because it matters: R8 breakage shows up at
# RUNTIME, not at build time. This configuration was reviewed and the APK was
# built and inspected, but it has not been executed on a device by the build
# machine — there is no emulator and no /dev/kvm here. Treat the first install
# of a newly minified build as the test.

# --- Tink / androidx.security-crypto -----------------------------------------
# EncryptedSharedPreferences stores the session token. Tink resolves key
# managers and protobuf classes reflectively; stripping them makes the app
# throw on first read of the session and look like a broken login.
-keep class com.google.crypto.tink.** { *; }
-keep class com.google.protobuf.** { *; }
-dontwarn com.google.crypto.tink.**
-dontwarn com.google.protobuf.**
-keep class androidx.security.crypto.** { *; }

# --- OkHttp ------------------------------------------------------------------
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# --- Room --------------------------------------------------------------------
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-dontwarn androidx.room.paging.**

# --- WorkManager -------------------------------------------------------------
# Workers are instantiated by name from the framework.
-keep class * extends androidx.work.ListenableWorker { public <init>(...); }
-keep class ai.maximo.ideaslab.data.UpdateCheckWorker { *; }

# --- App model classes -------------------------------------------------------
# Data classes crossing the JSON boundary. org.json does not reflect, but these
# are cheap to keep and expensive to debug when a field silently disappears.
-keep class ai.maximo.ideaslab.data.** { *; }

# --- Entry points named from the manifest ------------------------------------
-keep class ai.maximo.ideaslab.MainActivity { *; }

# --- Compose -----------------------------------------------------------------
-dontwarn androidx.compose.**

# Keep source line numbers so a crash report is readable, but hide the original
# file name.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
