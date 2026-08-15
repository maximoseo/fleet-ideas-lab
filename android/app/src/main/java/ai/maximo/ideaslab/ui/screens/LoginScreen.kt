package ai.maximo.ideaslab.ui.screens

import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.data.SessionStore
import kotlinx.coroutines.launch
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType

@Composable
fun LoginScreen(api: ApiClient, sessionStore: SessionStore, onSuccess: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
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
                    if (has) onSuccess() else error = "Session expired \u2014 please sign in again"
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

    Column(
        Modifier.fillMaxSize().background(Color(0xFF0C0A14)).padding(horizontal = 24.dp).padding(top = 48.dp, bottom = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(24.dp))
        Box(Modifier.size(72.dp).clip(CircleShape).background(Color(0xFF7C3AED)), contentAlignment = Alignment.Center) {
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
        Text("Fleet Ideas Lab", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = (-0.5).sp, fontSize = 26.sp), color = Color.White, textAlign = TextAlign.Center)
        Text("Discover \u00b7 Improve \u00b7 Create", style = MaterialTheme.typography.labelMedium.copy(letterSpacing = 1.2.sp), color = Color(0xFF9CA3AF))
        Spacer(Modifier.height(32.dp))

        OutlinedTextField(
            value = username, onValueChange = { username = it; if (error != null) error = null },
            label = { Text("Email") }, placeholder = { Text("service@maximo-seo.com", color = Color(0xFF6B7280)) },
            singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF7C3AED), unfocusedBorderColor = Color(0xFF2A2438), focusedLabelColor = Color(0xFF7C3AED), cursorColor = Color(0xFF7C3AED), focusedTextColor = Color.White, unfocusedTextColor = Color.White),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password, onValueChange = { password = it; if (error != null) error = null },
            label = { Text("Password") }, singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF7C3AED), unfocusedBorderColor = Color(0xFF2A2438), focusedLabelColor = Color(0xFF7C3AED), cursorColor = Color(0xFF7C3AED), focusedTextColor = Color.White, unfocusedTextColor = Color.White),
            modifier = Modifier.fillMaxWidth()
        )

        if (error != null) {
            Spacer(Modifier.height(10.dp))
            Text(error!!, color = Color(0xFFF87171), style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        }

        Spacer(Modifier.height(16.dp))
        TurnstileWebView(onToken = { turnstileToken = it })

        Button(
            onClick = {
                if (busy) return@Button
                if (username.isBlank() || password.isBlank()) { error = "Email and password are required"; return@Button }
                busy = true; error = null
                scope.launch {
                    val res = api.login(username.trim(), password, turnstileToken)
                    busy = false
                    if (res.ok) {
                        // Offer to enable biometric for next time if available and not yet enabled
                        if (biometricAvailable && !biometricEnabledStored) {
                            try { sessionStore.setBiometric(true) } catch(_: Exception){}
                        }
                        onSuccess()
                    } else error = res.error ?: "Sign in failed"
                }
            },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            enabled = !busy,
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED), contentColor = Color.White, disabledContainerColor = Color(0xFF3A2E5A))
        ) {
            Text(if (busy) "Signing in\u2026" else "Sign in", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }

        if (biometricAvailable) {
            Spacer(Modifier.height(10.dp))
            OutlinedButton(
                onClick = { doBiometric() },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFA78BFA))
            ) {
                Text("\uD83D\uDD12  Sign in with fingerprint", fontWeight = FontWeight.Medium)
            }
            if (!biometricEnabledStored) {
                Text("Fingerprint will be enabled after first sign-in", style = MaterialTheme.typography.labelSmall, color = Color(0xFF6B7280), modifier = Modifier.padding(top = 6.dp))
            }
        }

        Spacer(Modifier.weight(1f))
        Text("Protected by Cloudflare Turnstile \u00b7 Encrypted dl_session", style = MaterialTheme.typography.labelSmall, color = Color(0xFF4B5563), textAlign = TextAlign.Center)
        Spacer(Modifier.height(4.dp))
        Text("MaximoSEO \u00b7 Ideas Lab", style = MaterialTheme.typography.labelSmall, color = Color(0xFF4B5563))
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
    }, modifier = Modifier.fillMaxWidth().height(if (ready) 72.dp else 72.dp))
}
