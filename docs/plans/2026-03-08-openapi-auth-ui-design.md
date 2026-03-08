---
title: OpenAPI Auth Management UI Design
category: plan
status: draft
date: 2026-03-08
tags: [openapi, auth, v2.0]
---

# OpenAPI Auth Management UI Design

**Date:** 2026-03-08
**Status:** Draft
**Scope:** Auth management UI for the OpenAPI "Try It Out" feature (v2.0)
**Depends on:** Custom OpenAPI renderer (v1.6, done), Try It Out panel (v2.0, in progress)

---

## 1. Overview

This document designs the authentication UI that lets users configure and manage API credentials directly within Clearify's OpenAPI reference pages. Auth tokens are stored client-side, injected into Try It Out requests and code examples, and never leave the browser.

The design reads `components.securitySchemes` from the OpenAPI spec and presents the appropriate input UI for each scheme. Users authenticate once per spec, and the credentials apply globally to all operations — with per-operation overrides where the spec defines different `security` requirements.

---

## 2. Auth Methods Supported

All four standard OpenAPI 3.x security scheme types:

| Type | Subtype | UI |
|------|---------|-----|
| **HTTP Bearer** | `type: http, scheme: bearer` | Single token input with format hint (e.g. JWT) |
| **API Key** | `type: apiKey, in: header\|query\|cookie` | Key input + display of header/query param name |
| **OAuth2** | Authorization Code | Client ID/secret inputs + "Authorize" button → redirect flow |
| **OAuth2** | Client Credentials | Client ID/secret inputs + "Get Token" button → direct token fetch |
| **HTTP Basic** | `type: http, scheme: basic` | Username + password inputs, Base64-encoded for `Authorization` header |

Unsupported schemes (OpenID Connect discovery, mutual TLS) render a warning badge with a link to external docs.

---

## 3. UI Components

### 3.1 AuthPanel

Collapsible panel pinned below the `ApiHeader` component. Shows a summary of the current auth state (e.g. "Bearer token set", "No auth configured") and expands to reveal the full auth form.

```
┌─────────────────────────────────────────────────┐
│ 🔒 Authentication: Bearer token ✓  [Change ▾]  │
├─────────────────────────────────────────────────┤
│  (expanded: AuthMethodSelector + active form)   │
└─────────────────────────────────────────────────┘
```

- Collapsed by default when auth is already set
- Expanded by default on first visit (no stored credentials)
- Styled with `--clearify-bg-secondary` background, same border treatment as `OperationCard`
- Rendered via `AuthPanel.tsx` in `src/theme/components/openapi/`

### 3.2 AuthMethodSelector

Horizontal pill tabs (one per `securitySchemes` entry). If the spec only defines a single scheme, the selector is hidden and the form renders directly.

- Each pill shows the scheme name + type badge (e.g. "petstore_auth — OAuth2")
- Active pill highlighted with `--clearify-accent`
- Switching tabs preserves previously entered values for other schemes

### 3.3 TokenInput

Reusable secure input for bearer tokens and API keys:

- Monospace `<input type="password">` with a show/hide toggle (eye icon)
- "Paste" button for clipboard access
- "Clear" button to remove stored value
- Optional format hint below the input (from `bearerFormat` in the spec, e.g. "JWT")
- For API keys: read-only label showing the param name and location (e.g. "`X-API-Key` in header")

### 3.4 OAuth2Flow

Handles the interactive OAuth2 authorization:

- **Authorization Code flow:**
  1. User enters Client ID (and optionally Client Secret)
  2. Clicks "Authorize" → opens popup to `authorizationUrl` with configured scopes
  3. Popup redirects back to a callback page (`/__clearify/oauth-callback`)
  4. Callback extracts the `code`, exchanges it for a token via `tokenUrl`
  5. Token displayed in a read-only `TokenInput` with expiry countdown

- **Client Credentials flow:**
  1. User enters Client ID + Client Secret
  2. Clicks "Get Token" → `POST` to `tokenUrl` with `grant_type=client_credentials`
  3. Token displayed with expiry countdown

- Scope selector: checkboxes derived from `flows.*.scopes` in the spec
- Token refresh: automatic silent refresh when `refreshUrl` is present and token nears expiry

### 3.5 Layout Position

The `AuthPanel` renders between `ApiHeader` and the first `TagGroup`:

```
OpenAPIPage
├── ApiHeader
├── AuthPanel          ← new
├── TagGroup (Auth)
│   ├── OperationCard
│   └── OperationCard
├── TagGroup (Users)
│   └── ...
```

Per-operation security overrides show a small "Uses: {scheme}" badge in the `OperationCard` header, with a link that scrolls to the `AuthPanel`.

---

## 4. State Management

### 4.1 React Context

```typescript
interface AuthState {
  activeScheme: string | null;
  credentials: Record<string, SchemeCredentials>;
  resolved: {
    headers: Record<string, string>;
    query: Record<string, string>;
  };
}

// Provided by <AuthProvider> wrapping OpenAPIPage
const { authState, setCredentials, clearCredentials } = useAuth();
```

