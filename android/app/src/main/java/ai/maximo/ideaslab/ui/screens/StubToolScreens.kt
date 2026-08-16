package ai.maximo.ideaslab.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import ai.maximo.ideaslab.data.ApiClient
import ai.maximo.ideaslab.ui.components.EmptyState
import ai.maximo.ideaslab.ui.components.FilCard
import ai.maximo.ideaslab.ui.components.FilScreenHeader
import ai.maximo.ideaslab.ui.theme.FilDimens
import ai.maximo.ideaslab.ui.theme.FilShape
import ai.maximo.ideaslab.ui.theme.FilTheme
import ai.maximo.ideaslab.ui.theme.FilType

/**
 * Shared honest stub for the not-yet-built tool screens. These are not wired
 * into navigation; when they are, each gets its own real implementation.
 * Until then they say exactly what they are — no fake results.
 */
@Composable
private fun StubToolScreen(title: String, blurb: String, @Suppress("UNUSED_PARAMETER") api: ApiClient) {
    val p = FilTheme.palette
    var url by remember { mutableStateOf("") }
    Column(
        Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState())
            .padding(FilDimens.screen).padding(bottom = 88.dp + 16.dp),
    ) {
        FilScreenHeader(title = title, subtitle = blurb)
        OutlinedTextField(
            value = url,
            onValueChange = { url = it },
            label = { Text("https://example.com") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Done),
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
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = { /* intentionally inert — see note below */ },
            enabled = false,
            modifier = Modifier.fillMaxWidth().height(FilDimens.touch),
            shape = FilShape.card,
        ) { Text("Analyze", style = FilType.chip) }
        Spacer(Modifier.height(16.dp))
        EmptyState(
            title = "Not built yet",
            body = "This screen is a placeholder — the full flow lives in the web app for now. Nothing here sends or invents data.",
            glyph = "◇",
        )
        Spacer(Modifier.height(16.dp))
        FilCard {
            Text("Native Compose — will call /api/* with dl_session when implemented.", style = FilType.label, color = p.muted2)
        }
    }
}

@Composable fun MockupScreen(api: ApiClient) = StubToolScreen("Mockup", "Generate a mockup from a URL.", api)
@Composable fun InspirationScreen(api: ApiClient) = StubToolScreen("Inspiration", "Pull design inspiration from a URL.", api)
@Composable fun SuggestionsScreen(api: ApiClient) = StubToolScreen("Suggestions", "Improvement suggestions for a URL.", api)
@Composable fun AuditScreen(api: ApiClient) = StubToolScreen("Audit", "Run an audit against a URL.", api)
@Composable fun GenerateScreen(api: ApiClient) = StubToolScreen("Generate", "Generate an artifact from a URL.", api)
@Composable fun HistoryScreen(api: ApiClient) = StubToolScreen("History", "Past runs for this tool.", api)
@Composable fun RedesignScreen(api: ApiClient) = StubToolScreen("Redesign", "Redesign a URL against the design system.", api)
