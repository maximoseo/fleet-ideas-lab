package ai.maximo.ideaslab.data

import org.json.JSONArray
import org.json.JSONObject

/**
 * Compact port of the Schema Studio rule table.
 *
 * SOURCE: Google Search Central structured data documentation, the same pages the web
 * app cites. Kept deliberately small — the phone checks syntax and the documented
 * required and recommended properties. The rich-result preview stays on the web at
 * https://schema-studio.maximo-seo.ai, which is what the "Open Schema Studio" button is for.
 *
 * Nothing here invents a value. A property that is absent is reported as absent.
 */
object SchemaRules {

    data class TypeRule(
        val type: String,
        val label: String,
        val docs: String,
        val required: List<Pair<String, String>>,
        val recommended: List<Pair<String, String>>,
        val aliases: List<String> = emptyList(),
    )

    val TYPES: List<TypeRule> = listOf(
        TypeRule(
            "Article", "Article",
            "https://developers.google.com/search/docs/appearance/structured-data/article",
            required = listOf("headline" to "Title of the article."),
            recommended = listOf(
                "image" to "Article image.",
                "datePublished" to "ISO 8601 first-publication date.",
                "dateModified" to "ISO 8601 last-update date.",
                "author.name" to "Author name, as Person or Organization.",
            ),
            aliases = listOf("NewsArticle", "BlogPosting"),
        ),
        TypeRule(
            "BreadcrumbList", "Breadcrumb",
            "https://developers.google.com/search/docs/appearance/structured-data/breadcrumb",
            required = listOf(
                "itemListElement" to "The ordered trail of ListItem entries.",
                "itemListElement[].position" to "1-based position of each crumb.",
                "itemListElement[].name" to "Visible title of each crumb.",
            ),
            recommended = listOf("itemListElement[].item" to "URL of each crumb; the last may omit it."),
        ),
        TypeRule(
            "FAQPage", "FAQ",
            "https://developers.google.com/search/docs/appearance/structured-data/faqpage",
            required = listOf(
                "mainEntity" to "The list of Question entries.",
                "mainEntity[].name" to "The full text of each question.",
                "mainEntity[].acceptedAnswer.text" to "The full answer text.",
            ),
            recommended = emptyList(),
        ),
        TypeRule(
            "Product", "Product",
            "https://developers.google.com/search/docs/appearance/structured-data/product-snippet",
            required = listOf("name" to "Product name."),
            recommended = listOf(
                "image" to "Product image URL.",
                "offers.price" to "Price as a number, no currency symbol.",
                "offers.priceCurrency" to "ISO 4217 code.",
                "offers.availability" to "A schema.org ItemAvailability URL.",
                "brand.name" to "Brand of the product.",
            ),
        ),
        TypeRule(
            "LocalBusiness", "Local Business",
            "https://developers.google.com/search/docs/appearance/structured-data/local-business",
            required = listOf(
                "name" to "Business name as used on the storefront.",
                "address" to "PostalAddress of the physical location.",
            ),
            recommended = listOf(
                "address.streetAddress" to "Street and number.",
                "address.addressLocality" to "City.",
                "telephone" to "Phone in international format.",
                "openingHoursSpecification" to "Opening hours per day.",
                "url" to "Canonical URL of the business page.",
            ),
            aliases = listOf("Restaurant", "Store", "Dentist", "Plumber", "ProfessionalService"),
        ),
        TypeRule(
            "Organization", "Organization",
            "https://developers.google.com/search/docs/appearance/structured-data/organization",
            required = listOf("name" to "Legal or trading name."),
            recommended = listOf(
                "url" to "Canonical homepage URL.",
                "logo" to "Logo image, at least 112x112 px.",
                "sameAs" to "Profile URLs that confirm the entity.",
            ),
        ),
        TypeRule(
            "Event", "Event",
            "https://developers.google.com/search/docs/appearance/structured-data/event",
            required = listOf(
                "name" to "Event title.",
                "startDate" to "ISO 8601 start, with timezone offset.",
                "location" to "Place, or VirtualLocation for online.",
            ),
            recommended = listOf(
                "endDate" to "ISO 8601 end.",
                "image" to "Event image.",
                "offers.url" to "Where to buy tickets.",
            ),
        ),
        TypeRule(
            "VideoObject", "Video",
            "https://developers.google.com/search/docs/appearance/structured-data/video",
            required = listOf(
                "name" to "Video title.",
                "description" to "What the video shows.",
                "thumbnailUrl" to "Thumbnail image URL.",
                "uploadDate" to "ISO 8601 first-publication date.",
            ),
            recommended = listOf(
                "duration" to "ISO 8601 duration, for example PT2M15S.",
                "embedUrl" to "Player URL.",
            ),
        ),
        TypeRule(
            "JobPosting", "Job Posting",
            "https://developers.google.com/search/docs/appearance/structured-data/job-posting",
            required = listOf(
                "title" to "Job title only, without company or location.",
                "description" to "Full description of the role.",
                "datePosted" to "ISO 8601 date the posting went live.",
                "hiringOrganization.name" to "Employer name.",
                "jobLocation.address" to "Where the work happens.",
            ),
            recommended = listOf(
                "validThrough" to "ISO 8601 expiry.",
                "employmentType" to "FULL_TIME, PART_TIME and so on.",
            ),
        ),
    )

