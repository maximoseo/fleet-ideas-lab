package ai.maximo.ideaslab.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.maximo.ideaslab.data.SchemaRules
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val WEB_URL = "https://schema-studio.maximo-seo.ai"

/** Operator Console rule: cool = fine, warm = a problem. Violet is the healthy hue, never green. */
private val Violet = Color(0xFF7C3AED)
private val VioletSoft = Color(0xFFA78BFA)
private val Warm = Color(0xFFFBBF24)
private val Bad = Color(0xFFF87171)

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun SchemaStudioScreen(onNotifications: (() -> Unit)? = null) {
    val ctx = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()

    var source by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<SchemaRules.Result?>(null) }
    var refreshing by remember { mutableStateOf(false) }

    fun runValidation() {
        result = SchemaRules.validate(source)
    }

    fun doReload() {
        scope.launch {
            refreshing = true
            delay(350)
            runValidation()
            refreshing = false
            Toast.makeText(ctx, "Re-checked on this device — nothing was fetched", Toast.LENGTH_SHORT).show()
        }
    }

    val pullState = rememberPullRefreshState(refreshing = refreshing, onRefresh = { doReload() })

    Box(Modifier.fillMaxSize().statusBarsPadding().pullRefresh(pullState)) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 88.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            "Schema Studio",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                        )
                        Text(
                            "Paste JSON-LD and check it against the properties Google documents as required and recommended. Nothing is invented — a property you did not supply is reported as absent.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        )
                    }
                    if (onNotifications != null) {
                        TextButton(onClick = onNotifications) { Text("⚙") }
                    }
                }
            }

            item {
                OutlinedTextField(
                    value = source,
                    onValueChange = { source = it; result = null },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 180.dp),
                    label = { Text("JSON-LD") },
                    placeholder = { Text("{ \"@context\": \"https://schema.org\", \"@type\": \"FAQPage\", … }") },
                    textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace, fontSize = 12.sp),
                    singleLine = false,
                )
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                    Button(
                        onClick = { runValidation() },
                        enabled = source.isNotBlank(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    ) { Text("Validate") }

                    OutlinedButton(
                        onClick = {
                            clipboard.getText()?.text?.let { source = it; result = null }
                                ?: Toast.makeText(ctx, "Clipboard is empty", Toast.LENGTH_SHORT).show()
                        },
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    ) { Text("Paste") }

                    OutlinedButton(
                        onClick = { source = ""; result = null },
                        enabled = source.isNotBlank(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    ) { Text("Clear") }

                    FilledTonalButton(
                        onClick = {
                            runCatching { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(WEB_URL))) }
                                .onFailure { Toast.makeText(ctx, "No browser available", Toast.LENGTH_SHORT).show() }
                        },
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    ) { Text("Open on web ↗") }
                }
            }

            val current = result
            if (current == null) {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Text("Nothing checked yet", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "Paste markup and tap Validate. The rich-result preview and the URL importer live in the web app — tap “Open on web”.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            )
                        }
                    }
                }
            } else if (!current.syntaxOk) {
                item { StatusCard(title = "JSON does not parse", body = current.syntaxMessage, tone = Bad) }
            } else {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        CountTile("Required missing", current.errorCount, Bad, Modifier.weight(1f))
                        CountTile("Recommended", current.warningCount, Warm, Modifier.weight(1f))
                        CountTile("Nodes passing", current.nodes.size - current.uncheckedCount, VioletSoft, Modifier.weight(1f))
                    }
                }
                item {
                    // Three states, not two. "Not checked" is its own answer and must not
                    // render as "passed".
                    val unchecked = current.uncheckedCount
                    val title: String
                    val body: String
                    val tone: Color
                    when {
                        current.errorCount > 0 -> {
                            tone = Bad
                            title = "${current.errorCount} required " +
                                (if (current.errorCount == 1) "property is" else "properties are") + " missing"
                            body = "Rich results are not awarded while a documented required property is absent."
                        }
                        unchecked > 0 -> {
                            tone = Warm
                            title = "$unchecked " +
                                (if (unchecked == 1) "node uses a type" else "nodes use types") +
                                " this screen does not cover"
                            body = "Nothing required is missing from the types that were checked, but eligibility for the rest is unknown — not confirmed. Open the web app for the full type list."
                        }
                        else -> {
                            tone = Violet
                            title = "No required property is missing"
                            body = "This markup carries everything Google documents as required for the detected types. Eligibility is not a guarantee — Google decides whether to show a rich result."
                        }
                    }
                    StatusCard(title = title, body = body, tone = tone)
                }

                for (node in current.nodes) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                node.type,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodySmall,
                                color = VioletSoft,
                            )
                            node.rule?.let {
                                Text(it.label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f))
                            }
                        }
                    }
                    node.rule?.advisory?.let { advisory ->
                        item { StatusCard(title = "About this rich result", body = advisory, tone = Warm) }
                    }
                    if (node.findings.isEmpty()) {
                        item {
                            StatusCard(
                                title = "Every documented property is present",
                                body = node.rule?.docs ?: "",
                                tone = Violet,
                            )
                        }
                    } else {
                        items(node.findings) { finding -> FindingCard(finding) }
                    }
                }

                item {
                    Text(
                        "Rules come from Google Search Central. This screen checks syntax and property coverage; the rich-result preview is on the web.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    )
                }
            }
        }

        PullRefreshIndicator(refreshing, pullState, Modifier.align(Alignment.TopCenter))
    }
}

@Composable
private fun CountTile(label: String, value: Int, tone: Color, modifier: Modifier = Modifier) {
    // Zero problems is a quiet tile, never a warm one holding a 0.
    val active = value > 0
    val fg = if (active) tone else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
    Column(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (active) tone.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Text("$value", fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge, color = fg)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f), maxLines = 2)
    }
}

@Composable
private fun StatusCard(title: String, body: String, tone: Color) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(tone.copy(alpha = 0.12f))
            .padding(14.dp)
    ) {
        Text(title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium, color = tone)
        if (body.isNotBlank()) {
            Text(
                body,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
        }
    }
}

@Composable
private fun FindingCard(finding: SchemaRules.Finding) {
    val isError = finding.severity == SchemaRules.Severity.ERROR
    val tone = if (isError) Bad else Warm
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(tone.copy(alpha = 0.10f))
            .padding(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                finding.path,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.bodySmall,
                color = tone,
            )
            Text(
                if (isError) "REQUIRED" else "RECOMMENDED",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = tone.copy(alpha = 0.85f),
            )
        }
        Text(finding.message, style = MaterialTheme.typography.bodySmall)
        if (finding.note.isNotBlank()) {
            Text(
                finding.note,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f),
            )
        }
    }
}
