# Bring your own models

The starter does not select or recommend a provider or model.
Configure one or more coding models, then choose between them in the composer.
Intelligence Learning has separate configuration.

## Coding configuration

1. Copy `models.example.json` to `models.json`.
2. Replace the placeholder entry with your provider and model.
3. Add each referenced key to `.env`.
4. Set `defaultModel` to the ID that new conversations use.
5. Restart the app after configuration changes.

`models.json` and `learning.json` are ignored. `CODING_MODELS_FILE` can select another catalog path.
Custom paths are not automatically ignored. Keep private configuration outside tracked files.
An entry has these fields:

| Field       | Meaning                                                              |
| ----------- | -------------------------------------------------------------------- |
| `id`        | Stable local choice ID; letters, digits, hyphens, and underscores    |
| `label`     | Your name for the choice in the composer                             |
| `provider`  | Adapter type from the table below                                    |
| `model`     | Exact provider model ID                                              |
| `apiKeyEnv` | Environment variable containing this entry's key                     |
| `baseURL`   | Optional native endpoint override; required for compatible APIs      |
| `api`       | Compatible API protocol: `chat-completions` (default) or `responses` |

The template has no built-in provider or model default. Missing catalogs, invalid entries, or missing referenced keys stop startup with configuration guidance.
Several entries can use the same provider, endpoint, or key variable.
Use separate key variables when accounts differ.

| Adapter type        | TanStack implementation | Configuration                                       |
| ------------------- | ----------------------- | --------------------------------------------------- |
| `anthropic`         | `createAnthropicChat`   | Model ID and key reference                          |
| `gemini`            | `createGeminiChat`      | Model ID and key reference                          |
| `ollama`            | `createOllamaChat`      | Model ID; optional host and authentication key      |
| `openai`            | `createOpenaiChat`      | Native Responses API; model ID and key reference    |
| `openai-compatible` | `openaiCompatibleText`  | Model ID, endpoint, key reference, and API protocol |

This table lists implementations, not recommendations.
A compatible endpoint is an API contract, not a claim that every model supports coding tools.
For an unauthenticated compatible server, set its key variable to the placeholder that the server permits.
Ollama does not require a key for local access.
Check the provider's current official documentation for endpoints, IDs, account access, and supported features.
Coding uses streaming text and tool calls. Goals also use structured output to assess completion.

A catalog can contain several entries:

```json
{
  "defaultModel": "work",
  "models": [
    {
      "id": "work",
      "label": "Work endpoint",
      "provider": "openai-compatible",
      "model": "YOUR_MODEL_ID",
      "baseURL": "https://YOUR_PROVIDER_HOST/v1",
      "apiKeyEnv": "WORK_PROVIDER_API_KEY"
    },
    {
      "id": "local",
      "label": "Local endpoint",
      "provider": "ollama",
      "model": "YOUR_INSTALLED_MODEL_ID",
      "baseURL": "http://localhost:11434"
    }
  ]
}
```

The entries illustrate configuration shapes. Replace or remove them to match your choices.

## Composer selection

Choose **Model: [name]** beside the composer controls, then select a configured entry.
The choice belongs to that conversation and survives reloads and server restarts.
Other conversations retain their choices. New conversations use `defaultModel`.
The selector is unavailable during execution or pending approval.
A failed save retains the previous selection. Escape closes the selector and returns focus.

Changing models retains the conversation. TanStack handles provider metadata when it converts messages for the next provider.
Model capabilities and context limits still differ. A provider can reject history that exceeds its limits.
The selected model also checks goal completion; no hidden judge provider is required.
If a catalog entry is removed, the native harness drops that stored choice and uses the configured default.
Keep IDs stable when you want existing conversations to retain their selection.

## Learning configuration

Learning runs inside Intelligence, independently of the coding harness.
It can use a different provider, model, endpoint, and key.
The composer never changes Learning configuration.