`TryItPanel` and `CodeExamples` consume `authState.resolved` to inject auth headers/params into requests and generated snippets.

### 4.2 Persistence

- **Storage key:** `clearify:auth:{specIdentifier}:{schemeName}`
- `specIdentifier` is derived from `info.title` + `info.version` (slugified)
- Bearer tokens and API keys stored in `localStorage`
- OAuth2 tokens stored with `expiresAt` timestamp; expired tokens are cleared on load
- Per-environment storage: if the user selects a different server from `spec.servers[]`, credentials are namespaced by server URL

### 4.3 Injection

When `authState` changes, `resolved` is recomputed:

| Scheme | Injection |
|--------|-----------|
| Bearer | `Authorization: Bearer {token}` header |
| API Key (header) | `{name}: {value}` header |
| API Key (query) | `?{name}={value}` query param |
| API Key (cookie) | `Cookie: {name}={value}` header |
| Basic | `Authorization: Basic {base64(user:pass)}` header |
| OAuth2 | `Authorization: Bearer {accessToken}` header |

---

## 5. Security Considerations

1. **No server-side storage.** Tokens never leave the browser. Clearify has no backend — all auth state lives in `localStorage`.
2. **localStorage warning.** The `AuthPanel` shows a subtle info notice: "Credentials are stored in your browser's localStorage. Do not use production tokens on shared machines."
3. **OAuth2 token expiry.** Tokens with `expires_in` are tracked with a countdown. Expired tokens are auto-cleared. Refresh is attempted silently if `refreshUrl` is available.
4. **XSS surface.** Tokens are read from `localStorage` only by Clearify's own JS. The `TokenInput` uses `type="password"` and never renders the raw token in the DOM (except when the user explicitly toggles visibility).
5. **Callback origin validation.** The OAuth2 callback page validates `window.opener` origin before passing the auth code back.
6. **CORS proxy.** OAuth2 token exchange may require a proxy if the token endpoint doesn't allow browser CORS. The existing `openapi.proxyUrl` config is reused for this.

---

## 6. Configuration

New `openapi.auth` section in `clearify.config.ts`:

```typescript
export default defineConfig({
  openapi: {
    spec: './openapi.yaml',
    proxyUrl: 'https://proxy.example.com',
    auth: {
      // Override or supplement securitySchemes from the spec
      defaults: {
        petstore_auth: {
          clientId: 'my-dev-client-id',
          scopes: ['read:pets', 'write:pets'],
        },
      },
      // Custom OAuth2 callback path (default: /__clearify/oauth-callback)
      callbackPath: '/__clearify/oauth-callback',
      // Disable auth UI entirely
      enabled: true,
      // Persist credentials across sessions (default: true)
      persist: true,
    },
  },
});
```

- `defaults` pre-fills form fields (not tokens themselves) to speed up dev workflows
- `enabled: false` hides the `AuthPanel` entirely (for read-only API docs)
- `persist: false` clears credentials on page unload (stricter security posture)

---

## 7. Implementation Phases

### Phase 1: Bearer Token & API Key (v2.0-alpha)

Simplest path to a working auth UI:

- [ ] `AuthProvider` context with `useAuth()` hook
- [ ] `AuthPanel` component (collapsible, summary badge)
- [ ] `AuthMethodSelector` (pill tabs from `securitySchemes`)
- [ ] `TokenInput` component (password input, show/hide, clear)
- [ ] `localStorage` persistence with spec-scoped keys
- [ ] Inject `resolved` headers into `TryItPanel` fetch calls
- [ ] Inject `resolved` headers into `CodeExamples` snippet generation
- [ ] `openapi.auth` config schema (Zod validation)

**Estimated effort:** 2-3 days

### Phase 2: OAuth2 Flows (v2.0-beta)

- [ ] `OAuth2Flow` component (Authorization Code + Client Credentials)
- [ ] OAuth2 callback page (`/__clearify/oauth-callback`)
- [ ] Scope selector UI (checkboxes from spec)
- [ ] Token expiry tracking + auto-refresh
- [ ] CORS proxy integration for token exchange
- [ ] Basic Auth input (username + password, Base64 encoding)

**Estimated effort:** 3-4 days

### Phase 3: Per-Operation Security Override (v2.0)

- [ ] Read `security` array on individual operations
- [ ] Show "Uses: {scheme}" badge in `OperationCard` header
- [ ] Override global auth with operation-specific scheme in `TryItPanel`
- [ ] Handle operations with `security: []` (no auth required — skip injection)
- [ ] Per-environment credential namespacing (by `servers[]` selection)

**Estimated effort:** 1-2 days

---

## Open Questions

1. **Multi-spec support.** If a Clearify site serves multiple OpenAPI specs, should auth be shared across specs with the same scheme names, or always isolated?
2. **Token import/export.** Should we support exporting stored credentials as a JSON blob for team sharing (encrypted)?
3. **Postman/Insomnia parity.** Are there auth UX patterns from those tools worth adopting (e.g., environment variables, auth inheritance)?