    private val BY_TYPE: Map<String, TypeRule> = buildMap {
        for (rule in TYPES) {
            put(rule.type.lowercase(), rule)
            for (alias in rule.aliases) put(alias.lowercase(), rule)
        }
    }

    fun ruleFor(type: String?): TypeRule? = type?.trim()?.lowercase()?.let { BY_TYPE[it] }

    enum class Severity { ERROR, WARNING }

    data class Finding(val severity: Severity, val path: String, val message: String, val note: String)

    data class NodeReport(val type: String, val rule: TypeRule?, val findings: List<Finding>)

    data class Result(
        val syntaxOk: Boolean,
        val syntaxMessage: String,
        val nodes: List<NodeReport>,
    ) {
        val errorCount: Int get() = nodes.sumOf { n -> n.findings.count { it.severity == Severity.ERROR } }
        val warningCount: Int get() = nodes.sumOf { n -> n.findings.count { it.severity == Severity.WARNING } }
        val eligible: Boolean get() = syntaxOk && errorCount == 0
    }

    private val ISO_DATE = Regex("""^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?)?$""")

    /** Values a path reaches. An empty list means the path is not present. */
    private fun resolve(node: Any?, path: String): List<Any?> {
        var current: List<Any?> = listOf(node)
        for (segment in path.split(".")) {
            val fanOut = segment.endsWith("[]")
            val key = if (fanOut) segment.dropLast(2) else segment
            val next = mutableListOf<Any?>()
            for (item in current) {
                val candidates = if (item is JSONArray) (0 until item.length()).map { item.get(it) } else listOf(item)
                for (candidate in candidates) {
                    val obj = candidate as? JSONObject ?: continue
                    if (!obj.has(key)) continue
                    val value = obj.get(key)
                    if (fanOut && value is JSONArray) {
                        for (i in 0 until value.length()) next.add(value.get(i))
                    } else {
                        next.add(value)
                    }
                }
            }
            if (next.isEmpty()) return emptyList()
            current = next
        }
        return current
    }

    private fun isBlank(value: Any?): Boolean = when (value) {
        null, JSONObject.NULL -> true
        is String -> value.isBlank()
        is JSONArray -> value.length() == 0 || (0 until value.length()).all { isBlank(value.get(it)) }
        is JSONObject -> value.keys().asSequence().filter { it != "@type" && it != "@context" }.toList()
            .let { keys -> keys.isEmpty() || keys.all { isBlank(value.get(it)) } }
        else -> false
    }

    private fun collectNodes(value: Any?, out: MutableList<JSONObject>) {
        when (value) {
            is JSONArray -> for (i in 0 until value.length()) collectNodes(value.get(i), out)
            is JSONObject -> {
                val graph = value.optJSONArray("@graph")
                if (graph != null) {
                    collectNodes(graph, out)
                    val ownKeys = value.keys().asSequence().filter { it != "@graph" && it != "@context" }.toList()
                    if (ownKeys.isEmpty()) return
                }
                out.add(value)
            }
        }
    }

