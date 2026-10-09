# v0.5.161 (2026-10-07) · 5 commits

## Features
- **Dashboard**: add inbox error listing failed requests
- **Notifications**: bell opens the changelog; drop the inbox error and security log surfaces
- **Notifications**: surface failed requests and security events in the bell

## Fixes
- **Security log**: stop probe signatures from swallowing sign-in events
- **UI**: scroll the update banner with the page and use English copy in the error inbox

# v0.5.160 (2026-10-07) · 1 commit

## Features
- **Dashboard**: add inbox error listing failed requests

# v0.5.159 (2026-10-05) · 1 commit

## Fixes
- **Auth**: refuse shutdown and live-update for API key sessions; hide the controls too

# v0.5.158 (2026-10-04) · 25 commits

## Features
- **Antigravity**: add Claude Opus 5.5 and Sonnet 5.5 models
- **Antigravity**: list Claude 5.5 models and flag them when tier-blocked
- **Dashboard**: full request bodies, notification bell, settings rollback, bulk key edit, model benchmark
- **Dashboard**: make PRD Builder one prompt, English copy
- **Key catalog**: show context window instead of the studio label; install the fork from github in the update banner
- **Models**: optional owned_by on custom models; fix hidden security log; drop usage CTA
- **Security**: persistent security log with red breach flags, admin-only site theme
- **Studio,banner**: hide the upstream model, custom owned_by, cancellable background banners

## Fixes
- **Auth**: fail closed when the dashboard guard cannot run
- **Dashboard**: accept combo names in PRD Builder
- **Docker**: ship the auth guard sources into the runtime image
- **Docker**: ship the guard runtime deps the src tree imports
- **Docker**: stamp APP_REVISION from Railway commit SHA so update banner works there
- **Import**: keep the poll digest alive until the job record expires
- **Import**: return the poll token in the job creation response
- **Models**: publish custom model owned_by on the connected path too
- **Notifications**: point the update notice at the profile page, not the dead settings route
- **Providers**: mark MiMoCode Free as Unavailable in red
- **UI**: replay update banner animation on navigation and animate dismissal
- **UI**: ship icon subset font and show commit counts on changelog cards
- **UI**: show long operations in a ProgressCard banner
- **UI**: theme the loading banner, keep progress on the background chip, always offer cancel and background

## Docs
- **Readme**: current screenshot, evergreen feature section, auto-refresh workflow
- **Readme**: refresh dashboard screenshot to v0.5.155

## Internal
- **Models**: Revert "feat(antigravity): add Claude Opus 5.5 and Sonnet 5.5 models"

# v0.5.157 (2026-10-04) · 22 commits

## Features
- **Antigravity**: add Claude Opus 5.5 and Sonnet 5.5 models
- **Antigravity**: list Claude 5.5 models and flag them when tier-blocked
- **Dashboard**: full request bodies, notification bell, settings rollback, bulk key edit, model benchmark
- **Dashboard**: make PRD Builder one prompt, English copy
- **Models**: optional owned_by on custom models; fix hidden security log; drop usage CTA
- **Security**: persistent security log with red breach flags, admin-only site theme
- **Studio,banner**: hide the upstream model, custom owned_by, cancellable background banners

## Fixes
- **Auth**: fail closed when the dashboard guard cannot run
- **Dashboard**: accept combo names in PRD Builder
- **Docker**: ship the auth guard sources into the runtime image
- **Docker**: ship the guard runtime deps the src tree imports
- **Docker**: stamp APP_REVISION from Railway commit SHA so update banner works there
- **Import**: keep the poll digest alive until the job record expires
- **Import**: return the poll token in the job creation response
- **Models**: publish custom model owned_by on the connected path too
- **Providers**: mark MiMoCode Free as Unavailable in red
- **UI**: replay update banner animation on navigation and animate dismissal
- **UI**: ship icon subset font and show commit counts on changelog cards
- **UI**: show long operations in a ProgressCard banner

## Docs
- **Readme**: current screenshot, evergreen feature section, auto-refresh workflow
- **Readme**: refresh dashboard screenshot to v0.5.155

## Internal
- **Models**: Revert "feat(antigravity): add Claude Opus 5.5 and Sonnet 5.5 models"

# v0.5.156 (2026-10-04) · 21 commits

## Features
- **Antigravity**: add Claude Opus 5.5 and Sonnet 5.5 models
- **Antigravity**: list Claude 5.5 models and flag them when tier-blocked
- **Dashboard**: full request bodies, notification bell, settings rollback, bulk key edit, model benchmark
- **Dashboard**: make PRD Builder one prompt, English copy
- **Models**: optional owned_by on custom models; fix hidden security log; drop usage CTA
- **Security**: persistent security log with red breach flags, admin-only site theme
- **Studio,banner**: hide the upstream model, custom owned_by, cancellable background banners

## Fixes
- **Auth**: fail closed when the dashboard guard cannot run
- **Dashboard**: accept combo names in PRD Builder
- **Docker**: ship the auth guard sources into the runtime image
- **Docker**: ship the guard runtime deps the src tree imports
- **Docker**: stamp APP_REVISION from Railway commit SHA so update banner works there
- **Import**: keep the poll digest alive until the job record expires
- **Import**: return the poll token in the job creation response
- **Models**: publish custom model owned_by on the connected path too
- **Providers**: mark MiMoCode Free as Unavailable in red
- **UI**: ship icon subset font and show commit counts on changelog cards
- **UI**: show long operations in a ProgressCard banner

## Docs
- **Readme**: current screenshot, evergreen feature section, auto-refresh workflow
- **Readme**: refresh dashboard screenshot to v0.5.155

## Internal
- **Models**: Revert "feat(antigravity): add Claude Opus 5.5 and Sonnet 5.5 models"

# v0.5.155 (2026-10-04) · 20 commits

## Features
- **Antigravity**: add Claude Opus 5.5 and Sonnet 5.5 models
- **Antigravity**: list Claude 5.5 models and flag them when tier-blocked
- **Dashboard**: make PRD Builder one prompt, English copy
- **Models**: optional owned_by on custom models; fix hidden security log; drop usage CTA
- **Security**: persistent security log with red breach flags, admin-only site theme
- **Studio,banner**: hide the upstream model, custom owned_by, cancellable background banners

## Fixes
- **Auth**: fail closed when the dashboard guard cannot run
- **Dashboard**: accept combo names in PRD Builder
- **Docker**: ship the auth guard sources into the runtime image
- **Docker**: ship the guard runtime deps the src tree imports
- **Docker**: stamp APP_REVISION from Railway commit SHA so update banner works there
- **Import**: keep the poll digest alive until the job record expires
- **Import**: return the poll token in the job creation response
- **Models**: publish custom model owned_by on the connected path too
- **Providers**: mark MiMoCode Free as Unavailable in red
- **UI**: ship icon subset font and show commit counts on changelog cards
- **UI**: show long operations in a ProgressCard banner

## Docs
- **Readme**: current screenshot, evergreen feature section, auto-refresh workflow
- **Readme**: refresh dashboard screenshot to v0.5.155

## Internal
- **Models**: Revert "feat(antigravity): add Claude Opus 5.5 and Sonnet 5.5 models"

# v0.5.154 (2026-10-03) · 21 commits

## Features
- **Dashboard**: add PRD Builder to FEATURE+
- **Theme**: add a glassmorphism mode alongside dark
- **Theme**: dedicated theme button next to the grid menu
- **Theme**: glass becomes the default theme, listed above dark
- **Theme**: theme picker lives under Change Log in the grid menu
- **Theme**: theme picker opens as a modal, matching Change Log
- **Token saver**: level presets for pruning and a measurable response cache
- **Usage**: add activity heatmap, card sparklines, and smart empty states
- **Usage**: remove the live request inspector tab
- **Usage**: token saver analytics tab with real-savings estimates

## Fixes
- **Models**: honor .env PORT on start and persist free model catalogues
- **Combo**: combo pills report the real window instead of the 200k default
- **Providers**: drop the duplicate MiMo free registry entries
- **Providers**: keep suggested free models visible when opencode flakes
- **Token saver**: keep option rows under their own text
- **Token saver**: move the two toggles to the bottom, stack all pickers
- **UI**: merge duplicate category headings in day-rolled changelog cards
- **Usage**: center summary card numbers and pin them to one baseline
- **Usage**: only show providers with real traffic in the topology
- **Usage**: savings table empty state must not blame the filter

## Docs
- **Token saver**: shorten the two longest row labels

# v0.5.153 (2026-10-02) · 18 commits

## Features
- **Plugins**: JSON Guard + Context Squeezer custom plugins
- **Providers**: add MiMoCode Free no-auth provider (mimocode/, mimocode-free/)
- **Providers**: merge live free-model catalogue into /v1/models and the picker
- **UI**: maintenance badge, shared provider icons, merged changelog cards
- **UI**: show live free-model catalogue in the model picker
- **UI**: single animated update banner on dashboard; drop sidebar copy

## Fixes
- **Auth**: enforce the dashboard guard in custom-server because Next 14 middleware is Edge-only
- **Dev**: isolate dev build to .next-dev on localhost:20128 so dev runs stop corrupting the production .next
- **Hook**: converge via a single settled post-commit amend loop
- **Hook**: fold regenerated changelog into each commit via post-commit amend
- **Hook**: keep backticks out of the hook template so install works
- **Hook**: pass --no-verify on the amend so prepare-commit-msg stops re-dirtying the tree
- **UI**: drop key={pathname} from UpdateBanner; sibling keys collided with Header and leaked one header per navigation

## Docs
- **Auth**: regen changelog for auth-guard fix
- **Backup**: restore full fork changelog history (119 versions, an old commit had truncated it to 3)
- **Changelog**: stage changelog output in the git hook so commits stop leaving CHANGELOG.md dirty
- **Changelog**: sync changelog for the hook fix

## Internal
- **Auth**: release v0.5.153 (auth guard enforced at HTTP layer)

# v0.5.152 (2026-10-01) · 20 commits

