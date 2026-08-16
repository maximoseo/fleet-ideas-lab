package ai.maximo.ideaslab.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "fleetideaslab_prefs")

class SessionStore(private val context: Context) {
    private val masterKey = MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
    private val encPrefs by lazy {
        EncryptedSharedPreferences.create(context, "fleetideaslab_secure", masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM)
    }

    companion object {
        val KEY_SESSION = stringPreferencesKey("dl_session")
        val KEY_USERNAME = stringPreferencesKey("username")
        val KEY_BIOMETRIC = stringPreferencesKey("biometric_enabled")
    }

    suspend fun saveSession(token: String, username: String) {
        context.dataStore.edit { it[KEY_SESSION] = token; it[KEY_USERNAME] = username }
        encPrefs.edit().putString("dl_session", token).apply()
    }

    /** Credentials for biometric re-login — encrypted at rest (AES256-GCM, Keystore-backed). */
    suspend fun saveCredentials(username: String, password: String) {
        encPrefs.edit().putString("saved_username", username).putString("saved_password", password).apply()
    }
    fun getSavedUsername(): String? = encPrefs.getString("saved_username", null)
    fun getSavedPassword(): String? = encPrefs.getString("saved_password", null)

    suspend fun clear() {
        context.dataStore.edit { it.remove(KEY_SESSION); it.remove(KEY_USERNAME) }
        encPrefs.edit().remove("dl_session").remove("saved_password").apply()
    }
    suspend fun getSession(): String? {
        val ds = context.dataStore.data.map { it[KEY_SESSION] }.first()
        if (!ds.isNullOrEmpty()) return ds
        return encPrefs.getString("dl_session", null)
    }
    suspend fun getUsername(): String? = context.dataStore.data.map { it[KEY_USERNAME] }.first()
    suspend fun isBiometricEnabled(): Boolean = context.dataStore.data.map { it[KEY_BIOMETRIC] == "1" }.first()
    suspend fun setBiometric(v: Boolean) { context.dataStore.edit { it[KEY_BIOMETRIC] = if(v) "1" else "0" } }
}