    fun validate(source: String): Result {
        if (source.isBlank()) return Result(false, "Nothing to validate yet.", emptyList())

        val parsed: Any = try {
            val trimmed = source.trim()
            if (trimmed.startsWith("[")) JSONArray(trimmed) else JSONObject(trimmed)
        } catch (e: Exception) {
            return Result(false, e.message ?: "That is not valid JSON.", emptyList())
        }

        val objects = mutableListOf<JSONObject>()
        collectNodes(parsed, objects)
        if (objects.isEmpty()) return Result(true, "Valid JSON, but it contains no JSON-LD nodes.", emptyList())

        val reports = objects.map { node ->
            val findings = mutableListOf<Finding>()
            val rawType = node.opt("@type")
            val type = when (rawType) {
                is JSONArray -> if (rawType.length() > 0) rawType.getString(0) else ""
                null -> ""
                else -> rawType.toString()
            }
            val rule = ruleFor(type)

            if (type.isBlank()) {
                findings.add(Finding(Severity.ERROR, "@type", "No @type. Search engines cannot tell what this describes.", ""))
            } else if (rule == null) {
                findings.add(
                    Finding(
                        Severity.WARNING, "@type",
                        "\"$type\" is valid schema.org markup but is not one of the types this screen covers, so eligibility was not checked.",
                        "Open Schema Studio on the web for the full type list.",
                    )
                )
            }

            rule?.let {
                for ((path, note) in it.required) {
                    val values = resolve(node, path)
                    if (values.isEmpty() || values.all(::isBlank)) {
                        val message = if (values.isEmpty())
                            "Missing. Google documents $path as required for ${it.label}."
                        else "Present but empty. Fill $path with the real value from the page."
                        findings.add(Finding(Severity.ERROR, path, message, note))
                    } else {
                        checkShape(path, values, findings)
                    }
                }
                for ((path, note) in it.recommended) {
                    val values = resolve(node, path)
                    if (values.isEmpty() || values.all(::isBlank)) {
                        val message = if (values.isEmpty())
                            "Not present. Google documents $path as recommended for ${it.label}."
                        else "Present but empty. Fill it with a real value or remove the key."
                        findings.add(Finding(Severity.WARNING, path, message, note))
                    } else {
                        checkShape(path, values, findings)
                    }
                }
            }

            NodeReport(type.ifBlank { "(no @type)" }, rule, findings)
        }.toMutableList()

        // @context is a document-level concern, checked once rather than per node.
        val root = parsed as? JSONObject ?: (parsed as? JSONArray)?.optJSONObject(0)
        val context = root?.optString("@context", "").orEmpty()
        if (context.isBlank()) {
            val finding = Finding(Severity.ERROR, "@context", "Missing @context. Add \"@context\": \"https://schema.org\".", "")
            reports[0] = reports[0].copy(findings = listOf(finding) + reports[0].findings)
        } else if (!context.contains("schema.org", ignoreCase = true)) {
            val finding = Finding(
                Severity.WARNING, "@context",
                "@context is \"$context\". Google reads schema.org vocabulary; other contexts are ignored.", "",
            )
            reports[0] = reports[0].copy(findings = listOf(finding) + reports[0].findings)
        }

        val nodeWord = if (reports.size == 1) "node" else "nodes"
        return Result(true, "Valid JSON-LD. ${reports.size} $nodeWord found.", reports)
    }

    private val DATE_PROPS = setOf("datepublished", "datemodified", "dateposted", "validthrough", "startdate", "enddate", "uploaddate")

    private fun checkShape(path: String, values: List<Any?>, findings: MutableList<Finding>) {
        val leaf = path.substringAfterLast('.').removeSuffix("[]").lowercase()
        if (leaf !in DATE_PROPS) return
        for (value in values) {
            val text = (value as? String)?.trim() ?: continue
            if (text.isEmpty()) continue
            if (!ISO_DATE.matches(text)) {
                findings.add(
                    Finding(
                        Severity.ERROR, path,
                        "\"$text\" is not an ISO 8601 date. Use 2026-08-16 or 2026-08-16T09:00:00+03:00.", "",
                    )
                )
            }
        }
    }
}