## Features
- **Providers**: add v1m System One provider
- **Agnes**: seed the 2.5/3.0 model ids in the registry
- **Claude**: add Claude Sonnet 5.5
- **CLI**: add connect command for remote 9router servers
- **Codebuddy**: parse 6004 rate limit error and extract resetsAtMs
- **Codex**: add GPT-6.1 Sol
- **Codex**: expose 1M context variants for GPT-6 and GPT-5.6
- **Glm**: add Z.ai OAuth login to GLM Coding (dual-auth)
- **Kiro**: add claude-opus-5.5 models to registry and capabilities
- **Muse**: add Meta Muse provider with OAuth login and model catalog
- **Providers**: per-provider custom header overrides from the registry
- **Quota**: sync ?provider= URL param with provider filter for bookmarkable deep links (#4395)
- **UI**: unify every long-operation loading into one centered progress card
- **Web**: add TinyFish search and fetch provider

## Fixes
- **Backup**: stop invalid-password error during import by polling with a token
- **Keys**: show created keys to their creator session everywhere, label creators by name
- **Tests,endpoint**: throwaway DATA_DIR for vitest; auto-create key named 'Default Keys' with duplicate-provision guard
- **Tests**: point vitest DATA_DIR at a throwaway dir so fixtures never write the live DB

## Docs
- **Changelog**: regen changelog for upstream v0.5.95 features
- **Changelog**: restyle fork CHANGELOG to match the upstream format

# v0.5.151 (2026-09-30)

## Fixes
- **Import**: show bulk import progress overlay and block closing the modal while a bulk add/import loop is running, split large codex/grok payloads into batches of 20
- **Logging**: dedupe repeated auth-failure log lines per source/ip/key prefix so a misconfigured polling client no longer floods the log, 401 responses still sent
- **Backup**: forward the backup password as `x-9r-password` header when polling the import job so password-protected imports track progress
- **Providers**: resolve provider aliases for suggested-model fetcher lookup, fall back to built-in models with an error note when upstream is unreachable, tolerate upstream schema drift

# v0.5.150 (2026-09-30)

## Fixes
- **API Keys**: show created-by label under each API key name on the endpoint page
- **API Keys**: include `createdBy` in `POST /api/keys` 201 response
- **Inspector**: open live-requests inspector stream without login gate, scope rows by key `allowedModels`, refresh every 5s
- **Models**: hide orphaned compat alias ghost groups in the model picker and clean up custom models plus aliases on provider node delete

## Internal
- **Tests**: add structural backup self-check covering apiKeys permissions and createdBy round-trip

# v0.5.149 (2026-09-30)

## Fixes
- **Settings**: move tracing config into experimental and exclude user profile paths

# v0.5.148 (2026-09-30)

## Fixes
- **Build**: mark db adapters external the Next 14 way so bun sqlite skips the webpack bundle

# v0.5.147 (2026-09-30)

## Fixes
- **Build**: restore build dependencies dropped during the Next 14 downgrade

# v0.5.146 (2026-09-29)

## Fixes
- **Build**: drop unknown webpack flag from the build script for next 14.2.35

# v0.5.145 (2026-09-29)

## Fixes
- **Build**: pin `@types/react-dom` to existing 18.x to fix Railway install

# v0.5.144 (2026-09-29)

## Security
- **Build**: bump next to 14.2.35 to resolve high severity CVEs

# v0.5.143 (2026-09-29)

## Features
- **Usage**: show available models in apikey session usage
- **Models**: allow combo as custom model target with cycle guard

# v0.5.142 (2026-09-29)

## Features
- **Backup**: show centered loading overlay with progress while exporting, importing, or testing a backup
- **Backup**: run backup import as a background job with per-section progress so the UI stays responsive

# v0.5.141 (2026-09-29)

## Features
- **Backup**: include permissions and `createdBy` columns in apiKeys backup export/import
- **Backup**: add backup self-check for round-trip export→import preserving apiKey metadata

## Fixes
- **API Keys**: add `createdBy` `"dashboard"` value for dashboard users in `POST /api/keys`
- **Backup**: fix round-trip `exportDb`/`importDb` to preserve permissions and `createdBy` fields

# v0.5.140 (2026-09-28)

## Fixes
- **Models**: stop the model picker heading a group with a generated node id
- **Models**: disambiguate compatible provider headings with a short uuid suffix so two custom providers never share one label

## Internal
- **Tests**: add structural and distinctness cases for the new heading disambiguation in `providerDisplaySelfCheck`

# v0.5.139 (2026-09-28)

## Fixes
- **Streaming**: correct a streamed tool-call name without holding the stream back
- **Models**: stop the model picker heading a group with a generated node id
- **Tool calls**: rescue tool calls the client would reject with an invalid-args error

# v0.5.138 (2026-09-28)

## Fixes
- **Chat**: restore seren chat core

# v0.5.139-Custom (2026-09-28)

## Fixes
- **A streamed tool call is no longer rejected over the case of its name.** The name and the arguments are corrected differently on purpose. A name arrives whole in the first delta of a call, so raising it back to the case the request declared costs nothing and holds nothing back. Arguments arrive in fragments and only form a parseable object at the end, so they are not touched here: buffering them would delay every tool call in the stream until its last fragment landed. A streamed call whose arguments cannot be recovered is repaired on the following turn instead, by the history rule shipped in `v0.5.137-Custom`, which is too late to save that turn but stops it repeating.
- **The fix is applied on every path that emits a chunk.** Passthrough, the Responses same-format passthrough, the translate loop, the flush tail and the final flush all correct a name before the frame is written.

## Internal
- **Twelve cases added** for the streaming rule, covering the real delta shapes: an OpenAI first delta with an empty argument string, a later argument fragment, a Claude `content_block_start`, a Responses `output_item.added`, a text chunk that must stay untouched, a name that is not a declared tool, and an exact-case name that must not be rewritten needlessly.
- **A circular-chunk case found a real defect.** The name walk is recursive and had no depth bound, so a cyclic chunk overflowed the stack. Chunks arrive about five levels deep, so a bound of twelve is generous and stops it. Confirmed by removing the bound, which reproduces the overflow.
- **The check counts the emit sites in the stream source.** Every case above passed with the call site removed from the translate loop, because a pure-function check cannot see a missing hook. The source is now read to assert the index is built, the wrapper exists, and the guarded-site count has not moved; removing one hook was confirmed to redden it.
- **The scope limit is asserted rather than left implicit.** Six frames are enqueued and five are guarded. The two that are not hand the client a raw upstream SSE line rather than a parsed object, so correcting a name there means re-parsing the line; they are passthrough, where the CLI tool and the provider are the same ecosystem and the model sees the names the client declared. The check pins the total at six so a new emit site forces that decision again instead of slipping past.

## Notes
- **Verification is static**, as it has been throughout this fork: per-file esbuild plus the self-checks. Nothing here has been exercised in a browser.

# v0.5.138-Custom (2026-09-28)

## Fixes
- **The model picker no longer heads a group with a generated node id.** A compatible provider node is stored under an id like `openai-compatible-chat-b5bca155-fc33-4899-a868-2ff3d7891e3c`, and a custom model records that id as its provider. When no group owned the alias, the picker opened one and titled it with the id, so a database key was rendered as a provider name with a model count beside it. The heading now resolves in order: the node's own name, the connection's name, the static registry, and finally the family the id belongs to, so an unresolvable node reads as OpenAI Compatible rather than as a uuid. A registry entry that merely echoes the id back is not trusted as a name.
- **A custom model no longer opens a second group for a node that already has one.** A compatible group is keyed by the node id but stores the node prefix as its display alias, and a custom model stores the id, so the alias-only lookup never matched. The id is tried as well, which is what makes the group and the model meet.

## Internal
- **`providerDisplay.js` added, with a 26-case check.** It covers the reported shapes (chat node, responses node, anthropic node, a missing node record, an empty node list during the first render) alongside the cases that must stay unchanged: a known registry alias is used as-is, an unknown plain id resolves to empty so the caller keeps its own default, and a schema-less lookup never guesses. The check was confirmed to fail by reinstating each defect separately: labelling a group with its own id reddened 10 cases, and dropping the node-id match from the owner lookup reddened 2.
- **The check also reads the component.** A perfect helper does not help while the picker keeps reaching for the registry fallback, which is `{ name: providerId }` and therefore the id again, so two cases assert the leaking expressions are gone from the source. Restoring one of them in the component was confirmed to redden the check.
- **One defect was found while writing the check.** The api type sits after the `compatible` segment in the id, not in the second word, so the first version read `openai-compatible` as the type and matched nothing. Six of the nine id cases failed until it was corrected.

## Notes
- **Verification is static**, as it has been throughout this fork: per-file esbuild plus the self-checks. Nothing here has been exercised in a browser.

# v0.5.137-Custom (2026-09-28)

## Fixes
- **A tool call the client could not satisfy ended the turn.** `Invalid args for tool "Bash": must have required property 'command'` is the client validating the call against the schema the request itself declared, and it throws rather than continuing. The argument object was reaching the client as `{}` because the only repair in the pipeline, `toolCallFallback.repair`, reads the request history and never looks at the call the model is producing right now. Three rules now run over each response: a name spelled in a different case than the request declared is raised back to the declared one, a missing required property is filled from a value the model did supply under another name, and a call whose arguments cannot be recovered is dropped so the model tries again on the next turn instead of the turn dying.
- **A model that wrote the command as the whole argument string is understood.** `arguments: "ls -la"` is lifted into `{"command":"ls -la"}`, but only when the tool declares exactly one required string property. With more than one, the value is ambiguous and the call is dropped rather than guessed.
- **A rejected call no longer poisons every turn after it.** The call the client rejected stays in the history it sends back, so the same broken call was re-validated and rejected on each retry. The history is now rescued on the way out, which is what makes a turn recoverable after the first failure.

## Internal
- **`toolCallRescue.js` added, with a 31-case check** covering the reported shapes (lower-case name, empty arguments, bare string, `cmd`, `commandLine`, `oldString`) plus the shapes that must stay untouched: a well-formed call is re-encoded byte-identically, an undeclared name is left alone, a schema without `required` is not second-guessed, and a non-object argument value does not throw. The check was confirmed to fail by reinstating each defect separately: removing the case-insensitive name match reddened 11 cases, and passing an unrecoverable call through instead of dropping it reddened 7.
- **Three defects were found while writing the check.** A Claude `tool_use` block carries `input` as an object, not a JSON string, and the first version parsed it as a string and discarded it. Separator-insensitive matching was skipping every spelling variant of the key itself, so `newString` could not fill `new_string`. And a Claude-format response is the message itself rather than a choice inside one, so the first version never reached it at all.

## Notes
- **Streaming is not covered.** Tool arguments arrive in fragments there, and buffering them to repair would hold back every tool call until the last fragment lands. The non-streaming path and the request history are repaired; a streaming call is still repaired on the following turn through the history rule above.
- **Verification is static**, as it has been throughout this fork: per-file esbuild plus the self-checks. Nothing here has been exercised in a browser.

# v0.5.136-Custom (2026-09-28)

## Fixes
- **Creating an API key failed everywhere.** `createApiKey` in the repository module read `ctx.session?.apiKey` to work out who was creating the key, but that module has no session and never had one. Every call threw a ReferenceError, the route caught it, and the dashboard got a bare 500 with no clue what went wrong. The caller already resolved the creator and passes it in, so the inference is gone. The key name check in the form was unrelated and is unchanged.
- **The Live Request tab was not reachable.** The tab strip scrolled sideways, so its last option sat off the edge of a narrow viewport, and the label was long enough to make that likely. The tab is now called Inspector, and the strip wraps instead of scrolling, so no option can end up hidden behind a scrollbar.

## Internal
- **A leaked-identifier scan added**, `leakedIdentifiersSelfCheck.mjs` (5 cases), scanning every module under `src` and `open-sse` for names that only exist inside a route handler or auth helper. It is written after the outage above, where esbuild passed the whole time because an undeclared global is a valid program to a bundler and only throws when the line runs.
- **The scan's first version did not catch its own bug.** Its destructuring rule accepted any braces around the name, so an object literal containing it read as a declaration and the offending line came back clean. The rule now requires the name to be a bare binding, and a case reproduces the exact shape of the line that caused the outage so the rule cannot widen back into matching it. Reintroducing the fault is what proved the difference.

## Notes
- **None of this has been exercised in a browser.** Verification is static: per-file esbuild plus the self-checks. The same applies to everything else shipped in this fork.

# v0.5.135-Custom (2026-09-28)

## Fixes
- **The wrong panel was hidden for API-key sessions.** The provider map is the diagram with 9Router at its centre and every configured provider arranged around it, joined by animated edges. That is infrastructure rather than one key's usage, and it is what now gets replaced with a short muted note. The usage charts, which were hidden instead in `v0.5.129-Custom`, are back for every session. Both chart endpoints were already scoped to the session's allowed models, so what an API-key holder sees is that key's own usage.
- **The note no longer leaves most of a row empty.** Recent Requests is pinned to a fixed height and the map used to fill the wide column beside it, so the note and the request list now drop the two-column grid for an API-key session instead of sitting in a 480px cell.
- **A session that is still being identified no longer flashes the map.** The lookup of `/api/auth/status` and the statistics load run together, and the map area now shows the same spinner the charts used to, so an API-key holder never sees the map appear and then disappear.

## Changes
- **An API-key holder can see their own token allowance.** A card above the overview numbers shows the key's name, tokens used against its limit, what is left, the percentage, and a running countdown to the next reset. `/api/usage/api-keys` already narrowed its result to the session's key, so nothing about any other key reaches the browser: the endpoint needed no change, and neither did any permission. An unlimited key shows its usage and no bar or countdown rather than a broken empty one.
- **An API-key session stops requesting the provider list.** The two requests behind the map were the only consumer of that state, so a session that never renders the map no longer makes them.

## Internal
- **A render check added** for the Usage page, `usageStatsRenderSelfCheck.mjs` (7 cases), covering a password session, an API-key session with and without a quota, an unlimited key, and a session still being identified. It was confirmed to fail against two reintroduced defects: the charts hidden again, and the map shown again.
- **The two render harnesses were corrected.** The PropTypes stub returned `null` from a validator, which breaks any chained `.isRequired`, and the JSX stub recorded elements without calling them, so text inside a nested component never reached the tree and the check could not see a card that rendered nothing. Both now render what a browser would.
- **Panel detection hangs off component identity.** The four lazily loaded panels were told apart by prop name, which is unsafe: `activeRequests` and `errorProvider` are also fields of the statistics object the overview cards receive, so they appear in the tree whether or not the map is rendered.

## Notes
- **None of this has been exercised in a browser.** Verification is static: per-file esbuild plus the render check above. The same applies to everything else shipped in this fork.

# v0.5.134-Custom (2026-09-28)

## Changes
- **The Change Log modal no longer stacks both contributors into one scroll.** It opens on Serenhope with a switcher in the header to move between Serenhope and Decolua. Both changelogs were already fetched separately, so nothing new is requested; only the display changed. A tab appears only for a source that actually loaded, so an unreachable upstream no longer offers a button that leads to nothing.
- **A selection that points at an empty changelog falls back** to one that has content, rather than leaving the body blank. This is the case where upstream goes down after the user has picked it.

## Internal
- **Two self-checks added**: `changelogSourcesSelfCheck.mjs` (9 cases) covers the source list, the default, and every empty-state fallback, and `changelogModalRenderSelfCheck.mjs` (6 cases) renders the modal with both changelogs present, with one absent, and with a stale selection. The render check feeds state through a queue, because with the component's real empty state the switcher never appears and a check that only renders that would pass against a broken one. Both were confirmed to fail against a deliberately reintroduced defect.
- **Source selection moved into `changelogSources.js`**, free of imports, so it can be tested without the bundled dependencies. It mirrors what `pluginModelMatch.js` does for the plugins page.

# v0.5.133-Custom (2026-09-28)

## Changes
- **Three more Custom Plugins, each per model and each off by default**: Structured Output Lock normalises the response format a request asked for, writes the required fields into the system prompt for providers with no native JSON mode, and strips fences, leading prose and truncation out of non-streaming answers. Tool Argument Repair compares every call against the schema the model was actually given, fills safe defaults, coerces near-miss types, and drops a call whose required arguments cannot be recovered instead of sending one the harness will reject. Context Doctor cuts a conversation that no longer fits the model's window, shortens the tool output that is left, and leaves a recap naming the files and commands that were removed. All three carry their own badge on the model, the way Image Vision and Think Deeper already do.
- **Adaptive Pruning by Context Window** in Token Saver sizes the cut to the model rather than to a message count, so a short session is never touched and only a request that would actually overflow loses turns. Room is held back for the reply, and the existing message limit becomes the floor rather than the target.
- **A tool call and the result answering it are now treated as one unit when cutting history.** The new pruning groups turns by the call ids actually present in the conversation, so a call is never dropped while its result survives. That split is a hard 400 upstream, and inside a combo it burns every member before one can reply.

## Fixes
- **A tool call that could not be repaired was never actually dropped.** The repair tested whether anything had changed before testing whether the call was recoverable, and a call missing only an unfillable required property had nothing left to change, so it passed straight through and the client failed on it again.
- **The Context Doctor recap was inserted ahead of the system prompt.** It was spliced at index 0 rather than after the pinned prefix, which Claude and Gemini both reject.
- **A truncated JSON object whose last key had no colon stayed unparseable.** The shared closing helper only handled the form with a trailing comma, so `{"city":"Lisbon","popu` reached the caller untouched instead of as `{"city":"Lisbon"}`.

## Internal
- **Seven self-checks added**: `tokenBudgetSelfCheck.mjs` (17 cases), `adaptivePruningSelfCheck.mjs` (16), `contextDoctorSelfCheck.mjs` (18), `structuredOutputSelfCheck.mjs` (21), `toolSchemaRepairSelfCheck.mjs` (24), `pluginModelMatchSelfCheck.mjs` (9) and a render smoke-check for the two changed pages (8). Each was confirmed to fail against a deliberately reintroduced defect before being accepted. The adaptive pruning check initially accepted a broken one, because its cases only ever cut a call and its result in sequence, so a case was added where the budget is met the instant the call alone is dropped.
- **Plugin list management no longer repeats itself per plugin.** The API route and the plugins page derive their keys from one list, so a newly added plugin cannot be silently dropped from a save or from the load path.
- **Plugin model matching moved to its own module** so it can be tested without the settings database. Two of its assumptions are now pinned by tests: a bare model name matches across provider prefixes, which is what makes a plugin work at all when the dashboard stores an aliased id, and a prefix of a real id is not a match.
- **The render check drives boolean state on.** Every enabled branch in both pages is gated on a boolean, and a stub that returned the initial `false` would leave those branches unevaluated, so a typo inside one would never throw. A case also forces the model picker open and asserts on the resulting tree, because a picker title built from a renamed variable throws in a way a plain render does not.

## Notes
- **Streaming answers are not cleaned by Structured Output Lock.** Validating JSON means holding the text until the stream ends, which is the one thing streaming is for. That path is carried by the native response format plus the pinned schema.
- **Streaming tool arguments are not buffered by Tool Argument Repair**, for the same reason. A partial JSON string cannot be validated, and holding the fragments would stop tool arguments streaming at all. Complete calls inside a chunk, which is how Claude and Responses emit them, are still repaired; fragmented OpenAI deltas are picked up on the next turn, where the request-side repair fixes the history.
- **The Context Doctor summariser is a hook, not a feature yet.** The module accepts a summariser and falls back to the deterministic recap when it throws, returns nothing, or is absent, and both paths are tested. Nothing supplies one: a nested LLM call inside the request path needs its own auth and recursion handling, so wiring it is left for a change that can be tested on its own.
- **None of this has been exercised in a browser.** Verification is static: per-file esbuild plus the self-checks above. The same applies to everything else shipped in this fork.

# v0.5.132-Custom (2026-09-28)

## Fixes
- **Model picker merged unrelated models into one provider**: custom models that could not be placed in a provider group were pushed into the first provider with `passthroughModels`, which both stacked them under that provider's heading and rewrote their value to that provider's prefix. Picking one silently retargeted the request at a provider the model never belonged to, and a provider such as OpenCode Free could show hundreds of borrowed models. They are now grouped under the alias each model actually belongs to, which is the prefix the value needs anyway.
- **A permission comment described the opposite of what the code does**: an empty `permissions: []` page rule was documented as "open to any session", but `canOpenPage` asks whether any listed permission is held, and an empty list has none, so the page is closed. The comment is corrected, and the two pages relying on it (Basic Chat, Profile) keep their existing behaviour.

## Changes
- **Four more API key permissions**: `manageTools` (CLI Tools, Token Saver), `manageAdvanced` (Console Log, Translator, Proxy Pools, PXPIPE), `managePlugins` (Custom Plugins, Skills) and `manageMediaProviders`. All default to off, so a key created before this change gains nothing: `normalizePermissions` reads a missing field as false, and no migration grants anything. A password session keeps every page. The sidebar now shows an API key session only the parts of the System section it may open, instead of hiding all of it.
- **API key allowed models follow the models**: deleting a model drops it from every key's allowlist, and renaming one rewrites the entries that referenced it, across custom models, the model editor and model aliases. Only the ids the caller reports as gone are touched, so a provider that is momentarily unreachable cannot shrink anyone's list, and wildcard patterns are never pruned. When the last entry would be removed the old value is kept and the key is reported back, because an empty allowlist parses as "no restriction" and would silently unlock the key.
- **Usage charts hidden for API key sessions**: the token chart and the two breakdown charts are replaced with a short muted note. The overview numbers and the recent request list are unaffected. A password session sees exactly what it saw before. If the session lookup fails the page falls back to the password view.

## Internal
- **Two self-checks added**: `permissionPathsSelfCheck.mjs` (12 cases) proves each permission opens only its own pages, that none leaks into another section, and that a page with no rule stays shut. `allowedModelsReconcileSelfCheck.mjs` (15 cases) covers pruning, renaming, wildcard and `*` preservation, idempotence, and the refuse-to-empty rule. The reconcile check caught a real defect while being written: an untouched list was being respaced and rewritten, which is fixed.

# v0.5.131-Custom (2026-09-28)

## Fixes
- **Quota Tracker crashed on open**: the Quota row card rendered a `resetWord` that was never declared, which throws a ReferenceError the moment the list draws. `/dashboard/quota` has no error boundary, so the whole page went blank. The label now comes from the `recurring` flag the row already carries, so a one-shot pack still reads "Expires" and a refilling quota still reads "Reset", matching the wording the progress bar already used.

## Internal
- **Render smoke-check for the Quota Tracker components**: `QuotaTracker/renderSelfCheck.mjs` calls each leaf component as a plain function with real-shaped data covering every branch it draws (unlimited, credit balance, one-shot pack, missing reset time, compact mode, each sort mode, pagination, error and loading states). This catches a class of bug that parsing alone cannot: a JSX expression naming a variable nobody declared is syntactically valid, so it passes a build check and only fails when the component renders. The check was verified by reintroducing the defect and confirming it failed before restoring the fix.

# v0.5.130-Custom (2026-09-27)

## Changes
- **Permissions are locked for API key sessions**: signing in to the dashboard with an API key now disables the whole permissions block instead of only hiding the "manage API keys" row. The four checkboxes are inert, the value shown is the default with only View usage on, and a note explains that changing permissions needs the dashboard password. This applies to both the create form and the edit form, and the value sent to the API is forced to the default so stale form state cannot slip through.
- **Sub-keys created by an API key session no longer inherit permissions**: key creation and key editing now write the default permission set for an API-key session instead of clamping the request to what the caller already holds. A key that can create keys can no longer mint one that manages keys, so the escalation chain stops there. Session by dashboard password is unaffected and keeps full control.

# v0.5.129-Custom (2026-09-27)

## Fixes
- **API key usage showed providers the key cannot use**: signing in to the dashboard with an API key showed every provider that had ever run on the instance. The Usage page reads two sources, and the SSE stream at `/api/usage/stream` called `getUsageStats` without the allowed-models argument, so it fell back to "every model" and overwrote the correctly scoped first response. That stream is the one that populated the By Provider chart, which is why unrelated providers such as MiMo Code Free and OpenCode appeared next to the key's own custom model.
- **Leaderboard and Errors tabs ignored allowed models**: both filtered by API key but not by the key's model allowlist, so a scoped session saw models it would be refused at request time. The Errors tab now also excludes those models from its total and error counts, so the numbers agree with the rows.
- **Live request list was never scoped**: `getActiveRequests()` returned the global view to every caller, including API-key sessions, exposing other keys' in-flight and recent requests. It now takes the session scope, and a scoped caller gets an empty in-flight list because pending traffic carries no key attribution.
- **Request Details and the provider filter had no session check**: `/api/usage/request-details` and `/api/usage/providers` never consulted the dashboard session, so the provider dropdown could be used to enumerate providers outside the key's scope. Both are now narrowed to the key's allowed models. The model filter is applied in SQL rather than after the query, so pagination counts stay correct.

## Notes
- The `requestDetails` table has no `apiKey` column, so the Details tab and Live Request Inspector are scoped by allowed model but not yet by API key. Scoping them per key needs a schema change; existing rows cannot be attributed retroactively.

# v0.5.128-Custom (2026-09-27)

## Custom Features & Enhancements
- **Automatic tool calling fallback**: a tool payload that a provider refuses no longer surfaces as a tool error. Before dispatch, malformed tool arguments are repaired (truncated JSON is closed back up, non-string arguments are stringified, empty ones become `{}`), tool results whose call id matches nothing are dropped, and a `tool_choice` pointing at a tool that is not in the array is removed. When an upstream still answers 400/404/422 naming the tools, the request is re-dispatched with the tool machinery relaxed one step at a time, stopping at the first level the provider accepts: drop `tool_choice` and `strict`, then strip JSON Schema keywords that many gateways reject while keeping every tool name and description, and finally drop the tool definitions entirely and inline the tool history as prose so the turn is still answered. On by default; set `toolCallFallback` to `false` in settings to restore the previous behaviour. A rejection that does not name tools, such as a context overflow or a policy refusal, is never touched.

# v0.5.127-Custom (2026-09-27)

## Fixes
- **MiMo Code Free hidden properly**: the provider was flagged `hidden` in the registry but still surfaced in the model selector and in `/v1/models`, because the no-auth provider lists were built from every `noAuth` free provider without checking that flag. Both lists now skip hidden entries, so the dead Xiaomi free channel no longer shows up with a large auto-fetched model list. The entry keeps its `noAuth` flag so an old `mmf/mimo-auto` request still resolves on the request path.
- **MiMo free model catalog no longer auto-fetched**: the registry entry pulled a model list from models.dev through `modelsFetcher` and accepted any id through `passthroughModels`. Both are gone, so the provider exposes only its single curated model and no longer grows a catalog from an external source.

## Changes
- **Web cookie provider names shortened**: DeepSeek Web (Cookie), Gemini Web (Cookie) and Kimi Web (Cookie) are now DeepSeek Web, Gemini Web and Kimi Web. The provider ids and aliases are unchanged, so saved connections keep working.

# v0.5.126-Custom (2026-09-27)

## Custom Features & Enhancements
- **Live Request Inspector**: new tab in the Usage menu that streams live request metadata (model, provider, tokens, latency, status) over SSE. Shows the newest 50 requests with a rolling snapshot that self-heals on reconnect, plus a pause/resume toggle and a detail drawer. Conversation payloads are never sent to the client, matching the redaction policy of the existing request-details endpoint.
- **Prompt Cache Indicator**: the Recent Requests rows now show a `CACHE` badge when a request served prompt tokens from cache, and the Cached Tokens overview card shows a cache hit rate percentage when caching is active.
- **Quota Tracker redesign**: quota rows are now card-style with rounded borders, a larger progress bar, and the remaining percentage moved to the top-right of each row. Spacing, typography and hover states are aligned with the rest of the dashboard.
- **API Key Usage menu removed**: the sidebar entry is gone. Users who sign in with an API key already see their own scoped usage on the Usage page, so the separate menu was redundant. The page route and `/api/usage/api-keys` endpoint are unchanged.

## Fixes
- **Live Request Inspector auth**: the SSE endpoint called `getSessionContext()` but discarded the result, so the auth check was a no-op. It now returns 401 when there is no session.

# v0.5.125-Custom (2026-09-27)

## Upstream Sync
- **Synced with decolua upstream v0.5.91**: 37 upstream commits merged, including the Token Harbor provider, four OpenAI-compatible aggregators (dahl, atria, agnes, bai), Claude thinking text returned to OpenAI-format clients, Claude decloak fallback when toolNameMap misses, Zed OAuth auto-import, GPT-6 Sol and Luna for Codex, the completed OpenCode Go catalog, Codex CLI multi-profile support, and Hermes multi-role model config.
- **Fixes from upstream**: usage attribution keyed by full API key to stop team-key collisions, combo limits resolved with server capabilities, capabilities catalog no longer cached per module copy, `POST /api/providers` made O(1) with silent key overwrite refused, Command Code raw byte replay, empty think markers no longer emitted, Gemini terminal turns and unresponded functionCalls guarded, Tailscale enable-flow health wait capped at 20s, Claude cli version bumped to 2.1.280 for Opus 5.5.
- **Serenhope fixes kept**: per API key permissions and sign-in, combo context window resolution, combo body deep-copy so tool calling survives the fallback loop, usage chart and live stats scoped to the signed-in key, real custom plugin implementations, plugin badges on custom and combo models, default pricing fallback so Est. Cost is never always zero, Docker npm cache mount fix for Railway.
- **Serenhope removals kept**: Union Alpha models, the Custom Domain endpoint option, the Uncensored Output plugin, the withdrawn 304+ provider batch, and the Fastest / Cheapest / Select All combo options stay out.

# v0.5.123-Custom (2026-09-27)

## Fixes & Enhancements
- **Tool calling restored for whitelisted providers**: Fixed short-circuit in claude translator that bypassed the `!!tool?.function` fallback for providers with a tool-type whitelist.
- **Combo tools capability reporting fixed**: Changed `aggregateComboCapabilities` to use `some` instead of `every` for the `tools` capability so a single member without tools no longer disables tools for the entire combo.
- **API-key user model filtering fixed**: Added missing `fetch("/api/auth/status")` in EndpointPageClient so `creatorAllowedModels` and `creatorPermissions` resolve correctly instead of falling back to defaults.

# v0.5.124-Custom (2026-09-27)

## Fixes
- **Combo body mutation in fallback loop**: the fallback loop passed the same `body` reference to each member in turn, and `translateRequest` plus `fixMissingToolResponses` mutated `messages` in place. A second member inherited the corrupted history, which silently broke tool calling. Each member now gets its own cloned messages array, so a failed first member no longer poisons the next attempt.

## Custom Features & Enhancements
- **Select All removed from Combos page**: the master checkbox that toggled all combo cards at once was removed, along with the `Select all (N)` label. Combos are selected one card at a time via the per-card checkbox; the bulk strategy and bulk delete controls only appear when something is selected, next to the current count.

# v0.5.122-Custom (2026-09-27)

## Changes
- **Custom Domain endpoint removed**: the Custom Domain option on the API Endpoint card is gone along with its enable, edit and disable dialogs, the `customDomainEnabled` and `customDomainUrl` settings, and the branch in the base-URL picker that produced its `/v1` URL. Local, Cloudflare Tunnel and Tailscale remain, and a stored custom domain left over in an old settings blob is ignored rather than read.
- **Cheapest combo strategy removed**: the "Cheapest" strategy that ordered combo members by a free/cheap heuristic is gone from the rotation logic and from the combos page help text. Round Robin, Fallback and Fusion remain.

## Fixes & Enhancements
- **Sub-key model scope enforced server-side**: a sub-key created with a wildcard allowed-models field used to bypass the parent key's model scope entirely, so a key restricted to a single model could create a child with access to every model. The create and edit key endpoints now clamp a wildcard or empty request to the creator's own allowed-models list, while explicit lists are still filtered by the same exact, prefix-star and suffix-star matching the LLM gate uses.
- **Tool calling restored for all models**: the Claude translator's tool filter dropped any tool whose `type` was not `function` or in the provider whitelist, which discarded tools carrying a function payload under a newer API's `type` (e.g. Responses "custom"). The filter now keeps any tool that has a function payload, so tool definitions reach the provider and `capabilities.tools` reports true again. Combo capability auto-switch now also treats `tools` as a hard capability and floats tool-capable models to the front when a request carries tools.

# v0.5.121-Custom (2026-09-26)

## Changes
- **The large provider batch is withdrawn**: the set that added 304+ providers on top of this fork is gone again. Around 240 registry entries, 48 executors and the supporting services and utilities that only existed for them were removed, and the two that stayed in the tree are now unreferenced. The providers this fork had before that batch are untouched, so OpenCode Zen, CodeBuddy Intl, Qoder CN, Devin CLI, Grok CLI, DeepSeek Web, Gemini Web and Kimi Web all still work exactly as before.
- **Alias resolution stays**: the indirection that maps a registry id, an alias and every secondary alias onto one provider key is kept, because the model lookup helpers read through it and the entries that remain use it.
- **The capture buttons stay**: the API key form, the cookie capture button and the Felo capture button are untouched, so adding a key for any remaining provider behaves as it did.

# v0.5.120-Custom (2026-09-26)

## Fixes & Enhancements
- **The image builds on Railway again**: the dependency install used a cache mount, and Railway's builder wants the id to carry a key it generates per service. The documented form of that key is rejected too, so the mount only ever broke the build, and the first version of the fix, which named the cache, was refused for the same reason. The mount is gone now and the build relies on the layer cache, which already covers the common case because package.json is copied on its own, so an unchanged manifest never reinstalls anything. The syntax line went with it, so the build no longer needs to pull a Dockerfile frontend before it can start.
- **The build no longer stops on missing modules**: bringing in the large provider set left a few files behind. The capture metadata and the debug-browser warning were imported by the provider key form and by the two capture buttons, and the canonical-attempt trio was imported by the request semantics, the forced and non-streaming adapters and the request-detail status map, so none of those could be compiled. All five are here now, which means the cookie capture buttons, the Felo capture button and the request-detail status column behave as they were written to.
- **Z.ai no longer needs a browser driver to load**: its browser transport imported playwright at module level, so an install without it failed to compile even for the signed API path that never touches a browser. The driver is now resolved the first time the browser is actually launched, the same way the TLS impersonation client already handles its optional native dependency, and the package is an optional dependency so a host that cannot install it is not blocked. When it is missing, the error says what to install instead of surfacing as a module resolution failure.

# v0.5.119-Custom (2026-09-26)

## Changes
- **Removed the Uncensored Output plugin**: the plugin, its runtime prompt injection, its API keys, its default settings entry, its capability badge and its card on the Custom Plugins page are gone. A configuration that still carries the old entry is simply ignored, and no model loses a badge it no longer has. The remaining plugins are Image Vision, Think Deeper and Speed Mode.

## Fixes & Enhancements
- **Update banner that actually fires on a deployed instance**: the old check only asked git how far behind the checkout was, and a deploy that ships without git history (a container or a platform build) has no revision to ask about, so it reported "no update" forever. The build now stamps its own revision and release into the bundle, and the check runs a second signal that compares the newest changelog entry on the repository with the release this build came from, so an image without git still learns that a newer release exists.
- **A dismissible banner across the dashboard**: a banner appears under the header when an update exists, naming the release, saying how far behind the install is, previewing the first notes of the new release, and offering the update command to copy plus a link to the repository. It rechecks every ten minutes, and closing it hides that release only, so the next one shows up again.
- **The changelog URL pointed at the wrong repository**: it read the upstream changelog while everything else in the app points at this fork, so a release note shown to the user could describe changes that were never shipped here.
- **Post-login dialog no longer repeats the update notice**: it used to print a commit count that could be unknown, and the update has a home of its own now.

# v0.5.118-Custom (2026-09-26)

## Changes
- **Dropped Union Alpha from OpenCode Free**: `oc/union-alpha` and `oc/union-alpha-free` are removed from the OpenCode Free registry, so they no longer appear in the model picker, the suggested list or `/v1/models`. They were the only free models served over the Anthropic Messages endpoint, so that routing branch, its model set and the `anthropic-version` header it added are gone as well; every remaining free model goes to chat/completions or to the Responses API. OpenCode Zen keeps its own `union-alpha` model, which is a separate provider and still works.

# v0.5.117-Custom (2026-09-26)

## Fixes & Enhancements
- **Combo context window follows the largest member**: a combo of a 1M model and a 256k model used to publish 256k, so clients compacted a conversation far earlier than any member needed. A combo fails over between models instead of splitting one conversation, so the window it advertises now follows the largest member, same as max output already did. The two places that aggregated combos disagreed with each other (one took the smallest window and the smallest output, the other the smallest window and the largest output), so both now share one aggregator and a combo reports the same window in every place.
- **Custom context per combo**: create and edit combo have a Context Window switch with Auto and Custom. Auto follows the largest member and says what that is right now, Custom takes a token count that wins over the automatic value. Stored in a new `contextWindow` column, where 0 means auto, and marked with a custom badge on the combo card.
- **Every model shows its real window**: each row in the combo form and each chip in the model picker now carry the model's context (1.0M, 256k), so a 1M model is never picked as if it were a small one. The combo card shows the window and output of each of its members next to the badges.
- **Combos report context_length**: `/v1/models` published a combo's window only inside a nested block, so a client reading the usual `context_length` field found nothing and guessed from the name. Combos now also publish `context_length` and `max_completion_tokens` at the top level, like single models.
- **OpenCode and other credential-free providers are listed again**: `/v1/models` built its list from provider connections only, and a provider that needs no key never owns a connection, so its models were listed only while the whole provider table was empty. As soon as one provider was connected, every model of OpenCode Free and the other no-key providers disappeared from the listing, even though requests to them worked. They are now always listed, and a client that reads `/v1/models` to build its model picker sees them.

# v0.5.116-Custom (2026-09-26)

## Custom Features & Enhancements
- **Per API key permissions**: the Create and Edit API key forms now carry a Permissions box with four separate rights: create, edit and delete API keys, create, edit and delete models, create, edit and delete providers, and view usage. Each key stores its own set, and the sidebar, the pages and the endpoints all follow it. A password sign-in is still a full administrator.
- **Sign in with an API key**: the login page has an API Key Login tab next to Password Login. The key is verified like any LLM request, so a disabled, expired, quota-exceeded or IP-blocked key is refused with its own message. The session that results shows only the menus the key is allowed to open, and the Endpoint page hides the tunnel, Tailscale and require-API-key controls so no button can fail.
- **Usage scoped to the signed in key**: stats, chart, leaderboard, error list, history, the CSV export and the live stream all filter on the key that authenticated, so a key user reads its own numbers and never another key's. The per-key usage page shows the same single card.
- **Nested keys stay inside the parent's scope**: a key that only has view usage cannot hand out model, provider or key rights to a new key, the permissions it does not hold are hidden and disabled in the form, its token limit caps the limit of every key it creates, and its allowed-model list is the only list the model picker offers, with the same exact, prefix-star and suffix-star matching the server applies to LLM requests.
- **Enforced on the server, not only in the menu**: a key-signed session is refused with 403 on any endpoint its permissions do not cover, including settings, tunnel, OAuth, cloud, translator, CLI tools and MCP routes, and on any dashboard page outside its rights. Reading the model catalog stays open to a provider manager because the providers page needs it to render a connection, while every model write stays on the model right. A key with no right at all lands on a short notice with a sign out button instead of a redirect loop.

# v0.5.115-Custom (2026-09-26)

## Custom Features & Enhancements
- **304+ Providers Integration**: Merged the massive provider library from ExtremeRouter. Added over 200+ API-key providers, 25 OAuth providers, and 39 Web-cookie providers (including Qwen Web, Claude Web, ChatGPT Web, Grok Web, Notion AI, HyperAgent, Conol, DouBao, Adapta, and more) into 9Router.
- **Provider Capabilities & Prices**: Fully synchronized model metadata, token limits, capabilities, tool-calling flags, and token cost pricing with ExtremeRouter's definitions.
- **Frontend Modals & UI**: Updated Add API Key modal to automatically suggest specific cookie capturing instructions for new Web-cookie providers. Added `FeloCaptureButton` and `CookieCaptureButton` helper components. 
- **Preserved 9Router-specific Providers**: Kept exclusive 9Router providers and aliases intact (like OpenCode Zen, CodeBuddy Intl, Qoder CN, Devin CLI, Grok CLI, DeepSeek Web Tool Bridge).

# v0.5.114-Custom (2026-09-25)

## Fixes & Enhancements
- **Usage calculation accuracy for Today and 24h periods**: fixed an issue where selecting Today or 24h incorrectly overlaid up to 60 days of historical daily aggregates onto the current stats, causing token counts to jump from 1M to over 1B. Historical daily data before the cutoff date is no longer added into Today and 24h metrics.
- **Model Leaderboard period filter**: fixed Leaderboard route ignoring Today and All Time filters and defaulting to 7 days.
- **Real-time Usage sync**: SSE `/api/usage/stream` now accepts the active period parameter and streams complete stats updates when requests finish. The frontend Usage overview cards, charts, and breakdown tables now automatically update in real-time without requiring a page reload.

# v0.5.113-Custom (2026-09-23)

## Custom Features & Enhancements
- **Gemini Web (Cookie) provider**: added `gemini-web` under Web Cookie Providers, next to the existing DeepSeek entry. Paste `__Secure-1PSID` (plus `__Secure-1PSIDTS`) from gemini.google.com cookies; the cookie is verified against the live session page before saving. Requests run over plain HTTP to the internal StreamGenerate endpoint, no browser needed, with multi-turn history folded into one prompt.
- **Kimi Web (Cookie) provider**: added `kimi-web` under Web Cookie Providers. Paste `access_token` from www.kimi.ai localStorage; validation probes the account endpoint before saving. Requests speak the Connect-RPC chat protocol with automatic refresh_token exchange on 401, reasoning deltas surfaced as `reasoning_content`, and models Kimi K3 plus Kimi K2.6.
- **Web RAG backends stay honest about tools**: both new cookie providers reject OpenAI function tools with a clear 400 instead of answering empty, since the web backends are text-only endpoints with no native tool channel.

# v0.5.112-Custom (2026-09-23)

## Sync with upstream v0.5.86
- **Merged upstream through v0.5.86 (2026-09-23)**: Xiaomi MiMo server-assisted desktop login with five account clusters and v2.6 models, Claude Opus 5.5 support, and proxy pool header forwarding fix.
- **Kept fork behaviour**: Union Alpha routing over Messages API, one-click auto backup scheduler, Speed Mode plugin, per-key usage page, plugin badges on Custom Models and combos, 9Router Settings label, and the fork README. The OpenCode free-tier fix is carried by upstream's `opencodeFingerprint` helper, with `union-alpha-free` kept alongside it.

# v0.5.111-Custom (2026-09-22)

## Sync with upstream v0.5.85
- **Merged upstream through v0.5.85 (2026-09-22)**: OpenCode Zen provider with free-tier fingerprint, Jev System One endpoint wired into the sidebar and media providers, Qoder CN provider, Cursor/Claude combo presets with bulk operations, analytics Requests mode with provider/model breakdown charts, All Time usage period, capability metadata on `/v1/models`, and all upstream fixes (Claude refusal mapping, Antigravity quotas, Qoder replay guard, Hugging Face router migration, multi-platform Docker).
- **Kept fork behaviour**: Union Alpha routing over Messages API, one-click auto backup scheduler, Speed Mode plugin, per-key usage page, plugin badges on Custom Models and combos, 9Router Settings label, and the fork README. The OpenCode free-tier fix is now carried by upstream's `opencodeFingerprint` helper instead of the fork's local cloak, with `union-alpha-free` kept alongside it.

# v0.5.110-Custom (2026-09-20)

## Custom Features & Enhancements
- **API Key Usage page**: a new dashboard page under Usage that shows one card per generated key. Each card carries a quota progress bar (used versus limit, amber past 80 percent, red when exhausted), the next reset time computed from the key's interval and anchor, request, token and cost totals aggregated from the usage history, the error rate, rate-limit settings, expiry state, and an expandable per-model breakdown of the key's most used models. An auto-refresh toggle re-polls every ten seconds, and usage left behind by deleted keys is grouped into a single "Deleted keys" card so history is never lost.

# v0.5.109-Custom (2026-09-20)

## Fixes
- **Plugin badges on Custom Models and Combos**: the Custom Plugins badges (Image Vision, Think Deeper, Speed Mode, Uncensored Output) only ever resolved against plain provider models, so a plugin applied to a Custom Model, a custom-provider import, or a combo showed its badge nowhere. The models endpoint now emits capability entries for Custom Models (inherited from their target plus the plugin badges matched against the studio name or the model it calls) and for combos (boolean capabilities OR-ed across members, context/output floors taken from the smallest member). The model picker and capability hook resolve those entries by callable name, and the picker now renders the same badges on Custom Model and combo chips that it already showed on regular models.

# v0.5.108-Custom (2026-09-20)

## Fixes
- **Automatic Backup actually fires**: the scheduler previously only armed through the deferred app bootstrap, so on a restarted server the timer could stay dead until the settings page was opened; the HTTP server wrapper now arms it at boot and the config endpoint wakes it on demand as a second safety net, so a pending schedule can never silently disappear.
- **Import Backup no longer resets the schedule**: restoring a backup without an autoBackup section (old or partial exports) kept wiping the stored config and status, which disabled backups on its own. The autoBackup scope is now only touched when the imported file actually carries it, and the import handler re-arms the scheduler against the freshly stored config afterwards.
- **Honest next-run countdown**: with the scheduler idle the endpoint clamped the due time to "now", which rendered a stuck 00:00 countdown. It now reports the real scheduled time even when the run is overdue, and the woken scheduler takes over the countdown from there.

# v0.5.107-Custom (2026-09-20)

## Custom Features & Enhancements
- **Automatic Backup restored**: brought back the scheduled backup feature with its full settings dialog on the 9Router Settings page. Configure a Telegram bot (bot token plus numeric owner chat id) or a GitHub token and repository, pick an interval (24 hours, 7 days, 30 days, or custom), then save. The scheduler sends the backup file automatically on the chosen interval, a live countdown shows when the next backup fires, and Send Test Backup runs a one-off backup through the password dialog. The export/import plumbing was re-integrated on top of the current selective backup system: Automatic Backup now exports all sections, and old partial or full backups remain fully import-compatible.

# v0.5.106-Custom (2026-09-19)

## Custom Features & Enhancements
- **New plugin: Speed Mode**: a fourth Custom Plugin that makes selected models answer instantly instead of reasoning. It injects a direct-answer system instruction and forces a thinking "none" intent, which the unified thinking pipeline converts into each provider's native disable format (OpenAI `reasoning_effort`, Claude `thinking: disabled`, Gemini budget 0, Qwen `enable_thinking: false`, and so on). Claude-native requests set the disable flag in the Anthropic shape so native passthrough never sends an unknown field. Selected models get a cyan bolt badge in the model lists and the plugin picker, managed exactly like the existing plugins on the Custom Plugins page.

# v0.5.105-Custom (2026-09-19)

## Fixes
- **GitHub link label visible on mobile**: the header "Visit On GitHub" text was hidden behind a responsive `hidden sm:inline` class and showed only the logo on small screens; the label now always renders next to the icon.

# v0.5.104-Custom (2026-09-19)

## Custom Features & Enhancements
- **Simplify backup section picker**: removed the "Select All" and "Lightweight Only" quick actions from the Download Backup dialog; sections are now picked with the individual checkboxes only.

# v0.5.103-Custom (2026-09-19)

## Fixes
- **OpenCode free tier: stop 403 FreeTierError on tool-carrying agent requests**: the free tier fingerprints the official agentic client inside the request body. The `/zen/v1/responses` gate now requires the `bash` + `read` tool decoys plus `tool_choice: "auto"` on every request (previously they were only injected when the payload had no tools at all, so any real agent call carrying 1..N tools went out naked and received 403), and the `/zen/v1/chat/completions` gate requires the full `bash`, `glob`, `grep`, `read` quartet, which is now appended whenever any of the four is missing. External client tools are preserved verbatim and only missing fingerprint names are added as no-op declarations. `muse-spark-1.2-contributor-free` is added to the force-auto tool choice quirk alongside 1.3 since both free models reject non-auto choices with 400.

# v0.5.102-Custom (2026-09-19)

## Custom Features & Enhancements
- **DeepSeek Web tool calling support**: the cookie-based DeepSeek Web provider now supports OpenAI tool calling. Because the web backend is a text-only RAG endpoint, the executor encodes the requested tools as a protocol inside the prompt, converts previous assistant tool_calls and tool result messages into readable transcript turns, and parses the model's reply back into standard OpenAI `tool_calls` deltas with `finish_reason: "tool_calls"` for both streaming and non-streaming requests. Requests without tools follow the original flow unchanged.

## Fixes
- **Usage visible after backup import**: the Usage Overview Today and 24h views now merge the daily aggregates that shipped inside the backup (for days before today) with live request history, so restored usage is no longer hidden behind an empty default period. Verified with a real export-import roundtrip: restored rows show up in today, 24h and 7d views, while live-only data is never double counted.

# v0.5.101-Custom (2026-09-19)

## Custom Features & Enhancements
- **Remove 9Remote & 9English menus**: dropped the 9Remote promo entry, the 9English external link, and their unused modal components from the sidebar to keep navigation focused on router tools.

# v0.5.100-Custom (2026-09-19)

## Fixes
- **Modal header polish**: the "Welcome to 9Router!" title no longer hugs the left edge of the dialog and now sits vertically centered on the same line as the close button. Applied to all dialogs, including the Download Backup header.
- **Smaller "Heavy" badge**: the Heavy tag in the Download Backup section list now renders in the compact badge size instead of falling back to the large default.

# v0.5.99-Custom (2026-09-18)

## Custom Features & Enhancements
- **DeepSeek Web (Cookie) Provider**: added `deepseek-web` under the Web Cookie Providers category (positioned between Free Tier and API Key providers). Supports web session token auth (`userToken` from `chat.deepseek.com`), streaming responses, and reasoning content (`<think>`) for models: `deepseek-chat`, `deepseek-reasoner`, `deepseek-v4.1-flash`, `deepseek-v4.1-pro`, `deepseek-v4.1-reasoner`, `deepseek-v3`, and `deepseek-r1`.
- **Remove Automatic Backup**: decommissioned the scheduled automatic background backup feature and modal to keep the app lightweight, retaining the standard manual Download Backup and Import Backup tools.
- **Selective Backup Download**: the Download Backup dialog now lets you pick which sections to include (Settings, Providers, API Keys, Combos, Custom Models, Pricing, Usage History). Each section shows its item count and estimated byte size, and the total selected size updates in realtime. Heavy sections (e.g. Usage History) are unchecked by default. Old full backups remain fully import-compatible.

# v0.5.98-Custom (2026-09-17)

## Fixes
- **Keep original base models visible alongside custom models**: creating a custom studio model no longer hides or overwrites the underlying base model. Both the original target model and the newly created custom model stay fully visible in model pickers, provider details, and `/v1/models`.

# v0.5.97-Custom (2026-09-17)

## Fixes
- **Fix OpenCode Free Tier 403 FreeTierError**: resolved `"OpenCode's free tier can only be used from within OpenCode"` by tailoring request headers with `User-Agent: opencode/1.18.30`, `anthropic-version: 2023-06-01`, and conforming 30-character OpenCode session and request identifiers (`ses_*`, `msg_*`).
- **Add Union Alpha & Union Alpha Free support**: added `union-alpha` and `union-alpha-free` to OpenCode's registry with targetFormat `claude` (routed directly to `/zen/v1/messages`), configured vision and reasoning capabilities, and added it to suggested models.

# v0.5.96-Custom (2026-09-17)

## Custom Features & Enhancements
- **Uncensored Output Plugin Updates**: renamed the third plugin to *Uncensored Output* and updated its icon to an emerald/red key off (`key_off`) badge. Added fallback model matching across requested, routed, and full model identifiers so plugin directives reliably inject into System prompts.
- **Header "Visit On GitHub" Button**: enhanced the GitHub repository link button in the top right header to display a clear "Visit On GitHub" text label next to the GitHub logo.
- **Sidebar & UI Polish**: renamed "Custom Models & Editor" to "Custom Models", updated the "Custom Plugins" icon to `widgets`, renamed "Settings" to "9Router Settings", and cleaned up top traffic-light decorative dots.
- **Custom Provider & Studio Target Picker Fix**: custom providers now stay visible in model selectors even when their underlying base models are mapped to studio custom model names. Upgraded logo data URL storage capacity and added JPEG compression fallback so custom provider logos never vanish.

# v0.5.95-Custom (2026-09-17)

## Custom Features & Enhancements
- **Direct Override (Unrestricted) Plugin**: added a third custom plugin featuring an open padlock icon (`lock_open`). When attached to selected models, it injects an anti-refusal system directive and technical framing, minimizing standard canned AI refusals for pentesting, code security, and raw technical queries. Enables the `lock_open` badge for selected models.

# v0.5.94-Custom (2026-09-17)

## Custom Features & Enhancements
- **Custom Plugins menu under FEATURE+**: added `/dashboard/plugins` featuring two modular plugins:
  - **Image Vision**: extracts text and visual content from images for models that don't natively support vision, making non-vision LLMs able to read image inputs from CLI tools and agents. Enables the Vision (👁️) badge for selected models.
  - **Think Deeper**: forces deep step-by-step chain-of-thought reasoning before outputting final answers. Enables the Reasoning (🧠) and Think Deeper (💡/psychology) capability badges for selected models.
- **Model selector integration**: users explicitly choose which models to attach plugins to via `ModelSelectModal`.

# v0.5.93-Custom (2026-09-16)

## Custom Features & Enhancements
- **Top-positioned logo in provider creation/edit dialogs**: the custom provider Logo upload field is moved to the very top before the Name field across custom compatible and embedding forms.
- **Edit custom provider logo**: the edit modal for compatible nodes now includes the logo picker and saves logo updates directly.
- **Provider logo display on Usage**: custom compatible nodes without custom logos now cleanly fallback to their parent provider image (e.g. OpenAI / Anthropic icons) instead of displaying abbreviation text badges like "OP".

# v0.5.92-Custom (2026-09-16)

## Fixes
- **Fix LAN/Docker default login password**: trusted-peer auth now falls back correctly for local and container deployments.
- **Fix usage errors page always showing 0**: error tracking counts are now persisted and read back properly.

## Custom Features & Enhancements
- **Add backend GitHub update detection with commits behind**: the version API now compares the local checkout against the upstream branch and reports how many commits behind, the latest commit message, and a tailored install command.
- **Add Welcome Modal with star request and update info**: a post-login modal invites users to star the GitHub repo and, when an update is available, shows the commit count, message, and a copyable install command. Dismissible per-session or permanently.
- **Hide Skills menu from Sidebar**: the Skills navigation item is removed from the System section.

# v0.5.91-Custom (2026-09-16)

## Custom Features & Enhancements
- **A custom (studio) model now hides the model behind it**: the moment a base model gets a studio name, that base model disappears from every place a client or a picker reads — `GET /v1/models` and its per-kind variants answer with the studio name only, the model pickers (API key allowed models, combos, CLI tool mappings, arena) offer the studio name only, and the provider page Models tab lists the studio name only. So with `qwen-3.8` pointed at `neko/qwen3.8-flash`, nothing shows `neko/qwen3.8-flash` anymore. The raw model is still routable and the Model Studio editor still sees it, because that is exactly where you pick the model a new name should call. The rule is shared in one helper (`buildStudioTargetIndex`) keyed by provider id plus model id, case-insensitive, so the same model name under another provider stays visible.

## Fixes
- **The x on an allowed-model chip now removes that model**: in the API key forms the chips called a handler that branched on which picker modal was last opened, so with a freshly opened form (or before ever pressing Select Models) clicking x did nothing. Removing and adding models now state plainly which field they edit, and the chip lists in both the create-key and edit-key forms work on their own.

# v0.5.90-Custom (2026-09-16)

## Custom Features & Enhancements
- **Custom providers can carry their own logo**: the Add and Edit dialogs of every custom node type (OpenAI compatible, Anthropic compatible, MoonshotAI compatible, custom embedding) gained an optional **Logo** field. Pick any PNG, JPEG, WebP or GIF up to 2 MB and the browser crops it to a square, scales it down and stores a few kilobytes on the node; leave it empty (or press Remove) and the familiar default brand icon stays exactly where it was. The chosen logo shows on the provider card, the provider detail header, the media provider list and header, and on Usage in the provider map beside the traffic animation. Because it lives inside the node record, it also travels with Download/Import Backup and the automatic Telegram or GitHub backup.
- **Logo values are checked on the way in**: the API accepts a logo only as a compact image data URL (no SVG, no remote URL, no oversized payload) and answers with a plain message otherwise, while the picker refuses unreadable files before anything is saved. An update that omits the field leaves the stored logo alone; sending an empty one clears it.

# v0.5.89-Custom (2026-09-16)

## Fixes
- **Automatic backups now really go out**: the scheduler tick used to hold the same in-flight lock that the send function checks, so every scheduled run rejected itself with "A backup is already being sent" and only retried 30 minutes later, forever. The tick now just decides when a run is due and hands the send over; a regression case drives a due tick against a stubbed Telegram API and asserts one upload actually leaves the process (it fails on the old code, passes on the new one).

## Custom Features & Enhancements
- **A live countdown tells you when the next backup lands**: under the Automatic Backup button, and again inside the dialog with the exact date, a timer now ticks every second ("Next backup in 23:59:05") against the real schedule instead of a guess. The API answers with the next run taken from the running scheduler, falling back to the stored last-send stamp plus interval, and the page re-reads it the moment the countdown reaches zero. Typed bot or GitHub tokens survive that refresh.

## Improvements
- **Automatic-backup code nesting fixed**: the service, the config repo and the settings route now use the same two-space-per-level indentation as the rest of `src`, and the startup wiring sits flush with the schedulers next to it. The confirm-password dialog no longer claims the file goes to Telegram when the GitHub channel is selected.

# v0.5.88-Custom (2026-09-14)

## Improvements
- **The Telegram owner id is now strictly numeric**: the Automatic Backup dialog only accepts digits (non-digits are filtered out while typing, the server rejects anything else with a clear message), since bot sends require the numeric owner id and the "@username" style hint was misleading.
- **UI copy cleaned of decorative dashes**: status, hint and placeholder strings across the Automatic Backup dialog now use plain punctuation, and the few misaligned indent lines the previous feature commits introduced in the profile page were normalized to the file's existing style.

# v0.5.87-Custom (2026-09-14)

## Custom Features & Enhancements
- **Automatic Backup moved into its own dialog and learned GitHub**: instead of a full card on the settings page, a single **Automatic Backup** button now sits right above Download Backup — it opens a modal where you pick the channel (Telegram bot or GitHub repository with a write-scoped token, committing to `9router-backups/` plus a `latest.json` pointer on a chosen branch), set the interval, then press **Save Configuration** to store everything and arm the schedule in one click; **Send Test Backup** delivers one backup immediately (password-confirmed) so the whole path can be verified on the spot. Both bot and GitHub tokens are now encrypted at rest with a machine-bound key, so no plaintext credential is ever written to the database or echoed back to the browser.

# v0.5.86-Custom (2026-09-14)

## Custom Features & Enhancements
- **Backups now deliver themselves to Telegram**: a new Auto Backup (Telegram) card sits above Download Backup in the profile page — set a bot token and owner chat id, pick the interval (every 24 hours, 7 days, 30 days, or custom hours), and the scheduler exports the exact same database backup the manual button downloads and sends it to your chat as a `9router-backup-*.json` file, importable with Import Backup unchanged. The token is stored write-only (never echoed back to the browser, kept out of the settings blob), the schedule survives restarts through the persisted last-sent stamp, sends follow the outbound proxy, oversized backups beyond the bot's upload cap are refused with a clear status instead of a silent stall, and a Send Test Backup button (password-confirmed like the other backup actions) verifies the whole path on demand. The configuration also travels inside every backup, so a restored instance resumes sending on its own schedule.

# v0.5.85-Custom (2026-09-13)

## Custom Features & Enhancements
- **A key's allowed models now also decide what it can see**: `GET /v1/models` (and `/v1/models/{kind}`, `/v1/models/{provider}/{model}`) answers through the same patterns the request gate uses, so a key limited to `claude-fable-5.1` lists exactly that one model instead of advertising names it would refuse with `403`.

## Fixes
- **Two custom models on the same base model stop trading places**: older builds stored a display alias for every Model Studio name, and with two names aimed at one target the alias lookup answered whichever matched first — so calling `gpt-5.6-sol` could show up as `claude-haiku-5`, or as the bare base model. Studio names are now cleaned of any leftover alias, whatever value it held, and an alias that carries a studio name can no longer add a second entry for the same model to the listing.
- **A model name that is not a string is refused instead of crashing**: an array or object in `model` reached SQL as a bound value and died with `Unknown named parameter '0'` inside a 500; it now returns a plain `400 Missing model`.

# v0.5.84-Custom (2026-09-13)

## Fixes
- **A custom model typed with its provider prefix now resolves**: a Model Studio target saved as `kr/gpt-oss-120b` was read with a bare parse, which handed the prefix back as the provider, matched no credentials, and left the usage row named after the base model — the target is now resolved the same way any other call is, so the studio name is what answers and what Usage bills, while `resolvedModel` still records the base model beside it.
- **A per-model override may name another provider**: an override whose target carries a prefix is resolved first instead of pasting `prefix/model` onto the current provider, which produced a doubled path upstream.

# v0.5.83-Custom (2026-09-13)

## Improvements
- **The two Workshop tools are named after what they do**: **Compare Models** runs one prompt across models side by side, and **Custom Models & Editor** is where those extra model names live.
- **The changelog is one card per day**: releases that landed on the same date now share a single bordered block, with each version kept as its own sub-heading inside it.

## Fixes
- **The live request panel follows the name you called**: in-flight and streaming requests were tracked under the model the gateway resolved to, so Usage could list `claude-sonnet-5` and `qwen-3.8` at the same moment for one key.
- **Embeddings stopped splitting a custom model into two rows**: its usage record and its failure text named the resolved target, while every other endpoint reported the studio name, which is what made both names pile up in the same leaderboard.

# v0.5.82-Custom (2026-09-13)

## Custom Features & Enhancements
- **A Model Studio name now answers as the model it is**: every outbound payload — non-streaming completions, streamed chunks, Claude `message_start`, Responses events and semantic-cache hits — reports the name the caller spoke, so `claude-opus-5` never answers `qwen3.8-flash` while the console, the request detail and the usage `resolvedModel` still record the real target for debugging.
- **Failure text keeps the route private too**: the "all accounts unavailable" and "no credentials" replies name the model that was called instead of printing the provider connection id and the model behind it.
- **Every API key has an on/off switch**: the toggle sits on the left of each key row, is stored through the existing key update endpoint, and a switched-off key is refused with `403 API key is disabled` on chat, embeddings, images, video, speech, transcription, search and web fetch — including while the gateway runs without required keys.
- **FEATURE+ is the section title again** for the tools this fork adds, with Model Battle Arena and Custom Model Editor inside it.

## Fixes
- **Per-key limits now apply to every endpoint**: chat compared the validator's reason strings one by one while the other endpoints only checked them for truthiness, so an over-quota, expired or model-restricted key could still generate images, embeddings, speech and searches.
- **A switched-off key can no longer be traded for remote access**: the edge guard accepted any non-false validation result, so the document writer's and battle arena's reason strings unlocked `/v1/*`.

## Removals
- **PRD Document Writer is gone**: its page, prompt library, checklist reader and saved drafts are deleted, and a migration prunes the drafts an install already has so the database stays clean.
- **Provider Health is gone**: the board page and its snapshot reader are deleted, while `GET /api/health` stays exactly the anonymous `{"ok":true}` liveness probe that tunnels and uptime checkers ping.

# v0.5.80-Custom (2026-09-13)

## Improvements
- **Workshop menu names now say what the tool does**: the three custom tools are **Model Battle Arena**, **Custom Model Editor** and **PRD Document Writer** in the sidebar, in each page header and in the model picker group, so nothing has to be guessed from a one-word nickname.
- **Icons finally respect their own size**: the Material Symbols defaults were an unlayered vendor stylesheet, so every icon rendered at a fixed 24px no matter what was written on it — they now live in Tailwind's base layer and the icon font is declared in `globals.css`, so a `text-[14px]` icon is 14px.
- **Icon and label share one centre line**: each sidebar and page-title icon is a fixed square flex box that a long label can no longer squash, which is what made rows look crooked.
- **Model picker group renamed**: the studio group in the model picker is **Custom Models** and its chips carry a `custom` tag instead of the old tool name.

# v0.5.79-Custom (2026-09-12)

## Fixes
- **A provider that answers JSON when we asked for a stream no longer hangs**: the gateway now reads the response content-type and either replays the completion as live SSE for a streaming client or serves the normal JSON path, so the answer arrives and tokens are billed.
- **Unreadable upstream bodies fail loudly**: a body that is neither a stream nor valid JSON now returns a clean gateway error instead of a 200 response with nothing in it.
- **Event-stream bodies are parsed whatever they contain**: a plain JSON document wearing an SSE label, NDJSON rows, Claude Messages events and Responses-API events all decode into a real answer instead of `Invalid SSE response for non-streaming request`.
- **NDJSON providers work while streaming too**: lines that arrive without a `data:` prefix are now read as frames instead of being dropped, so those upstreams no longer look like an empty model.
- **A transport quirk no longer grounds an account**: response-shape errors are classified as `lock: false`, so a provider that answers in the wrong format can no longer put a working credential behind a "(reset after 30s)" cooldown.
- **Studio names stay separate in Usage**: two Forge names pointing at one model now each keep their own row and stats bucket, because the calls that used to produce no usage record at all are producing one.

# v0.5.78-Custom (2026-09-12)

## Fixes
- **Showdown streams live**: every contender now paints its answer token by token with a ticking elapsed timer, so a slow model reads as "still working" instead of a frozen spinner with no feedback.
- **One streaming client for both tools**: Showdown and the PRD Writer now talk to the gateway through the same `streamChatCompletion` helper, so reasoning deltas, usage capture and readable error parsing behave identically on both pages.

## Custom Features & Enhancements
- **Time-to-first-token is measured**: each battle card reports first token, total time, tokens and cost, and the result table gains a First token column with its own badge.
- **Battles can be stopped**: the run button turns into Stop while anything is in flight, and a cancelled card keeps its partial answer labelled as stopped instead of showing a red failure.

# v0.5.77-Custom (2026-09-12)

## Fixes
- **A rejected request no longer grounds an account**: 400, 406 and 422 from a provider are now classified as caller mistakes, so they surface immediately instead of cooling the credential for 30 seconds and dragging every other account through the same failure.

## Custom Features & Enhancements
- **PRD Writer document profiles**: four new profiles — RFC / Tech Spec, Release Notes, Competitive Analysis and Bug Report → Fix Plan — each with its own section outline built from 25 freshly written section briefs.
- **PRD task list**: one button turns a finished PRD into an ordered `- [ ]` checklist, either parsed straight from the plan section (dependency order, owners, estimates, follow-ups) or extracted by the model when the plan is prose, with copy and `.md` download.
- **Provider Health board**: a new page that rolls the request log into per-account and per-model success rate, p50/p95 latency, spend, last error and a live cooldown countdown, with test-now and pause/resume wired to the existing endpoints.
- **Provider Health stays private**: the bare `GET /api/health` probe still answers `{"ok":true}` for tunnels and uptime checks, while `?window=` board data requires a dashboard session and never leaves request or response bodies on the server.
- **Provider Health explains itself**: the board says when request logging is switched off in Settings instead of showing a page full of zeros.

# v0.5.76-Custom (2026-09-12)

## Fixes
- **Showdown shows real outcomes**: a model that answers with HTTP 200 but no text is now labelled `empty` with the reason why, instead of dumping raw JSON into the result card.
- **Showdown errors are readable**: provider failures show one short line plus HTTP status, cooldown and route chips, with the untouched payload behind "Show the raw error".
- **Silent models can no longer win**: awards and the top ranking ignore answers that produced nothing, so an empty response can't be declared the fastest.
- **PRD Writer errors formatted**: generation failures surface the parsed provider message with a collapsible raw detail, and a completion that returns nothing is reported as empty instead of leaving a blank document.

# v0.5.75-Custom (2026-09-12)

## Custom Features & Enhancements
- **PRD Writer**: a workshop tool that turns a short brief into a full, reviewable product requirements document, and it will not generate until you have picked the model that writes it.
- **PRD controls**: choose the document profile, depth, language, output-token cap and the exact sections to write, then watch the document stream in live.
- **PRD review pass**: an optional second model red-teams the draft, lists up to 12 defects, and rewrites the whole document with the missing sections filled in.
- **PRD proof and storage**: a section checklist reports which required headings actually arrived, and every document can be saved, reopened, copied, downloaded as `.md`, or inspected through the exact prompt that produced it.
- **Workshop menu names**: the custom-tools group is now the single word **Workshop**, and its tools no longer share the word "Model" — **Showdown** (was Model Battle) and **Forge** (was Model Studio).
- **Distinct menu icons**: Console Log now uses a monitor icon and its log card a list icon, so it no longer looks identical to CLI Tools.

# v0.5.74-Custom (2026-09-11)

## Fixes
- **Model Studio no longer renames the original model**: a studio name is now resolved through its own record instead of writing a display alias, so `claude-fable-5` appears as an added entry while `custom1/claude-sonnet-5` keeps its own name in every picker.
- **Legacy studio aliases cleaned up**: display aliases left behind by older builds for studio names are deleted the first time the studio list loads, so previously renamed models reappear under their real name.
- **Usage shows the called studio name everywhere**: the name you call (e.g. `claude-fable-5`) is now recorded as the request's model across Overview, Leaderboard, Logs and Details, with the real backend model kept only as muted `→ provider/model` text and cost still priced from it.

## Custom Features & Enhancements
- **MoonshotAI logo is reliable**: compatible nodes created from the MoonshotAI button are tagged with a brand, and that tag (not just the name) now picks the `moonshot-ai.png` logo on cards, the detail page, and its colors.

# v0.5.73-Custom (2026-09-11)

## Fixes
- **Model Studio page crash**: the per-card copy button now uses the shared copy hook, so a saved model no longer throws the client-side `ReferenceError` that showed "This page couldn't load".
- **Model Battle data load**: the missing API-key and Model Studio fetch is restored, so a key is pre-selected and virtual (studio) names are priced by their real target model.
- **Sub-cent battle costs**: costs now show enough digits (e.g. `$0.0034`) instead of every row reading `$0.00`, so the cheapest badge means something.
- **Backup round trip**: exports now carry `disabledModels`, and import clears the stale request log in the same transaction while keeping usage history in its original order.
- **Duplicate API key names on rename**: renaming an existing key to a name already in use is now rejected (HTTP 409) with the reason shown in the UI, matching how key creation behaves.

## Custom Features & Enhancements
- **No password nagging**: the tunnel/endpoint page no longer warns about the default dashboard password or blocks activation over it — the tunnel turns on as-is.
- **Models are picked, never typed**: the allowed-models field in the API key dialogs is read-only; models come from the picker only (chips + Select Models), so a typo can no longer lock a key out of a model.
- **Changelog works offline**: a local `/api/changelog` route serves this fork's changelog from disk, falling back to raw GitHub only for what it cannot resolve; the custom section is labelled **Contributed by Serenhope**.
- **CLI default password**: the terminal settings menu now reports `seren123` as the default dashboard password instead of the old upstream value.
- **UI polish**: long sidebar labels, provider/model ids, tool titles, badges and the header search now ellipsize instead of pushing buttons out of place, with the full text available on hover.
- **Sidebar group renamed**: `Model Lab` is now **Custom Suite** — it holds every feature added by this fork, not only the model tools, so future additions have an obvious home.

# v0.5.72-Custom (2026-09-10)

## Custom Features & Enhancements
- **Model Studio (was Model Editor)**: pick any connected model (built-in, custom provider or compatible) and give it your own callable name, display name, context window and injected system prompt, which then resolves in chat, `/v1/models`, and every model picker.
- **Model Battle (was Model Arena)**: Side-by-side comparison now supports up to 4 contenders, estimated cost per run, and a **Final Result** board — fastest / cheapest / longest badges, plus a manual "My pick" so quality is decided by you, not a judge model.
- **Menu Renames**: The `Feature+` group is now **Model Lab** containing **Model Battle** and **Model Studio**.
- **MoonshotAI Logo**: MoonshotAI compatible providers now use the uploaded `moonshot-ai.png` brand image on cards and detail pages.
- **Provider Prefixes**: Kept in Model Studio — one editable prefix per custom provider (`prefix/model-id`).

# v0.5.71-Custom (2026-09-10)

## Custom Features & Enhancements
- **Model Editor**: Edit per-model overrides (rename, target model, context window, system prompt) and manage custom provider prefixes from a dedicated Model Editor page under Feature+.
- **MoonshotAI Provider**: Added MoonshotAI (Kimi) compatible provider option alongside OpenAI/Anthropic compatible providers.
- **Extra Combo Strategies**: New combo routing strategies beyond Fallback / Round Robin / Fusion.
- **Changelog View**: Combined changelog modal — custom contributions shown in a highlighted "Contributed by Seren" section above the official Decolua release notes.
- **UI Cleanup**: Refined dashboard layout, tidied console log view, and removed the Live Feed page and related controls for a cleaner sidebar.
- **Backup Fix**: Fixed API key settings and usage statistics being reset on backup import (column/placeholder mismatch).

## Fixes
- **API Key Creation Bug**: Fixed `createApiKey` INSERT placeholder mismatch (16 columns vs 15 `?`) that made creating any API key silently fail.
- **API Key Expiry**: Expiry date set during creation is now persisted (was silently dropped).
- **Unique Key Names**: API key names are enforced unique — server rejects duplicates and the client shows a clear message; no overwriting.
- **Duplicate API Key**: Added a Duplicate button per key that copies all settings into a new key with an auto-suggested unique name (`X (copy)`, `X (copy 2)`, …); a fresh key value is generated.

# v0.5.70-Custom (2026-09-07)

## Custom Features & Enhancements
- **API Key Quota & Limits**: Add token limit per API Key with real-time usage tracking and HTTP 429 (`API key token limit exceeded`) response upon quota exhaustion.
- **Dynamic Auto Reset Interval**: periodic usage resets (`5h`, `7d`, `14d`, `30d`, or custom like `10h`) become selectable whenever `tokenLimit > 0`.
- **Model Access Control**: API Keys can be restricted to allowed models with wildcard (`claude-*`, `gpt-*`) or exact matching, returning HTTP 403 on unauthorized calls.
- **Interactive Model Selector**: Integrated `ModelSelectModal` directly into Create & Edit API Key forms, allowing users to pick allowed models visually (same UI as Combo creation) without manual typing.
- **Key Editing & Management**: key names, token limits, reset intervals, and allowed models stay editable anytime, with a manual `restart_alt` button to zero the used tokens.
- **UI & Theme Sync**: the app is locked to dark mode with theme and language switchers removed, and custom select dropdowns now follow the app theme.

# v0.5.91 (2026-09-26)

## Features
- **Providers**: add Token Harbor provider and four OpenAI-compatible aggregator providers (dahl, atria, agnes, bai)
- **Claude**: forward `x-claude-code-session-id` on OAuth requests; merge client `anthropic-beta` flags and forward rate-limit headers; return thinking text to OpenAI-format clients
- **Codex**: add GPT-6 Sol and Luna support
- **CLI Tools**: support multiple model profiles for Codex CLI
- **Hermes**: multi-role model config (delegation + auxiliary slots)
- **OpenCode Go**: complete the Go catalog (40 models) with auto-fetch + family endpoint regex
- **Usage**: show and redeem free limit resets for cc accounts
- **Cline**: expose the `cline-free/*` tier and price it at zero
- **Combos**: display vision adapter models in an ordered table view

## Fixes
- **Claude**: decloak tool names when `toolNameMap` misses (#4342); update spoofed cli version to 2.1.280 to support Opus 5.5
- **Providers API**: make POST `/api/providers` O(1) and refuse silent key overwrite (#4350)
- **Capabilities**: stop caching the catalog source per module copy (#4351)
- **OAuth**: stop Zed paste-token crash and add IDE auto-import (#4359)
- **Dashboard**: resolve combo limits with the server's capabilities (#4360); lazy-load charts and `marked`, preload in background on idle
- **Responses**: carry the streamed output items in `response.completed` (#4307)
- **STT**: dispatch live-API-only Gemini models over the Live WebSocket transport (#4006)
- **Gemini**: guard terminal model turns and unresponded functionCalls in `normalizeGeminiContents`
- **Command Code**: replay raw byte chunks to preserve all NDJSON lines
- **Translator**: stop emitting empty `<think>` markers into OpenAI content
- **CLI Tools**: refresh Codex settings after apply (#4347); keep existing `ANTHROPIC_AUTH_TOKEN` when applying Claude settings
- **Tray**: native arm64 macOS menubar binary, no Rosetta required
- **CLI**: filter model selector by active connections and noAuth providers
- **Usage**: key live byApiKey stats by full api key to prevent team-key collision and preserve API key usage attribution
- **Tailscale**: cap enable-flow health wait at 20s

# v0.5.86 (2026-09-23)

## Features
- **Xiaomi MiMo**: server-assisted desktop login for headless/Docker deployments, five account clusters (cn/sgp/ams/ru/in), and v2.6 pro/flash/pro-ultraspeed models with dual-route (account service vs. cloud API)
- **Claude**: add Claude Opus 5.5 support
- **i18n**: translate React text rewrites via characterData mutation observer

## Fixes
- **Proxy Pools**: keep request headers intact through Vercel/Cloudflare/Deno relays (spreading a `Headers` instance yielded `{}`, dropping auth and content-type)
- **Xiaomi MiMo login**: keep the session in the httpOnly cookie only, require dashboard auth on the proxy branch, and stop forwarding authorization headers upstream

# v0.5.85 (2026-09-22)

## Features
- **System One**: add `/v1/systemone` decision endpoint for Jev models (OpenCode Zen and OpenRouter lanes), wire into sidebar and Media Providers page with interactive probe testing
- **CLI Tools**: add dynamic configuration, settings APIs, and official logos for Pi, OMP, Crush, ForgeCode, Smelt, and CodeWhale
- **Analytics & Usage**: add Requests mode, provider/model breakdown charts, All Time period filter, and refined overview cards
- **Combos**: add Cursor/Claude Default presets; support bulk select/delete and bulk strategy changes (Fallback / Round Robin / Fusion)
- **Model Capabilities**: expose model capability metadata on `/v1/models` and aggregate capabilities across combo targets
- **OpenCode Zen & MiMo**: add OpenCode Zen (`opencode-zen`) provider with free-tier fingerprint; switch default vision fallback to MiMo V2.6 Flash Free
- **Qoder CN**: add `qoder-cn` provider for qoder.com.cn with OAuth flow, COSY protocol, and CN gateway routing

## Fixes
- **Translator**: map Claude `refusal` stop_reason to `content_filter` and surface explanation; strip replayed reasoning fields for Groq, Mistral, and Cerebras (#4220)
- **Antigravity**: drop requestType `agent` to avoid false 429 `RESOURCE_EXHAUSTED`; separate weekly and short-window (5-hour) quotas and deduplicate dashboard rows
- **Responses API**: report usage on `response.completed` so clients can auto-compact (#3432)
- **Hugging Face**: migrate to Inference Providers router (`router.huggingface.co`), expand image models catalog, and add STT route
- **Qoder**: prevent signed request replay (`403/103 Duplicate request`), handle code 110 billing blocks, and preserve upstream SSE error status
- **Performance**: bound usage `lastUsed` scan to a 2-day window; map large budget tokens to `max` reasoning tier
- **Docker**: publish verified multi-platform images (linux/amd64 and linux/arm64) with configurable apk build mirrors

# v0.5.81 (2026-09-18)

## Features
- **Xiaomi MiMo**: merge MiMo Desktop support into `xiaomi-mimo` with dual auth (API key + Desktop/OAuth session), Preview models support, and encrypted-callback OAuth flow
- **Claude Code**: add 1M-context toggle (`[1m]` marker) and drive `CLAUDE_CODE_AUTO_COMPACT_WINDOW` directly from the dashboard
- **Models**: add DeepSeek-V4.1-Flash to DeepSeek provider, CodeBuddy-Intl, and Ollama (`deepseek-v4.1-flash:cloud`); enable `low`..`max` reasoning effort levels and vision capability for DeepSeek-V4.*
- **i18n**: integrate Persian (fa) translation

## Fixes
- **Cursor**: stop AgentService empty turns (`OUT 0`) and silent hangs — fold system prompts instead of `custom_system_prompt`, send `ModelDetails`, read Composer/Grok `thinking_delta`, ack request-context without echoing MCP tools, and reject IDE execs so the model can continue
- **RTK**: for Cursor, compress source-format `tool_result` / `role:tool` **before** translation — its translator rewrites those shapes, so post-translate compression missed them. Other providers keep the post-translate pass unchanged
- **OpenCode / OpenCode Go**: resolve 403 `FreeTierError` and 429 rate limits with canonical session format, valid User-Agent, and stable upstream session reuse; force stream and declare `forceStream` for free-tier SSE aggregation; cloak decoy tools, normalize Muse Free tool choice, and strip prior reasoning items on Responses models; route Union Alpha via Messages API
- **Kiro**: preserve underscores in tool names (`mcp__server__tool`) and restore client tool names in responses; use neutral placeholder for tool-result-only turns; forward tool-result images
- **Stream**: report aborts after HTTP 200 in-band (per-format error frames) instead of closing silently
- **Command Code**: preserve images and `reasoning_effort` on `/alpha/generate`; retry transient stream errors and avoid fake stop chunks; add Quota Tracker support
- **Zed**: harden OAuth lifecycle (preserve `systemId`, renew proxy timeout), support live model resolution, and lower display priority in OAuth list
- **Antigravity**: scope cached thought signatures to model family; strip Claude Code billing headers from system prompts; sanitize Hermes system identity
- **Codex**: route bare `codex-auto-review` requests to the Codex provider (#4135)
- **Auth**: do not cool down an account for request-scoped 4xx errors
- **Usage**: improve DeepSeek credit balance display as currency credit instead of 0/total quota bar
- **Model Catalog**: scope synced catalog to gateways and declare vision capabilities for DeepSeek V4.1-Flash IDs

# v0.5.75 (2026-09-10)

## Features
- **Video**: add OpenRouter and Vertex AI (Veo) video generation on `/v1/videos/*` via a provider adapter layer; poll requests resolve their provider from `x-connection-id` or `?provider=`
- **Antigravity**: add weekly quota tracking (Gemini weekly / Claude & GPT weekly) and free-tier handling from `retrieveUserQuotaSummary` (#3892)
- **Codex**: add GPT Image 2.5, Flare and Sunburst image models with multi-image support; add the same ids to the OpenAI catalog
- **Qoder**: surface usage to all clients and stop inlining large attachments — images upload through `/api/v2/image/upload` like qodercli, oversized file blocks become stubs, context tier auto-escalates
- **OpenCode Go**: add newly published models (glm-5.3, kimi-k3, deepseek-flash, longcat-2.0, hy4-preview, hy3 on chat/completions; qwen3.8-max, qwen3.8-flash on `/messages`; grok-4.6, gpt-5.6-luna on Responses) and list `deepseek-v4.1-flash` first in the catalog
- **CLI tools**: group the model selector by provider with full-text search and manual custom model ID entry
- **CodeBuddy-CN**: replace `deepseek-v4-flash` with `deepseek-v4.1-flash`

## Fixes
- **Tools**: scope Claude tool type defaulting to gateways declaring `requireClaudeToolType` — the global default broke Anthropic-compatible endpoints that only accept the legacy typeless tool shape (#3905)
- **Claude**: cap re-anchored `cache_control` at the 4-marker budget so a spent budget no longer 400s and triggers a full combo failover; wrap bare single-object content turns before the mid-conversation-system fold
- **Cline / Airforce**: unwrap the `{"success":true,"data":…}` envelope on non-stream chat completions (#3644); add the live Cline/ClinePass model catalog and refresh Airforce free models
- **Cline**: stop `workos:`-prefixing ClinePass API keys (401 on every request, #2333) and add clinepass token refresh
- **Kiro**: never send a top-level `systemPrompt` (`400 REQUEST_BODY_INVALID`); route requests through current runtime surfaces (#3776)
- **Codex**: strip Unicode-property tool schema patterns the validator rejects (#3922); restore the `Version` header and single-source the CLI version
- **DeepSeek**: keep Anthropic-only tool types when forwarding to `/anthropic/v1/messages`
- **Qoder**: drop the Responses usage plumbing from shared translator/handler code, which changed token accounting for every provider, not just Qoder
- **Antigravity**: normalize contents and handle intermediate tool responses; protect the OAuth token-refresh path from Google anti-abuse rate limits (#3813)
- **Providers**: clear stale connection health state (`modelLock_*`, `backoffLevel`, `rateLimitedUntil`, `errorCode`) when a connection is re-validated (#3810, #3830); remove the duplicate `qwen` provider that shadowed `alims-intl`
- **Video / Vertex**: reject job ids and model ids that would escape the request URL path (SSRF)
- **Usage**: parse the Fable weekly limit from `limits[]` instead of fabricating a row (#3847)
- **Auth**: set a 24h `maxAge` on the dashboard session cookie

# v0.5.69 (2026-09-05)

## Features
- **Codex**: add GPT 6.0 Astra (`gpt-6-astra`) with vision, thinking and search capabilities
- **Usage**: add Claude Fable quota tracker support with weekly window normalization (`weekly fable (7d)`)
- **Dashboard**: group Antigravity Gemini and Claude quotas in Quota Tracker, prune stale hidden keys
- **OpenCode Go**: add `muse-spark-1.3-contributor` model and support parallel tool calls on Responses path (#3819)
- **Providers & Models**: align CodeBuddy-CN catalog/capabilities with server config; add GPT-5.6 Sol, Terra, Luna image aliases on Codex (#3806); refresh Qoder catalog with capability mapping and image pass-through
- **CLI tools**: replace Copilot MITM with VS Code extension setup guide
- **Gemini**: persist and replay `thoughtSignature` scoped by session namespace

## Fixes
- **Claude**: normalize adaptive auto effort (`output_config.effort`) (#3792)
- **Antigravity**: prevent Google anti-abuse rate limits during multi-account refresh (#3813)
- **Anthropic-compatible**: forward Claude beta flags to nodes fronting Anthropic (#3797)
- **Dashboard**: dynamic mode label for local/remote detection (#3801)
- **Codex**: format reset credit API errors cleanly (#3778)
- **Security**: guard cowork MCP tools probe against SSRF (#3783)
- **OpenCode Go**: track OpenCode Go quota (#3791) and send stable session headers (#3800)
- **Logger**: suppress noisy background token refresh logs
- **CLI**: export packed `.tgz` directly into workspace root instead of parent directory

# v0.5.65 (2026-09-03)

## Features
- **Fetch**: add Ollama Cloud web fetch provider
- **Gemini / Antigravity**: add Gemini 3.8 Flash support and bump IDE fingerprint to 2.11.0
- **Claude**: add Claude Fable 5.1 support (adaptive thinking with `output_config.effort`), bump Claude Code fingerprint to 2.1.258 for new-model access
- **Providers**: add client-side status filter (All / Active / Inactive / No connection) on the Providers dashboard; add max height and scroll for connection list
- **Providers & Models**: streamline tokenrouter model catalog down to 22 flagship/newest models and add missing provider icons; refresh Codebuddy-CN catalog (add hy4-preview/hy3/glm-5.3/kimi-k3-1, drop EOL glm-5.0/glm-4.7)
- **Models**: capability toggles (vision, reasoning) when adding custom models with upsert and live caps refresh
- **CLI tools**: support saving and managing custom API key presets
- **Quota**: add usage and rate-limit tracking for Groq via `x-ratelimit-*` headers
- **i18n**: complete Indonesian translation (1391 keys)

## Fixes
- **Security**: close SSRF guard bypasses in `ssrfGuard.js` (alternate IPv6 encodings, hostname trailing dots, wildcard DNS resolution check, safe redirect handling) (#3714)
- **Model markers**: strip the `[1m]` context marker Claude Code appends to model names (`claude-opus-5[1m]`) preventing model resolution failures (#3690)
- **Claude**: drop `server_tool_use` blocks carrying foreign IDs to avoid Anthropic 400 rejections; never anchor cache breakpoints on `defer_loading` tools (#3567)
- **Antigravity**: strike-break optimistic quota readings that keep 429ing by blocking the connection+model pair for 15m after 3 strikes (#3681); preserve client identity on model catalog requests (#3414)
- **Auth**: protect root `/responses` rewrite requiring API key validation in dashboardGuard
- **Chat & Docker**: return 503 Service Unavailable when all credentials are rate-limited; explicitly bundle `node-machine-id` into standalone Docker runtime image
- **OpenCode**: route Muse Spark models to `/zen/v1/responses` and declare vision support; filter inactive free model
- **Kiro**: preserve inline images as OpenAI-compatible `image_url` parts in OpenAI MITM; remove redundant top-level `systemPrompt` from payload
- **Usage**: read Responses-shape `cached_tokens` in `extractUsageFromResponse` for non-streaming traffic
- **Models**: support single model lookup with provider-prefixed IDs (e.g. `cc/claude-sonnet-5`)
- **Translator**: route Gemini thinking through `reasoning_effort` on OpenAI-compatible wire; convert `prefixItems` and ensure array items in Gemini schema sanitizer
- **UI**: apply persisted theme before first paint to prevent flash on reload; translate combo vision adapter label

# v0.5.59 (2026-08-29)

## Features
- **Search**: new web search providers — Antigravity (Google Search grounding
  on the existing OAuth account pool, citations keyed and merged by URL) and
  Xquik (X search with `x-api-key` auth, cursor pagination, credit-based
  usage), both on `POST /v1/search`. Based on #3437 by @Nautilaceae
- **Search**: ollama-search and zai-search borrow a chat provider's API key
  instead of requiring their own connection, driven by a new
  `credentialFallback` registry field. zai-search later folded into the `glm`
  provider itself so the web search page shows the shared connection
- **Models**: daily background sync of model capabilities from models.dev —
  modalities keyed by model id (majority of sources must declare one),
  context/output limits keyed by provider + model, strictly additive and
  sitting below the hand-written tables. ETag + mtime cache, 60s startup
  delay, `MODEL_CATALOG_SYNC=off` to disable
- **Models**: add GLM-5.3-Flash (1M context, natively multimodal), DeepSeek
  V4 Vision, Grok 4.5/4.6 (500k context); correct glm-4.6v/4.5v video input
  and output limits, backfill glm-4.6v on glm-cn
- **Usage**: show the Zed plan quota on the dashboard — plan, edit
  predictions, hosted model requests and billing-cycle reset; unlimited rows
  render as "N used · Unlimited"
- **Usage**: track GPT-5.3-Codex-Spark quota windows (spark_session /
  spark_weekly) from the Codex usage response (#3431)
- **Antigravity**: quota-aware routing — on 409/429 fetch live quota for the
  exact per-model resetAt and skip only the exhausted account/model pair;
  report the earliest reset when every account is blocked (#3561)
- **Antigravity**: map image `size` to the aspect-ratio model suffix (-WxH);
  add the Gemini 3.7 Flash tiers to MITM defaultModels so they show up in
  the dashboard model-mapping table
- **Dashboard**: bulk import Grok CLI accounts from JSON — paste an array or
  drag-drop multiple .json files, all OAuth connections created in a single
  call, mirroring the codex flow
- **CLI tools**: endpoint presets shared across every tool card through one
  live-resyncing store, instead of per-card localStorage copies that never
  saw each other's saved endpoints
- **Token Saver**: configurable compression timeout (`headroomTimeoutMs`) —
  the fixed 3000 ms made busy machines time out and send inconsistently
  compressed bodies, hurting prompt caching
- **i18n**: pt-BR expanded to 1132 terms

## Fixes
- **Claude Code**: add Claude Fable 5.1 and advertise Claude Code 2.1.258 in
  both the request header and billing identity; use its permanent adaptive-thinking
  mode with `output_config.effort`
- **Stream**: record usage when a client closes on the terminal event — the
  Responses API has no [DONE] sentinel, so codex closed the socket on
  `response.completed` and cancelled the reader before flush() ran its usage
  side effects; the tail now lives in a once-guarded finalizeStream(). Also
  stop logging a disconnect for every completed Responses call
- **Stream**: parse the trailing NDJSON line an Ollama stream leaves behind
  without a closing newline — the final chunk carrying `done_reason` and the
  token counts was dropped
- **Session**: read the Claude Code session id from the
  `x-claude-code-session-id` header — `metadata.user_id` is dropped by
  Responses translation, splitting one conversation across several
  `prompt_cache_key` values and missing the upstream prefix cache
- **Usage**: preserve nested `cached_tokens` — the top-level-only read
  persisted `cached_tokens: 0` for every Responses-format provider (codex,
  grok-cli, …), billing cache hits at the full input rate
- **Usage**: GLM quotas accept CREDIT_LIMIT plans and multi-interval windows
  (5h session / 7d weekly) instead of overwriting a single "session" key
- **Models**: the catalog sync no longer erases its own output — deltas were
  measured against the previous run's writes (the second run cut `providers`
  from 20 entries to 5); one vote per provider in the modality tally, ETag
  restored from file on startup, and the worker thread dropped after the
  bundler rewrote its path into a module-not-found error
- **Executor**: CommandCode returns errors as a `type:"error"` event inside
  an HTTP 200 NDJSON stream — peek the first events before committing, abort
  and return a real 4xx/5xx so combo/account fallback triggers instead of
  streaming the error text as content
- **Search**: scope failure locks on the credential-fallback path — a failing
  search locked `modelLock___all` and took the shared glm key offline for
  chat as well; locks are now attributed to the connection's owner and
  scoped to `websearch:<provider>`
- **Providers**: connection tests get a 15s AbortSignal timeout instead of
  hanging and exhausting the browser socket pool; guard undefined provider
  names on the providers page
- **Antigravity**: sanitize competing-client branding via a config-driven
  rule table (Zed's Claude-agent prompt, opencode → antigravity) — upstream
  answers 429 Quota Exhausted. Applied in the executor so the shared
  openai-to-gemini translator leaves gemini/vertex/zed untouched
- **MiniMax**: preserve images on the sourceFormat-matched OpenAI transport
  — MiniMax-M3 resolved a Claude-shaped body posted to the OpenAI endpoint,
  silently dropping `image_url` blocks (#3418)
- **Claude**: decloak tool names in same-format streaming passthrough —
  OAuth-cloaked names (CLAUDE_TOOL_SUFFIX) leaked to the client and every
  tool call was rejected as unknown
- **Tools**: default a missing `tools[].type` to "custom" on Claude-format
  requests — strict Anthropic-compatible gateways (MiniMax) reject the
  request with 400 otherwise
- **Translator**: zai thinkingFormat sends the top-level `reasoning_effort`
  object GLM-5.2+ requires — every GLM-5.x request ran at the model default
  (max); gated on GLM-5.2+ since older GLM does not read it (#2721)
- **RTK**: system prompt injection matches each target wire format
  (Chat/Responses/Claude/Gemini/Kiro) and is exact-idempotent across retries,
  so distinct prompts sharing a long prefix are no longer collapsed (#3202).
  Also set the diagnostic before the silent null return on Responses
  translation failure so the panel is no longer blank
- **OpenCode**: route muse-spark through /zen/v1/responses (it 500s on
  chat/completions), normalizing the Chat fields the Responses API rejects
  and clamping max/ultra effort to xhigh
- **CLI**: install better-sqlite3 without build tools on Node 22+ (N-API
  13.0.3 ships per-platform prebuilds, `--ignore-scripts` skips the implicit
  node-gyp build); Node < 22 stays on 12.6.2, working installs untouched
- **CLI tools**: send the API key Codex actually reads —
  `[model_providers.9router.http_headers]` instead of auth.json (which left
  every request 401 and clobbered an existing ChatGPT login); subagent model
  moved to `agents.default_subagent_model`
- **OAuth**: refresh Cline tokens with the extension JSON contract
- **Dashboard**: clamp the API key mask length — keys shorter than 8 chars
  threw RangeError and crashed the media-provider detail page
- **UI**: wait for the Material Symbols font itself before revealing icons —
  `document.fonts.ready` resolved before the 4MB woff2 even started loading,
  leaving icons blank until a second load

# v0.5.55 (2026-08-14)

## Features
- **Auth**: native SAML 2.0 SSO alongside OIDC — AuthnRequest generation, ACS
  assertion handling, SP metadata export, admin config test, replay-protected
  via a `saml_state` cookie matched against `InResponseTo`
- **Providers**: add Alibaba Token Plan (`token-plan.ap-southeast-1`) — the
  fourth Alibaba key type, Singapore-only and OpenAI-compatible transport only
- **Providers**: add `glm-5.3` to GLM Coding and GLM (China)
- **Providers**: Kimchi accepts API keys as well as OAuth (dual auth), with a
  working Test Connection for both modes
- **Antigravity**: add Gemini 3.7 Flash and its tiered high/medium/low variants
  (also in the Gemini registry) with pricing and quota tracking
- **TTS**: add Fish Audio — model id travels in an HTTP `model` header, voice
  is a `reference_id` (preset or cloned voice model)
- **OpenCode-Go**: route by request format via declared transports instead of
  forcing every client into `/messages` — Codex/OpenAI clients no longer pay a
  lossy Responses→OpenAI→Claude double translation. Per-model `supportedFormats`
  guard; the bespoke executor is gone (its shared `_lastModel` cache could cross
  auth headers between concurrent requests)
- **Usage**: dedup + cache Claude quota calls (120s TTL keyed by access token,
  in-flight promise dedup, last-good read on soft failure) to stop multiple
  tabs tripping 429; manual refresh (↻) sends `force=1` to bypass the cache

## Fixes
- **Docker**: ship `sql.js` in the image so the pure-JS DB fallback can start —
  file tracing carried the package's JS without `dist/sql-wasm.wasm`, so a
  container with no native driver aborted with ENOENT and never got a database
  (#3248)
- **Usage**: read Gemini `usageMetadata` out of the antigravity `{ response }`
  envelope — every non-streaming antigravity request logged `IN 0 | OUT 0`
  (#3260)
- **Claude**: re-anchor passthrough cache breakpoints — the client's own
  `cache_control` markers point at pre-normalization offsets, so the tail was
  re-cached every request. Last system block and last tool pinned at 1h TTL,
  last assistant turn at 5m, mid-conversation system messages folded into the
  neighbouring user turn instead of hoisted into `body.system`
- **Combos**: detect images from Hermes and attachment payloads (`images[]`,
  `experimental_attachments`, message-level `image_url`/`audio_url`, inline
  `data:` URIs) so the Vision Adapter auto-switch fires for Hermes/Ollama/
  Vercel AI SDK shapes
- **Kiro**: intercept chat via `x-amz-target` — Kiro IDE 1.0.228+ moved
  `GenerateAssistantResponse` to `POST /` + header, bypassing MITM. Also emit
  the now-mandatory initial-response frame and map the `auto` model slot
- **Kiro**: report real output tokens and stop discarding usable turns
- **Qoder**: detect billing blocks at stream start and return a synthetic 403
  so combo/account fallback triggers instead of leaking the error into chat
- **Antigravity**: strip competitive system prompts (Zed IDE's Claude-agent
  prompt) that Antigravity flags with a 429 Quota Exhausted
- **OpenCode**: send the official client fingerprint on free-tier requests so
  the Console stops classifying traffic as unidentified and rate-limiting it;
  session id resolves conversation-stable to preserve prompt caching
- **Responses**: don't close the message on an empty `tool_calls` array — some
  providers attach one to every chunk, and the truthy check ended the message
  on the first content token (#3234)
- **Translator**: preserve `prompt_cache_key` when converting chat to responses
- **Models**: expose snake_case token limits on `/v1/models`
- **Combos**: strip `stream_options` from the Fusion panel fan-out to avoid a
  DeepSeek 400 (#3024); raise the dashboard model-test probe budget to 1024 and
  soft-pass reasoning-only responses (#3010)
- **Headroom**: the toggle reflects the `headroomEnabled` setting even when the
  proxy is down — it previously showed OFF while the engine kept calling
  `/v1/compress`; proxy status stays visible via the status chip
- **Hermes**: add the `api_key` parameter to the model block in YAML config
- **Providers**: add llm7 to provider test support

## Docs
- **i18n**: add Spanish, French, and Brazilian Portuguese README translations

## Security
- **Real IP**: `x-9r-real-ip` and the Host fallback were trusted from
  client-controlled headers whenever `custom-server.js` was not in the request
  path (`npm run start`, `start:bun`), letting a remote caller pose as local to
  skip API key auth and reach `LOCAL_ONLY_PATHS` (`/api/mcp/*`,
  `/api/tunnel/enable`, `/api/auth/reset-password`). The server now stamps a
  per-process `x-9r-peer-token` on every request it sanitizes and only trusts
  `x-9r-real-ip` behind it — falling back to Host in development and failing
  closed in production (GHSA-pjm4-8fpg-f9p6). Also fixes IPv6 loopback
  detection (`::1`, `::ffff:127.0.0.1`) and routes `npm run start` /
  `start:bun` through `custom-server.js`
- **Search**: `resolveBaseUrl()` rejects client-supplied non-public baseUrls
  (SSRF guard on `/v1/search`)
- **Login**: fresh-install remote login with the default password returns 403
  without issuing a JWT
- **Usage**: `/api/usage/request-details` redacts request/response payloads

# v0.5.50 (2026-08-05)

## Features
- **Providers**: add TokenRouter (300+ models via OpenAI-compatible gateway) with
  exact per-model pricing for 110 models and `reasoning_effort` thinking config
- **Providers**: add Self-hosted STT / TTS / Embedding — point 9Router at your own
  OpenAI-compatible speech and embedding servers (whisper.cpp, faster-whisper,
  Kokoro-FastAPI, llama-server, vLLM, Infinity). Unlike the named cloud providers
  these read `baseUrl` per connection, so one provider can front several machines
- **Combos**: default-enable vision/audio capacity adapter (auto-routes to a
  vision/audio-capable model when the target lacks that capability, falling back
  to `oc/mimo-v2.5-free`), wired into chat handler routing
- **Endpoint**: auto-provision a "Default Key" for first-time users so `/v1`
  works without a manual dashboard step
- **Codex**: support GPT-5.6 Max/Ultra reasoning-level overrides (cx/ routes only)
- **Qoder**: support PAT (Personal Access Token) connections end-to-end, alongside
  OAuth device flow
- **CLI tools**: add OpenDesign (manalkaff/opendesign) support
- **Headroom**: report effective payload savings (tool schema/history bytes broken
  out, byte-savings % reflects actual outbound reduction)
- **Ollama**: Cloud quota tracker (session + weekly) + proactive background OAuth
  token refresh scheduler for all providers

## Fixes
- **Providers**: remove Qwen (OAuth flow stopped working reliably)
- **Passthrough**: detect codex-tui/Codex Desktop as native Codex client — they
  were falling through to the translator and losing fields like `reasoning.summary`
- **OAuth**: scope antigravity header fixes to loadCodeAssist/onboardUser only
- **OAuth**: keep `open` external in the build so xAI/Grok token refresh works on
  Windows
- **OAuth**: declare missing `searchParams` in register-session handler (was a
  500 instead of JSON on error)
- **DB**: `ENABLE_REQUEST_LOGS` env var now overrides the UI setting correctly;
  observability defaults to off (opt-in)
- **Translator**: preserve Codex Responses Lite tool use across chat-native
  OpenAI-compatible providers
- **Translator**: don't drop image-only user messages in `prepareClaudeRequest`
- **Translator**: drop JSON Schema keywords Gemini rejects (`uniqueItems`,
  `contains`, `multipleOf`, `unevaluatedProperties`, `unevaluatedItems`,
  `contentSchema`)
- **Claude**: remove global header cache that leaked one client's identity
  headers onto another client/account sharing the server; gate `anthropic-beta`
  by model instead
- **Antigravity**: drop retired Gemini 3.0 quota tiers, show Gemini 3.6 Flash
  usage bars
- **Cloudflare AI**: declare API key authentication (dashboard showed "No
  connections" despite an active key)
- **GitHub Copilot**: hold monthly-exhausted accounts until UTC month reset
  instead of only cooling down 120s
- **CodeBuddy**: dodge Tencent CN content filter, add usage tracking, normalize
  codebuddy-intl messages
- **Usage**: stop losing cached prompt tokens in the forced-SSE→JSON path
- **Grok CLI**: display the public subscription tier from the OAuth token claim
- **Providers**: count apikey connections for Ollama free-tier card; free-tier/
  apikey providers without `authModes` now default to apikey (were treated
  oauth-only)
- **Build**: include static/public assets in standalone output (login page hung
  on 404s when run via PM2)
- **Server**: support IntelliJ IDEA OpenAI-compatible clients over HTTP (h2c
  upgrade handling)
- **Auth**: redirect already-logged-in sessions away from `/login`
- **CLI tools**: enable Apply button for dynamic OpenAI/Anthropic-compatible
  provider connections
- **CLI**: include complete API artifacts in the CLI package
- **TTS**: a bare self-hosted model name is the MODEL, not the voice — `kokoro`
  was parsed as a voice against a default model, 404ing or synthesising with the
  wrong one
- **Embeddings**: self-hosted embeddings no longer fall back to `api.openai.com`
  when a connection has no `baseUrl` — that silently sent the input text and API
  key to OpenAI under a provider named "Self-hosted"
- **Embeddings**: an adapter that rejects a misconfigured connection now returns
  400 with the reason instead of escaping the handler uncaught
- **Embeddings**: bound the upstream fetch with `FETCH_CONNECT_TIMEOUT_MS` — an
  endpoint that drops packets never returns headers, so the request previously
  hung indefinitely

## Docs
- **i18n**: fix port typo, add RTK Token Saver feature descriptions

# v0.5.45 (2026-07-30)

## Features
- **TTS**: add Xiaomi MiMo text-to-speech (preset voices 冰糖/茉莉/苏打/白桦/Mia/Chloe/Milo/Dean, style control, language hint dropdown with Auto-detect, i18n for Style label/placeholder)
- **Providers**: add Poolside (OpenAI-compatible)
- **Providers**: add api-airforce, baidu, bazaarlink, bluesminds, kilo-gateway, llm7, morph, sambanova, tencent
- **OAuth**: zed / trae / windsurf providers + harden callback proxies
- **CLI tools**: set Claude Code max context tokens
- **Qoder**: PAT auth + refresh model list
- **Gemini**: Gemini 3.6 Flash tier routing + Gemini 3.5 Flash Lite
- **Claude**: bump default Opus to `claude-opus-5`
- **Kiro**: add Claude Opus 5 models
- **Usage**: Kimi and DeepSeek usage handlers
- **Usage**: SuperGrok weekly pool via gRPC-web

## Fixes
- **Refresh**: rotate `refresh_token` between retry attempts
- **Kiro**: canonicalize tool history and route API keys correctly
- **Kiro**: normalize dashboard thinking intensity models
- **Cursor**: stop leaking agent tool errors as text
- **Gemini**: fill empty tool schemas after `$ref` strip
- **Antigravity**: strip `stream_options` from non-stream requests
- **Jina-reader**: recover after transient errors, use JSON POST API
- **Usage**: record exact embedding tokens
- **Tunnel**: preserve successor cloudflared PID
- **Console-log**: initialize capture at server boot + prevent SSE proxy buffering
- **Dashboard**: count dual-auth, free-tier OAuth and API-key connections correctly
- **Dashboard**: flex quota rows, thin global scrollbars, no hidden-row overflow

## Docs
- **i18n**: expand pt-BR translation to 986 terms
- README: Indonesian translation

# v0.5.40 (2026-07-20)

## Features
- **i18n**: add Khmer (km) translations
- **CLI tools**: configure Grok Build subagent models
- **Kimi**: merge OAuth into dual-auth provider, add K3 / K2.7 models
- **Dashboard**: ProviderTopology flow animation

## Fixes
- **DB**: resolve better-sqlite3 parameter binding crash
- **Translator**: pass `service_tier` through OpenAI → Responses conversion
- **Kiro**: map GPT-5.6 reasoning effort fields
- **Kiro**: validate terminal streams before emitting output
- **Kiro**: map GPT reasoning effort fields
- **Codex**: current `client_version` + refresh-aware model sync
- **Alicode-intl**: split into Coding Plan + Model Studio providers
- **Cursor**: HTTP/2 AgentService support + version bump 3.12.17
- **Dashboard**: cut duplicate API/icon spam, lazy-load provider assets

# v0.5.35 (2026-07-16)

## Features
- **xAI**: Grok Imagine video generation (`/v1/videos`) + CLI
- **CLI tools**: Grok Build setup — choose separate main/general-purpose/explore/plan models and preserve each model's context window
- **GitHub Copilot**: route Claude models through Copilot's native `/v1/messages`
- **Kiro**: add GPT-5.6 model family (#2596)
- **RTK**: `X-9Router-Token-Saver` header to bypass token savers per request
- **Providers**: quota visibility settings
- **Translator**: drop temperature for all Claude models
- **i18n**: Thai (th) + Persian (fa) translations / README

## Fixes
- **Providers**: bulk-add API keys no longer overwrite existing keys (gap-fill `Key N`)
- **Anthropic**: lowercase `anthropic-version` header to prevent duplication on `/v1/messages`
- **Alicode-intl**: use DashScope compatible-mode endpoint so standard keys work
- **Grok CLI**: align Grok Build with current subscription protocol (#2590)
- **Grok CLI**: surface `expiresAt` so proactive token refresh fires (#2546)
- **Kiro**: improve direct session cache reuse
- **Models**: populate capabilities for live-catalog LLM models
- **Models**: list compatible provider models in `/v1/models`
- **Thinking**: send explicit `thinking:{type:adaptive}` alongside `output_config.effort`
- **Translator**: strip `client_metadata` when converting openai-responses → openai

## Improvements
- **Perf**: skip inactive background services on startup

## Docs
- README: Persian YouTube tutorial

# v0.5.30 (2026-07-10)

## Features
- **Perplexity**: add Agent API provider (#2492)
- **Grok CLI**: add Grok CLI / Grok Build provider with OAuth device-code flow (#2502)
- **Featherless**: add OpenAI-compatible provider presets
- **SearXNG**: configure endpoint via SEARXNG_URL env (#2499)
- **Providers**: add max thinking level for gpt-5.6-sol (#2500)
- **Headroom**: add extras detection and install UI (#2403)
- **Headroom**: activate/uninstall extras + fix interpreter detection
- **PXPipe**: PXPIPE token saver — multimodal prompt compression (#2465)
- **Proxy-Pools**: auto-rotate strategy for no-auth providers (#2409)

## Fixes
- **Cloudflare-AI**: support accountId in bulk key import (#2449)
- **DB**: backup on schema change, MCP child cleanup, codex models, usage providers OOM
- **Codex**: avoid bare-email OAuth dedup (#2477)
- **CLI**: allow staged app bundle builds (#2479)
- **Headroom**: compress Kiro conversation state (#2488)
- **Gemini-CLI**: raise output floor for thinking and add validated toolConfig (#2486)
- **GitHub**: label Copilot profiles by account identity (#2498)
- **OpenAI-to-Claude**: unwrap bare {function:{…}} tools without parent type (#2473)
- **Translator**: clamp thinking effort max->xhigh for OpenAI format (#2466)
- **RTK/find**: detect and group Windows backslash-style find output (#2448)
- **Codex**: handle fast tier and capacity SSE (#2452)
- **Volcengine-ark**: clamp Kimi max_tokens to 32768 endpoint cap
- **Antigravity**: align provider fingerprint with IDE Desktop 2.1.1 (#2389)
- **Pricing**: update Claude/Codex model rates and add new models

## Improvements
- **i18n(zh-CN)**: complete Chinese translations for all UI strings (#2436)
- **API**: caching for tunnel and version status endpoints
- **Perf**: faster dev startup and lighter bundle

# v0.5.20 (2026-07-07)

## Features
- **Thinking**: per-model thinking level picker on provider page — appends `(level)` suffix to copied model names for forced reasoning effort across all formats (openai, claude, gemini, deepseek, kimi, qwen, zai, minimax, hunyuan, step)
- **RTK**: add JS-native git-log filter (#2423)
- **Caveman**: add targeted upstream-aligned style rules (#2424)
- **i18n**: add Farsi (fa) language support (#2385)

## Fixes
- **Thinking**: strip `(level)` suffix from upstream `body.model` so providers no longer reject requests
- **Translator**: preserve developer instructions in openai-responses conversion (#2434)
- **count_tokens**: count structured Anthropic blocks (#2419)
- **Volcengine-ark**: clamp GLM-5 max_tokens to model output ceiling (#2428)
- **Kimi**: normalize reasoning_effort to backend enum (#2427)
- **Claude**: reconcile max_tokens vs thinking budget and lift per-model ceiling (#2381)
- **Kiro**: deliver system prompt natively, add Opus 4.5/4.7/4.8, tolerate dash version ids (#2366)
- **Headroom**: proxy dashboard through app (#2372)
- **MITM**: recover from stale lock file on server start

# v0.5.18 (2026-07-03)

## Features
- **Usage**: track cached tokens + correct input/output/cache cost (#2209) — hodtien
- **Codex**: show reset credit expiry details (#2290) — Rafli Ahmad Zulfikar
- **NVIDIA**: add new models and capabilities — decolua
- **ClinePass**: add provider support — sternelee

## Fixes
- **Usage**: dedupe streaming request-details log entries — Qin Li
- **Claude**: drop foreign thinking signatures in passthrough — decolua
- Prevent non-SSE stream pipe crash and cross-IdP account overwrites (#2244) — KunN-21
- **Kiro**: route IdC auth to regional CodeWhisperer surface (#2297) — Volodymyr Saakian
- **Kiro**: add Claude Sonnet 5 model support (#2264) — Edison42
- **Xiaomi-tokenplan**: region selector, key validation, multi-connection (#2251) — MiQieR
- **Translator**: strict Anthropic content block compliance (#2225) — Sahrul Ramadhan Hardiansyah
- **Kimchi**: strip reasoning_content echo to bound multi-turn input tokens — KunN-21
- **Kimchi**: bump User-Agent to kimchi/0.1.40 (#2256) — Ansh7473
- **Codebuddy-cn**: strip empty tool_calls arrays to preserve reasoning — zmf
- **Antigravity**: preserve Claude tool delta index (#2223) — Sutarto Jordan Chrisfivo
- **MITM**: generate root CA on server startup (#2228) — Sutarto Jordan Chrisfivo

# v0.5.15 (2026-06-29)

## Features
- Add Kimchi OAuth provider — Nant361
- Refine Qwen vision/video + thinking model patterns — decolua
- Opt-in Codex auto-ping quota keep-alive — Emirhan

## Fixes
- **Responses**: handle response.done terminal events (#2142) — rifuki
- **Headroom**: skip unsafe responses tool history (#2132) — Sutarto Jordan Chrisfivo
- **Translator**: map mid-conversation system message to user (claude→openai) — decolua
- **Gemini**: normalize contents to prevent 400 invalid_argument (#2192) — warelik
- **Gemini**: backfill thoughtSignature + suppress stream done sentinel — WARELIK
- **Alicode**: preserve cache_control for DashScope providers (#2069) — Rex
- **Antigravity**: strip deprecated/readOnly/writeOnly from tool schemas — iletai, Yudhistira-Official
- **CodeBuddy CN**: show bonus packs as one-time, not monthly-replenishing — whale9820
- **Kiro**: strip leaked <thinking> tags from content stream (#2158) — hamsa0x7
- **Tray**: make Windows context menu DPI-aware — Emirhan
- **Kilocode**: expose full gateway catalog in combo model picker — jellylarper
- **OpenCode**: fix Go GLM — decolua

# v0.5.12 (2026-06-26)

## Features
- Add token-saver dashboard page — decolua
- Add bulk delete for provider connections — teddytkz
- Resolve GitHub Copilot model catalog from upstream — caiqinzhou
- Add Venice AI provider — Brokenc0de
- Add Kiro external_idp import for Microsoft SSO (CLIProxyAPI) — Stevanus Pangau
- Overhaul Blackbox provider catalog + WebUI test support — suryacagur

## Fixes
- Provider thinking compatibility (DeepSeek/Gemini) — Mink Nguyen
- Stop double-counting streaming usage at source — decolua
- Usage logging dedupe to reduce stats churn — Mink Nguyen
- Prevent non-JSON SSE lines / duplicate [DONE] from breaking clients (PR #2046) — qianze
- Resolve Gemini TTS models from catalog — nguyenha935
- Support Kiro IDC (organization) token import — quanturbo
- Preserve forced streaming for JSON clients (#2031) — Joseph Yaksich
- Preserve Responses text format (Codex) — tenglong
- Support Gemini native TTS generateContent endpoint — nguyenha935
- Add missing zh-CN endpoint key label (i18n) — weimaozhen
- CodeBuddy: only send reasoning params when client requests reasoning (#2071) — Rex
- CodeBuddy CN: show one-shot bonus packs as expiring, not monthly-replenishing
- Show custom provider models in combo picker — Sapto
- Docker: add docker-compose.yml with headroom enabled by default — nitsuahlabs
- Clarify token diagnostics vs provider billing (headroom, #1998) — Sutarto Jordan Chrisfivo
- Translate openai-responses input through OpenAI for compression (#1998) — Ankit
- Kiro: report 1M context window for claude-opus-4.8 — EdisonPVE
- Avoid stale redirects after auth changes (#2100) — Emirhan
- Mark Claude Opus 4.7 (dashed id) as 1M context — Brokenc0de
- Preserve reasoning effort through Codex translations — ntdung6868
- Token-saver: full width card layout — decolua
- Antigravity: retry transient upstream failures — Sutarto Jordan Chrisfivo
- Param-support: handle strip rules without match/drop (#1960) — Joseph Yaksich
- Translator: resolve custom provider prefix in debug endpoint (#1083) — hamsa0x7

# v0.5.8 (2026-06-21)

## Features
- **Antigravity**: native image generation support (image models tagged kind:image, hiển thị trong media-providers UI)
- **CodeBuddy CN**: API key auth + credit quota tracker
- **CodeBuddy CN**: short model prefix alias "cbcn"

## Fixes
- **MiniMax-M3**: enable vision capability
- **Headroom**: support Docker sidecar proxy
- **Antigravity**: image executor fixes
- **mimo-free**: Chrome User-Agent rotation to bypass anti-abuse gate
- **cloudflare-ai**: flatten content-part arrays to string to avoid oneOf 400 (#1926)
- **Translator**: normalize tools to Anthropic-native shape for non-Anthropic providers
- **CLI**: handle Next.js 16 nested standalone output path (#1940)
- **Codex**: preserve custom tools during request normalization
- **next.config**: add new route for responses endpoint to API

# v0.5.6 (2026-06-20)

## Features
- **Ponytail**: minimalist code generation feature
- **Headroom**: proxy lifecycle management + dashboard UI (one-click start/stop, install detection, status probing, token saver, claude↔openai shape conversion)
- **CodeBuddy CN**: new OAuth provider (copilot.tencent.com) — 15-model catalog, /v2 inference, forced streaming, OpenAI-style reasoning
- **OpenCode-Go**: align models with official endpoints; route Qwen 3.7 MiniMax via /v1/messages, GLM/Kimi/DeepSeek/MiMo via /chat/completions

## Fixes
- **Anthropic-compatible validation**: use POST /v1/messages (GET /models not spec, false "invalid" for valid keys)
- **CLI tools**: tolerate JSONC configs in all 8 settings routes (opencode, openclaw, kilo, droid, cowork, copilot, claude, cline)
- **Gemini/Antigravity**: preserve 'pattern' in tool schema translation (glob/grep)
- **Combo/Fusion**: flatten Anthropic-style tool messages in panel calls (prevent 503)
- **Models**: store provider custom models by provider scope
- **Perplexity**: use /v1/models endpoint for key validation

# v0.5.4 (2026-06-18)

## Fixes
- **Kiro**: honor thinking effort budgets
- **AG/Kiro/Xiaomi**: provider fixes
- **Combo/Fusion**: flatten tool history in panel calls to prevent 503
- **LLM selector**: show custom vision models in selector and model list
- **Image**: prevent compatible nodes from shadowing provider aliases

# v0.5.2 (2026-06-17)

## Features
- **Combo Fusion strategy** — fans the prompt out to all member models in parallel, then a configurable judge model synthesizes one final answer (quorum-grace, anonymized sources, graceful degradation)
- **Per-combo strategy selector** — pick `fallback` / `round-robin` / `fusion` / `capacity` per combo (replaces the old round-robin toggle), with a judge picker for fusion
- **Capacity auto-switch** — reorders models per request so images/PDFs route to capable models first
- **Kiro headless API-key auth** (`ksk_`) + direct `claude↔kiro` route that avoids the lossy OpenAI two-hop pivot
- **Claude auto-ping** — warms the 5h quota window right after reset so a fresh window starts immediately (per-connection toggle)

## Fixes
- **Claude 429**: stop hammering the OAuth usage endpoint — cache resetAt, throttle quota refresh to 3 min, cool down after a 429 (chat unaffected)
- **Usage logs always empty**: missing `await` on `getAdapter()` in `getRecentLogs` made `/api/usage/logs` & `/api/usage/request-logs` return nothing
- **Executors**: strip params unsupported by the provider/model (drops deprecated `temperature` for claude-opus-4 → Anthropic 400)
- **Translator**: derive deterministic tool_call ids for gemini/antigravity → OpenAI so function call/response pair correctly (fixes tool-pairing 400s)
- **Antigravity**: strip `optional` from tool schemas before sending to Gemini
- **Claude-to-OpenAI**: handle OpenAI-format responses in the non-streaming path (e.g. xiaomi-tokenplan)
- **Usage views**: show edited connection names consistently across Providers & Quota Tracker
- **Security**: hardened reverse-proxy local-access trust
- **Security**: SSRF hardening on web fetch

## Internal
- Large **open-sse / translator refactor** (~40 commits): unified provider/model registry (LiteLLM-style `models[]` + `kind` field, 100 co-located registry files), single-sourced media/OAuth/refresh/token URLs, registry-based dispatch for usage & token-refresh, DRY translator concerns (buildUsage, encodeDataUri, finishReasonMap, chunkBuilder, reasoningDelta…), ESM-safe registry init, large-file splits, dead-code removal, and golden/no-regression test gates

# v0.4.80 (2026-06-13)

## Features
- Vercel AI Gateway: support embeddings, images and credit usage (#1183)
- Add MiMo Free no-auth provider (#1789)
- Vertex: support ADC `authorized_user` credential
- Cowork: re-enable Claude Cowork with preset-only stdio MCP
- Codex: bulk add accounts via JSON (#1719)
- Kiro: enable multi-endpoint failover for GenerateAssistantResponse (#1722)

## Fixes
- Security: re-auth on DB export/import + SSRF guard on web fetch
- Auth: real client IP rate-limiting + remote default-password guard
- Cerebras/Mistral: strip unsupported `client_metadata` from downstream requests (#1742)
- SiliconFlow: update baseUrl `.cn` -> `.com` + curate verified model list (#1760)
- Gemini-to-OpenAI: route unsigned thought parts to `reasoning_content` (#1752)
- Claude-to-OpenAI: strip Anthropic billing header from system prompt (#1765)
- Anthropic-compatible: send Bearer auth for third-party gateways (#1795)
- Usage-stats: avoid partial stats on initial SSE race (#1767)
- Proxy: use `export default` in proxy.js for Next.js 16 middleware detection
- Claude passthrough: add body normalization
- GitHub Copilot: refresh missing/expired token on models discovery (#1727) + add mappable gpt-5-mini/gpt-5.4-nano slots for Copilot MITM (#1653)
- Kiro: auto-resolve profileArn to prevent 403 on IDC login, enhance profile ARN resolution, update endpoint to `runtime.us-east-1.kiro.dev` (#1713)
- Tunnel: detect system-installed Tailscale via dual-socket probe (#1723) + non-blocking probes to prevent UI freeze
- CommandCode: force `stream=true` in transformRequest (#1706)
- Qoder: increase timeouts for reasoning models and improve stream handling
- Dashboard: show provider node name instead of connection name in topology (#1770) + show explicit `kind="llm"` combos on combos page (#1684)

## Docs
- README: add Indonesian 9Router tutorial video (#1709)

# v0.4.71 (2026-06-06)

## Features
- Caveman: add wenyan classical Chinese levels and sync upstream prompts; locale-based visibility on endpoint page
- i18n: endpoint exposure notice across multiple languages + Russian README
- Antigravity: add gemini-3.5-flash-extra-low (Low) model
- xiaomi-tokenplan: add Claude-native MiMo V2.5 Pro alias via dedicated executor
- Qoder: fetch latest model + dashboard import-model button (#1642)
- MiniMax: add MiniMax-M3 + update Quota Tracker coding/CN (#1631)

## Fixes
- Codex: harden streaming timeouts (stall/connect raised to 60s, configurable per-provider), accept `response.done` event, and always emit a terminal `response.failed` + `[DONE]` for Responses passthrough when a stream closes, stalls, or aborts before a terminal event — prevents codex clients from hanging (#1648, #1680, #1688, #1618)
- Codex: durable OAuth refresh lifecycle (#1664)
- Tunnel: skip virtual interfaces to prevent false netchange watchdog
- Claude: fix forced tool_choice 400 on cc/ OAuth route (#1592)
- Proxy: raise Next client body limit to 128MB via `NINEROUTER_PROXY_CLIENT_MAX_BODY_SIZE` (#1529, #1572)
- MiniMax: echo `reasoning_content` on follow-up turns to avoid 400 (#1543)
- Kiro: handle 400 on tool-bearing history without client tools; add mappable "auto" model slot; fix binary EventStream crash + add models & TTS tool filtering
- Antigravity: passthrough tab-autocomplete + mark default agent slot mandatory
- Qoder: allow `qmodel_latest` model key (#1638)
- Providers: restore one-connection guard for compatible/embedding nodes
- Model-test: route image/STT probes to their real endpoints, harden STT ping; add opencode-go + xiaomi-tokenplan to connection test (#1576, #1628)

## Improvements
- Dashboard: reorganize menu actions across sidebar/header/profile
- Translator: add data-driven coverage, bug-exposing cases, and real provider smoke tests

# v0.4.66 (2026-05-29)

## Features
- Add Qoder provider: device-flow OAuth, COSY signing, WAF-bypass body encoding, live model catalog, dashboard quota tracker, 11 models (#1372)
- Add new models: Claude Opus 4.8 (Claude Code), GPT 5.4 Mini (Codex)

## Fixes
- DeepSeek thinking mode: echo `reasoning_content` back on follow-up/tool-call turns so OpenCode-free and custom providers no longer 400 with "reasoning_content must be passed back" (#1543)
- Reasoning injector: match deepseek/kimi model ids case-insensitively (covers custom providers using capitalized model names)
- OpenCode suggested-models: include free models without the `-free` suffix, e.g. `big-pickle` (#1535)

## Improvements
- Codex: trim sunset models, keep gpt-5.5 / gpt-5.4 / gpt-5.3-codex family, add gpt-5.4-mini
- volcengine-ark: refresh model list (add DeepSeek-V4-Flash/Pro, drop EOL entries)
- Lower stream stall timeout 35s → 30s for faster hang detection

# v0.4.63 (2026-05-26)

## Fixes
- GitHub Copilot: never route Gemini/Claude models to the `/responses` endpoint; prevents misleading "does not support Responses API" 400s (#1062)
- proxyFetch: restore missing `Readable` import causing runtime `ReferenceError` in DNS-bypass fetch path

## Improvements
- Lower stream stall timeout from 60s → 35s for faster hang detection

# v0.4.62 (2026-05-26)

## Fixes
- Codex: auto-retry when upstream drops mid-stream (no more hangs)
- Codex: fix random 400/404 errors, tool-calling failures, and unstable prompt cache
- MITM: support Antigravity 2.x 
- Sanitize Read tool args to prevent retry loops from non-Anthropic models (#1144)
- Implement json_schema fallback for OpenAI-compatible providers without native Structured Output (#1343)
- Strip empty Read pages argument in OpenAI-to-Claude translator (#1354)
- Forward Gemini output dimensions for embeddings (#1366)
- Resolve setState-in-effect errors in dashboard components (#1362)
- Gemini CLI: reuse stored OAuth project IDs for quota checks and show clearer setup guidance when the project is missing (#1271, #1428)

## Features
- Add Cloudflare Workers proxy deployer and pool integration (#1360)
- Add Deno Deploy relays support and improved proxy pools dashboard layout (#1437)

## Improvements
- Refactor Tunnel into dedicated Cloudflare and Tailscale manager modules
- Refactor tokenRefresh service with in-flight dedup to prevent refresh_token_reused errors

# v0.4.59 (2026-05-21)

## Fixes
- OAuth: fix login flow on Windows

# v0.4.58 (2026-05-21)

## Features
- xAI Grok provider (OAuth, API key, image)
- Provider limits: paginated accounts with page size controls

## Fixes
- Tailscale: fix connection status on Windows (#1300)
- Tunnel: fix false "checking" when tunnel URL is reachable
- Stream: fix pipe errors on client disconnect/abort

# v0.4.55 (2026-05-18)

## Features
- Xiaomi MiMo Token Plan: region selector (Singapore / China / Europe) — keys are cluster-specific
- Antigravity: risk confirmation dialog before first connection
- Gemini CLI: surface upstream retry delay on 429 errors

## Fixes
- MITM: cannot kill process on macOS under sudo (lsof not found in PATH)
- Stream: false-positive stall timeout on Claude reasoning / Kiro responses
- Tunnel: cannot re-enable after disable (stuck state)
- Tunnel: cloudflared error messages now include log tail for easier debugging
- Language switcher: applies selected locale immediately on close (#1234)
- Antigravity OAuth: metadata now matches the official client

## Improvements
- Gemini CLI: bump engine to 0.34.0
- Re-hide `qwen` (OAuth EOL) and `iflow` (not ready) providers

# v0.4.52 (2026-05-17)

## Features
- Add Vercel AI Gateway provider support (#1183)
- rtk: Kiro format tool result compression — handle conversationState.history & currentMessage, preserve error results, ~13.6% savings (#1194)

## Fixes
- openclaw: normalize agent.model object form `{primary, fallbacks}` before .startsWith → fix TypeError & 'not configured' status (#1216)
- Usage Details pagination: stay inside mobile viewport <640px (#1218)
- Fix test model error
- Fix MIMO provider in Codex
- Disable log file creation when using MITM AG

# v0.4.50 (2026-05-16)

## Fixes
- Fix duplicate tray icon on macOS when hiding to tray
- Fix tray not showing in background mode on macOS
- Fix hide to tray broken on Windows/Linux
- Fix Shutdown button in web UI not working

# v0.4.49 (2026-05-16)

## Features
- Add Kiro provider support: full request/response translation, live model listing, reasoning content support
- Add `buildOutput` RTK filter with autodetect for npm/yarn/cargo build logs
- Add MITM warning notification in tray and dashboard

## Improvements
- Add modalities (input/output) to model configuration for OpenCode
- Fix tray hide-to-tray: keep current process alive instead of spawning detached child (fixes macOS NSStatusItem ghost icon)
- Fix tray kill: graceful shutdown with SIGTERM/SIGKILL escalation
- Fix SIGHUP handling so macOS terminal close doesn't kill tray process
- Hide deprecated providers (qwen, iflow, antigravity)
- Update i18n across 32 languages

## Fixes
- Fix model check (test-models) blocked by dashboardGuard: pass machineId-based CLI token in internal self-calls

# v0.4.46 (2026-05-15)

## Breaking Changes
- Tunnel public URL changed — old tunnel links no longer work, please reconnect to get the new URL