1. Copy `learning.example.json` to `learning.json`.
2. Set the model and provider to your Learning choices.
3. Add the referenced key to `.env`.
4. Run `pnpm learning:config`.
5. Run `pnpm intelligence local setup --model-config .data/learning-model.json --json`.

The helper resolves `apiKeyEnv` and writes the CLI payload with mode 0600.
It does not contact a provider or configure the backend itself.
`LEARNING_MODELS_FILE` selects another input path; its default is `learning.json`.
The CLI validates the payload and supported models during setup.
Keep the generated file private: it contains the resolved key.

For native Learning providers, use `model: "PROVIDER/MODEL_ID"` and the matching `provider`.
Omit `baseUrl` and `api`. The pinned CLI requires native models from its installed catalog.
For example, the native Google provider identifier is `google`, while the coding adapter identifier is `gemini`.
These catalogs and identifiers belong to separate libraries.

For compatible Learning endpoints, use `provider: "compatible"`, `baseUrl`, and a provider-prefixed model ID.
The CLI uses `api: "openai-completions"` or `"openai-responses"`; these differ from coding catalog values.
Optional `contextWindow`, `maxTokens`, and `reasoning` describe endpoint capabilities.
If you specify either token limit, supply both, with `maxTokens` smaller than `contextWindow`.
The pinned CLI requires an endpoint for those overrides.
Unauthenticated endpoints can omit `apiKeyEnv`.

Learning requests originate inside containers. `localhost` there does not refer to your host model server.
Use an address reachable from the Learning container and verify connectivity on your platform.
Configuration success does not prove a Learning run. Inspect a real run and its evidence before publishing a Skill.

## Code-level design and extension

The implementation uses the published, pinned TanStack AI 1.0.0 and harness 0.1.0 sources.
The installed source is authoritative for this starter's experimental harness API.

`src/server/agent/models.ts` validates configuration and builds `AnyTextAdapter` values on the server.
`extendAdapter(factory, [createModel(id, ["text"])])` permits developer-specified IDs without casts to a stale model union.
This widens the factory's accepted IDs; it does not validate remote access or add provider capabilities.
For typed application-specific configuration, call a native factory with a literal ID directly.
[Adapter extension](https://tanstack.com/ai/latest/docs/advanced/extend-adapter) describes that distinction.

`defineHarness({ adapter, models })` supplies the default and named choices.
`session.updateThreadSettings({ settings: { model: id } })` validates and persists the selected ID in the native execution log.
`session.threadSettings()` reads it. This avoids a second routing system or browser-owned model state.
TanStack also offers `keyedAdapter` for per-user credentials. This trusted local starter keeps keys in server environment variables instead.
The older `modelPicker` plugin offers a plugin setting, but native thread settings also drive auxiliary model calls.
The installed goal plugin requires an explicit judge. `selectedModelGoal` captures the selected adapter at each turn's start.
Each session gets its own plugin instance, so concurrent conversations do not share the judge selection.

The authenticated `/api/model` endpoint exposes selection by workspace and thread.
The bootstrap exposes only IDs, labels, provider names, and model IDs.
Its legacy `model` field names the default model; `/api/model` returns the conversation selection.
Keys, environment-variable names, and endpoint URLs never enter browser configuration.
TanStack Query owns confirmed selection. CopilotKit v2 continues to own the transcript and interrupts.
[Runtime adapter switching](https://tanstack.com/ai/latest/docs/advanced/runtime-adapter-switching) explains provider metadata conversion across conversation history.

To add another native provider, install its published pinned adapter package and extend `src/server/agent/models.ts`.
Add its configuration schema branch and adapter factory without changing the composer or transcript ownership.
For AWS credential chains, custom headers, or other code-only configuration, construct a `ModelCatalog` and pass it to `startApp({ models })`.
That extension accepts any TanStack `AnyTextAdapter`; the JSON convenience layer does not limit the harness contract.
Keep provider-specific sampling options at the adapter/harness integration layer and verify their types against the installed package.
Do not force OpenAI option names onto other providers.
