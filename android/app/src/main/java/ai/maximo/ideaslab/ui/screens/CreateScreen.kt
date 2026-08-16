package ai.maximo.ideaslab.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.ui.components.FilBanner
import ai.maximo.ideaslab.ui.components.FilBannerTone
import ai.maximo.ideaslab.ui.components.FilScreenHeader
import ai.maximo.ideaslab.ui.components.SectionHeader
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilShape
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun CreateScreen(api: ApiClient) {
    val p = FilTheme.palette
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var slug by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    fun doReload() {
        scope.launch {
            refreshing = true
            delay(300)
            slug = slug.trim()
            refreshing = false
            Toast.makeText(ctx, "Reloaded", Toast.LENGTH_SHORT).show()
        }
    }
    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })

    fun scaffold() {
        if (busy) return
        if (slug.isBlank()) { error = "Slug required"; return }
        busy = true; error = null; result = null
        scope.launch {
            val res = api.scaffold(slug.trim())
            busy = false
            if (res.ok) {
                result = res.message
                Toast.makeText(ctx, "Scaffolded: $slug", Toast.LENGTH_LONG).show()
            } else error = res.error
        }
    }

    Box(Modifier.fillMaxSize().statusBarsPadding().pullRefresh(pullState)) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(FilDimens.screen).padding(bottom = 88.dp + 16.dp)) {
            FilScreenHeader(
                title = "Create / Scaffold",
                subtitle = "POST fleet-ideas-lab.vercel.app/api/fleet/scaffold · pull to reload",
                actions = {
                    FilledTonalButton(
                        onClick = { doReload() },
                        enabled = !refreshing,
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    ) { Text(if (refreshing) "↻ …" else "↻ Reload", style = FilType.chip) }
                },
            )
            SectionHeader("New dashboard slug")
            Spacer(Modifier.height(4.dp))
            OutlinedTextField(
                value = slug,
                onValueChange = { slug = it.lowercase().replace(Regex("[^a-z0-9-]"), "-"); if (error != null) error = null },
                label = { Text("slug (e.g. my-new-dash)") },
                placeholder = { Text("my-new-dashboard", color = p.muted2) },
                singleLine = true,
                isError = error != null && slug.isBlank(),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { scaffold() }),
                textStyle = FilType.data,
                shape = FilShape.card,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = p.accent,
                    unfocusedBorderColor = p.line,
                    cursorColor = p.accent,
                    focusedTextColor = p.text,
                    unfocusedTextColor = p.text,
                    focusedContainerColor = p.panel,
                    unfocusedContainerColor = p.panel,
                ),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            Text("Slug is normalized to lowercase kebab-case. Scaffold creates fleet entry + repo stub.", style = FilType.bodySmall, color = p.muted)
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { scaffold() },
                modifier = Modifier.fillMaxWidth().height(FilDimens.touch),
                enabled = !busy && slug.isNotBlank(),
                shape = FilShape.card,
                colors = ButtonDefaults.buttonColors(containerColor = p.accentDeep, contentColor = p.onAccent, disabledContainerColor = p.panel3, disabledContentColor = p.muted),
            ) { Text(if (busy) "Scaffolding…" else "Scaffold", style = FilType.chip) }

            if (error != null) {
                Spacer(Modifier.height(12.dp))
                FilBanner(text = error!!, tone = FilBannerTone.BAD)
            }
            if (result != null) {
                Spacer(Modifier.height(12.dp))
                FilBanner(text = result!!, tone = FilBannerTone.INFO)
            }
            Spacer(Modifier.height(12.dp))
            Text("Requires login — dl_session cookie sent automatically. Ask admin if 401.", style = FilType.label, color = p.muted2)
        }
        PullRefreshIndicator(refreshing = refreshing, state = pullState, modifier = Modifier.align(Alignment.TopCenter), backgroundColor = p.panel, contentColor = p.accent)
    }
}
