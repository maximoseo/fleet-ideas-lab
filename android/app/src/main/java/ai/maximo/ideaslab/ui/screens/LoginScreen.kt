package ai.maximo.ideaslab.ui.screens

import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.LoginResult
import ai.maximo.ideaslab.data.SessionStore
import ai.maximo.ideaslab.ui.components.FilBanner
import ai.maximo.ideaslab.ui.components.FilBannerTone
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilShape
import ai.maximo.ideaslab.R
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType
import kotlinx.coroutines.launch
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions

@Composable
fun LoginScreen(api: ApiClient, sessionStore: SessionStore, onSuccess: () -> Unit) {
    val p = FilTheme.palette
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var turnstileToken by remember { mutableStateOf("") }
    var biometricAvailable by remember { mutableStateOf(false) }
    var biometricEnabledStored by remember { mutableStateOf(false) }
    var showBiometricPrompt by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        val mgr = BiometricManager.from(ctx)
        biometricAvailable = mgr.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS
        biometricEnabledStored = try { sessionStore.isBiometricEnabled() } catch(_: Exception) { false }
        // Prefill the saved username — nobody should retype their email.
        try { sessionStore.getSavedUsername()?.let { if (it.isNotBlank()) username = it } } catch(_: Exception) {}
        // Auto-prompt if session exists and biometric was enabled by user
        val hasSession = try { sessionStore.getSession()?.isNotEmpty() == true } catch(_: Exception){ false }
        if (biometricAvailable && biometricEnabledStored && hasSession) {
            // small delay to let UI settle, then prompt
            kotlinx.coroutines.delay(700)
            showBiometricPrompt = true
        }
    }

    // Effect to actually show prompt when flag set
    LaunchedEffect(showBiometricPrompt) {
        if (!showBiometricPrompt) return@LaunchedEffect
        showBiometricPrompt = false
        val activity = ctx as? FragmentActivity ?: return@LaunchedEffect
        val executor = ContextCompat.getMainExecutor(ctx)
        val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                scope.launch {
                    val has = try { api.me() } catch (_: Exception) { false }
                    if (has) { onSuccess(); return@launch }
                    // Session expired — silent re-login with the encrypted saved
                    // credentials (that's the whole point of fingerprint unlock).
                    val savedUser = try { sessionStore.getSavedUsername() } catch(_: Exception) { null }
                    val savedPass = try { sessionStore.getSavedPassword() } catch(_: Exception) { null }
                    if (!savedUser.isNullOrBlank() && !savedPass.isNullOrBlank()) {
                        val res = try { api.login(savedUser, savedPass, "") } catch(_: Exception) { LoginResult(false, "network") }
                        if (res.ok) { onSuccess(); return@launch }
                    }
                    error = "Session expired — please sign in again"
                }
            }
            override fun onAuthenticationError(code: Int, msg: CharSequence) {
                if (code != BiometricPrompt.ERROR_USER_CANCELED && code != BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                    error = msg.toString()
                }
            }
        })
        prompt.authenticate(BiometricPrompt.PromptInfo.Builder().setTitle("Ideas Lab").setSubtitle("Sign in with fingerprint").setNegativeButtonText("Cancel").build())
    }

    fun doBiometric() { showBiometricPrompt = true }

    fun signIn() {
        if (busy) return
        if (username.isBlank() || password.isBlank()) { error = ctx.getString(R.string.login_required); return }
        focusManager.clearFocus()
        busy = true; error = null
        scope.launch {
            val res = api.login(username.trim(), password, turnstileToken)
            busy = false
            if (res.ok) {
                // Persist credentials (encrypted) ONLY when biometric unlock is
                // in play — that is the single feature that needs them. Storing
                // a password for a device with no biometrics keeps a credential
                // the user never asked us to keep, and buys nothing.
                if (biometricAvailable) {
                    try { sessionStore.saveCredentials(username.trim(), password) } catch(_: Exception){}
                    if (!biometricEnabledStored) {
                        try { sessionStore.setBiometric(true) } catch(_: Exception){}
                    }
                } else {
                    try { sessionStore.clearSavedCredentials() } catch(_: Exception){}
                }
                onSuccess()
            } else error = res.error ?: ctx.getString(R.string.login_failed)
        }
    }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = p.accent,
        unfocusedBorderColor = p.line,
        errorBorderColor = p.bad,
        focusedLabelColor = p.accent,
        unfocusedLabelColor = p.muted,
        cursorColor = p.accent,
        focusedTextColor = p.text,
        unfocusedTextColor = p.text,
        focusedContainerColor = p.panel,
        unfocusedContainerColor = p.panel,
    )

    Column(
        Modifier.fillMaxSize().background(p.bg).verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp).padding(top = 48.dp, bottom = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(24.dp))
        Box(
            Modifier.size(72.dp).clip(CircleShape).background(p.accentDeep).border(1.dp, p.accent.copy(alpha = 0.5f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Canvas(Modifier.size(40.dp)) {
                val s = size.minDimension
                val stroke = s * 0.07f
                drawCircle(color = Color.White, style = Stroke(width = stroke))
                val path = Path().apply {
                    moveTo(s*0.5f, s*0.28f); lineTo(s*0.5f, s*0.62f)
                    moveTo(s*0.38f, s*0.42f); lineTo(s*0.62f, s*0.42f)
                    moveTo(s*0.38f, s*0.54f); lineTo(s*0.62f, s*0.54f)
                }
                drawPath(path, color = Color.White, style = Stroke(width = stroke*0.9f))
                drawRect(color = Color.White, topLeft = androidx.compose.ui.geometry.Offset(s*0.38f, s*0.62f), size = androidx.compose.ui.geometry.Size(s*0.24f, s*0.10f))
            }
        }
        Spacer(Modifier.height(16.dp))
        Text("Fleet Ideas Lab", style = FilType.screenTitle.copy(fontSize = 26.sp), color = p.text, textAlign = TextAlign.Center)
        Spacer(Modifier.height(4.dp))
        Text("DISCOVER · IMPROVE · CREATE", style = FilType.sectionLabel, color = p.muted2)
        Spacer(Modifier.height(32.dp))

        OutlinedTextField(
            value = username, onValueChange = { username = it; if (error != null) error = null },
            label = { Text("Email") }, placeholder = { Text("service@maximo-seo.com", color = p.muted2) },
            singleLine = true,
            isError = error != null && username.isBlank(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            colors = fieldColors,
            shape = FilShape.card,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password, onValueChange = { password = it; if (error != null) error = null },
            label = { Text("Password") }, singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            isError = error != null && password.isBlank(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { signIn() }),
            colors = fieldColors,
            shape = FilShape.card,
            modifier = Modifier.fillMaxWidth(),
        )

        if (error != null) {
            Spacer(Modifier.height(12.dp))
            FilBanner(text = error!!, tone = FilBannerTone.BAD)
        }

        Spacer(Modifier.height(16.dp))
        TurnstileWebView(onToken = { turnstileToken = it })

        Spacer(Modifier.height(16.dp))
        Button(
            onClick = { signIn() },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            enabled = !busy,
            shape = FilShape.card,
            colors = ButtonDefaults.buttonColors(
                containerColor = p.accentDeep,
                contentColor = p.onAccent,
                disabledContainerColor = p.panel3,
                disabledContentColor = p.muted,
            ),
        ) {
            Text(if (busy) "Signing in…" else "Sign in", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }

        if (biometricAvailable) {
            Spacer(Modifier.height(10.dp))
            OutlinedButton(
                onClick = { doBiometric() },
                modifier = Modifier.fillMaxWidth().height(FilDimens.touch),
                shape = FilShape.card,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = p.accent),
            ) {
                Text("🔒  Sign in with fingerprint", fontWeight = FontWeight.Medium)
            }
            if (!biometricEnabledStored) {
                Text(
                    "Fingerprint will be enabled after first sign-in",
                    style = FilType.label,
                    color = p.muted2,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }

        Spacer(Modifier.height(32.dp))
        Text(
            "Protected by Cloudflare Turnstile · Encrypted dl_session",
            style = FilType.label,
            color = p.muted2,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(4.dp))
        Text("MaximoSEO · Ideas Lab", style = FilType.label, color = p.muted2)
    }
}

@Composable
private fun TurnstileWebView(onToken: (String) -> Unit) {
    var ready by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    AndroidView(factory = { ctx ->
        WebView(ctx).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            addJavascriptInterface(object {
                @JavascriptInterface fun onToken(token: String) { post { onToken(token); ready = token.isNotEmpty() } }
            }, "AndroidTurnstile")
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) { super.onPageFinished(view, url) }
            }
            // Real Cloudflare Turnstile managed widget
            val sitekey = "0x4AAAAAAEQyCmGw2i6fiaAq"
            val html = """
                <html><head><meta name="viewport" content="width=device-width, initial-scale=1"/>
                <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
                </head><body style="margin:0;background:transparent;display:flex;justify-content:center;align-items:center;min-height:72px">
                  <div class="cf-turnstile" data-sitekey="$sitekey" data-callback="onTurnstile" data-theme="dark" data-size="normal"></div>
                  <script>
                    function onTurnstile(token) { try { AndroidTurnstile.onToken(token); } catch(e){} }
                    // Fallback: if widget not rendered in 8s, signal empty so user can still try (server will reject if secret is set)
                    setTimeout(function(){ try{ if(!document.querySelector('iframe')) AndroidTurnstile.onToken(""); }catch(e){} }, 8000);
                  </script>
                </body></html>
            """.trimIndent()
            loadDataWithBaseURL("https://fleet-ideas-lab.vercel.app", html, "text/html", "utf-8", null)
        }
    }, modifier = Modifier.fillMaxWidth().height(72.dp))
}
