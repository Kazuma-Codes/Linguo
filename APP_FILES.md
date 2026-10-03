# App — File-by-File Guide (`app/`)

> Stack: Expo SDK ~57 + Expo Router + React Native 0.86 + React 19 + Zustand 5 + TypeScript strict.
> Identity: `Mosaic / mosaic-chat v1.0.0`. Path alias: `@/* → ./src/*`, `@/assets/* → ./assets/*`.
> Entry: `src/app/_layout.tsx → index.tsx`. Chat: `src/app/chat/[roomId].tsx`.
> Total hand-written files: ~35 src+root (excluding `node_modules/`). Assets (~24 images) listed per-file below.
> Pattern: every message goes `send_draft → draft_ready preview → confirm_draft → message_finalized` over WebSocket, per-recipient translation + cultural footnotes.

```
app/
├── package.json, package-lock.json, app.json, tsconfig.json,
│   eslint.config.js, expo-env.d.ts, .env.example, .gitignore,
│   AGENTS.md, CLAUDE.md, README.md, LICENSE
├── android/ (CNG generated)
├── assets/images/*, assets/expo.icon/*
└── src/
    ├── app/_layout.tsx, index.tsx (1111 lines hub), chat/[roomId].tsx
    ├── store/useAuthStore.ts, useChatStore.ts
    ├── lib/api.ts, config.ts, languages.ts
    ├── constants/theme.ts, global.css
    └── components/MessageBubble.tsx, DraftPreview.tsx, Footnotes.tsx, Composer.tsx, ...
```

Flow: `app.json(extra.apiUrl) + .env(EXPO_PUBLIC_API_URL) → lib/config → API_BASE_URL → lib/api → index.tsx + [roomId].tsx`; `WS_BASE_URL → store/useChatStore → [roomId].tsx → MessageBubble/DraftPreview → Footnotes`.

---

## 1. Root Configs / Meta / Docs

### `app/package.json`
**Purpose:** Expo app manifest.
**Key:** `name:app, main:expo-router/entry`; deps `expo ~57.0.25, expo-router/auth-session/constants/font/glass-effect/image/image-picker/linking/secure-store/splash-screen/status-bar/system-ui/web-browser, @expo/ui/vector-icons, react 19.2.3, RN 0.86.3, safe-area-context, zustand 5`; scripts `start/android/ios/web/lint`.
**Connects to:** All `src/*` via `expo start`; native modules need dev-build (see `AGENTS.md`).

### `app/package-lock.json`
**Purpose:** Pinned tree for reproducible `npm install`. Do not hand-edit.
**Connects to:** Generated from `package.json`.

### `app/app.json`
**Purpose:** Expo config — identity, scheme, icons, plugins, web output.
**Key:** `Mosaic/slug mosaic-chat, scheme:mosaic, userInterfaceStyle:automatic, ios.bundleIdentifier com.mosaic.chat, android.package com.mosaic.chat` (note duplicate key also `com.anonymous.mosaicchat` — latter wins, fix to single value), adaptive icons, `web.output:static`, plugins `expo-router/splash-screen/secure-store/web-browser`, `extra.apiUrl:localhost:8000`, `experiments.typedRoutes+reactCompiler`.
**Connects to:** `lib/config.ts` fallback `extra.apiUrl`; `src/app/_layout.tsx` splash/router.

### `app/tsconfig.json`
**Purpose:** Strict TS + aliases.
**Key:** Extends `expo/tsconfig.base`, `strict:true`, paths `@/*:./src/*`, `@/assets/*:./assets/*`, includes `**/*.ts(x)`, `.expo/types`, `expo-env.d.ts`.
**Connects to:** All `@/...` imports.

### `app/eslint.config.js`
**Purpose:** Flat lint config.
**Key:** `defineConfig([eslint-config-expo/flat, {ignores:dist/*}])`.
**Connects to:** `npm run lint`; all `src/**`.

### `app/expo-env.d.ts`
**Purpose:** Expo type refs (do not edit).
**Key:** `/// <reference types="expo/types" />`.
**Connects to:** Included by `tsconfig.json`.

### `app/.env.example`
**Purpose:** Env contract for mobile (LAN-IP note for devices).
**Key:** `EXPO_PUBLIC_API_URL=http://localhost:8000` (+ LAN-IP comment), empty `EXPO_PUBLIC_GOOGLE_{WEB,ANDROID,IOS}_CLIENT_ID`.
**Connects to:** Read by `src/lib/config.ts`; Google IDs gate `Google.useAuthRequest` in `index.tsx`.

### `app/.gitignore`
**Purpose:** Excludes `node_modules/, dist/, .expo/, local env` from git.
**Connects to:** Git only.

### `app/AGENTS.md` (41 lines)
**Purpose:** Mobile-first contributor rules.
**Key:** Do not trust training data for Expo SDK → check `expo` major, fetch versioned docs + `llms.txt`; use `npx expo install`, `expo start/lint`, `tsc --noEmit`, `expo-doctor`; routing in `src/app/`; EAS builds; CNG (`android/` generated — don't hand-edit); dev-build needed for native modules.
**Connects to:** Governs all `app/` edits; referenced by `CLAUDE.md`.

### `app/CLAUDE.md` (1 line)
**Purpose:** Delegate to `AGENTS.md`.
**Key:** `@AGENTS.md`.
**Connects to:** AI assistant entry.

### `app/README.md` (49 lines)
**Purpose:** Default `create-expo-app` readme (not Mosaic-specific).
**Key:** Install/start/lint/test links.
**Connects to:** None specific.

### `app/LICENSE`
**Purpose:** License text (MIT-style default).
**Connects to:** Distribution only.

### `app/.vscode/` (settings)
**Purpose:** Editor defaults only, no runtime effect.

### `app/.claude/` (agent folder)
**Purpose:** Local AI agent scratch/settings, no runtime effect.

---

## 2. `src/app/` — Expo Router Routes (3 files)

### `src/app/_layout.tsx`
**Purpose:** Root navigator + auth hydration gate + splash control.
**Key:** `default RootLayout()`; `SplashScreen.preventAutoHideAsync()` then `useAuthStore(s=>hydrate)` → `hideAsync()` in `useEffect`; blocks render (`return null`) until `hasHydrated`; `<Stack screenOptions={{headerShown:false}}>` with `index` + `chat/[roomId]` (`headerShown:true, title:'Chat'`).
**Connects to:** `@/store/useAuthStore`, `expo-router`, `expo-splash-screen`.

### `src/app/index.tsx` (1111 lines, God-screen)
**Purpose:** Auth screen + 5-tab home shell: `chats | contacts | groups | settings | profile(+edit/security/notifications/privacy subs)`.
**Key:** `default Home()`, `avatarColor(name)`, `RoomAvatar({title,size})`, `makeStyles(c)`; Auth `handleAuth()` (login/register→`getMe`→`setAuth`), Google PKCE `Google.useAuthRequest` + `AuthSession.exchangeCodeAsync` → `googleLogin(idToken)` → `getMe` → `setAuth` (guarded by `googleIdConfigured`); Data `load() = Promise.all([listRooms, listDiscoverableRooms, listContacts, listContactRequests])`; Chats `filteredRooms, handleCreateRoom, handleJoin(id), handleJoinByCode()` (UUID regex extract, conflict→navigate); Contacts `handleFindFriends(searchUsers), handleAddFriend, handleRequest(id,accept), handleOpenDirectChat(getOrCreateDirectRoom)`; Settings `notificationsOn, enterToSend, demoMsg, handleLangChange(updatePreferredLanguage+setLang), SUPPORTED_LANGUAGES chips`; Profile `openEditProfile, handleChangePhoto(expo-image-picker base64 dataUrl → updateProfile → updateUser), handleSaveProfile`.
**Connects to:** `@/store/useAuthStore`, `@/constants/theme`, `@/lib/api` (13 fns), `@/lib/languages`, `@/lib/config` (imported), `expo-router/router`, `Ionicons`.

### `src/app/chat/[roomId].tsx` (132 lines)
**Purpose:** Single room screen: history + live WS + AI-draft composer.
**Key:** `default ChatRoom()`, `makeStyles(C)`; Params `useLocalSearchParams<{roomId}>`; stores `useAuthStore(token,user)`, `useChatStore(messages,drafts,isConnected,typingUser,setInitialMessages,connect,disconnect,sendDraft,confirmDraft,sendTyping,sendReadAck,removeDraft)`; Mount `Promise.all([getRoom, getRoomMessages])` → `setTitle, setIsDirect, setInitialMessages(history,user.email)`; `connect(roomId,token,user.email)`; cleanup `disconnect()`; auto `sendReadAck` for every `!is_me && status==='final' && delivery_status!=='read'` when `isConnected`; UI header `●/○`, subtitle `Direct message` vs `{LANGUAGE_MAP[myLang]}·auto-translated`, `FlatList<MessageBubble>`, `drafts.map(DraftPreview)`, composer (`TextInput`+`sendTyping(true)` → `sendDraft` = "AI Draft").
**Connects to:** Stores, `@/lib/api`, `@/lib/languages`, `@/components/MessageBubble`, `@/components/DraftPreview`.

---

## 3. `src/store/` — Zustand (2 files)

### `src/store/useAuthStore.ts` (89 lines)
**Purpose:** Persistent JWT + user profile (SecureStore vs localStorage).
**Key:** `interface AuthUser{id,email,username?,avatar_url?,about?,phone?,preferred_language?}`; `useAuthStore{token,user,hasHydrated,setAuth,setLang,updateUser,logout,hydrate}`; `KEY='mosaic-auth'`; `save/load/clear` via `SecureStore` (native) vs `localStorage` (web); `setLang/updateUser` patch + re-save.
**Connects to:** Used by `_layout.tsx`, `index.tsx`, `[roomId].tsx`.

### `src/store/useChatStore.ts` (190 lines)
**Purpose:** Per-room WebSocket state machine + normalization.
**Key:** `interface Footnotes{humor_explanation?,idiom_breakdown?,etiquette_warning?}`, `interface ChatMessage{id,sender_email,sender_username?,original_text,translated_text?,translations?,detected_lang?,cultural_footnotes?,delivery_status?,is_me,status:'draft'|'final',created_at?}`; `useChatStore{messages,drafts,isConnected,typingUser,setInitialMessages,connect,disconnect,sendDraft,confirmDraft,sendTyping,sendReadAck,removeDraft}`; module `ws`, `pingTimer`; `normalize(data,myEmail,status)`, `ts(v)`; URL `${WS_BASE_URL}/api/v1/ws/chat/${roomId}?token=`; `ping` every 25s; handlers `pong ignore, typing, read_ack (mark all is_me with ts<=cutoff as read), message_deleted, draft_ready (own only, upsert drafts), message_finalized (upsert messages, remove drafts)`.
**Connects to:** `@/lib/config(WS_BASE_URL)`; consumed by `[roomId].tsx`; types consumed by `MessageBubble/DraftPreview/Footnotes`.

---

## 4. `src/lib/` (3 files)

### `src/lib/api.ts` (88 lines)
**Purpose:** Single REST client for backend `/api/v1`.
**Key:** `class ApiError(message,status)`; `login(email,password)` (form-urlencoded `/auth/login`), `register, getMe, googleLogin(idToken), updatePreferredLanguage, updateProfile({username,avatar_url,about,phone}), listRooms, listDiscoverableRooms, createRoom(title,source_lang), joinRoom, getRoom, getRoomMessages, getOrCreateDirectRoom, searchUsers, listContacts/listContactRequests (.catch(()=>[])), addContact, accept/declineContactRequest`; internal `apiFetch(path,token,options)` adds JSON + `Bearer`, parses `message/detail` on error, handles 204/empty.
**Connects to:** `./config(API_BASE_URL)`; used almost exclusively by `index.tsx + [roomId].tsx`.

### `src/lib/config.ts` (28 lines)
**Purpose:** Env → HTTP/WS base URLs.
**Key:** `API_BASE_URL` (ensures `/api/v1` suffix), `WS_BASE_URL`; `raw = EXPO_PUBLIC_API_URL || extra.apiUrl || localhost:8000`; `toHttp/toWs` converters; handles `ws(s)` input.
**Connects to:** Used by `api.ts`, `useChatStore.ts`. Fallback `extra.apiUrl` from `app.json`.

### `src/lib/languages.ts` (23 lines)
**Purpose:** Language catalogue (mirrors backend + web).
**Key:** `interface LanguageOption{code,name}`, `SUPPORTED_LANGUAGES[12]` (en,es,fr,de,pt,ja,zh,hi,ar,ru,it,ko), `LANGUAGE_MAP: Record<code,name>`.
**Connects to:** `index.tsx` (chips), `[roomId].tsx` + `MessageBubble.tsx` (labels).

---

## 5. `src/components/` — Chat-specific (3) + Template (7)

### `src/components/MessageBubble.tsx` (98 lines)
**Purpose:** Translated-first bubble with read-ticks + expandable original/notes.
**Key:** `MessageBubble({message:ChatMessage,myLang})`; `primary = is_me ? original_text : translations[myLang]||translated_text||original_text`; `formatTime`; ticks `read→green checkmark-done, delivered→grey done, else checkmark`; `expanded` drawer shows `Original (LANG)` + `<Footnotes>`.
**Connects to:** Store types, `@/lib/languages`, `@/constants/theme`, `./Footnotes`.

### `src/components/DraftPreview.tsx` (63 lines)
**Purpose:** Editable AI-translation confirmation card.
**Key:** `DraftPreview({draft,onConfirm(id,edited),onCancel(id)})`; `firstTranslation = Object.values(translations)[0]||translated_text`; local `edited` synced on `draft.id`; shows `Original`, editable `TextInput`, `<Footnotes>`, `Confirm & Send / Cancel`.
**Connects to:** `[roomId].tsx → confirmDraft/removeDraft`.

### `src/components/Footnotes.tsx` (34 lines)
**Purpose:** Cultural-notes box (`Humor/Idiom/Etiquette`).
**Key:** `Footnotes({footnotes?:FN|null}) → null` if empty.
**Connects to:** `MessageBubble`, `DraftPreview`.

---

## 6. `src/constants/`, `src/global.css`

### `src/constants/theme.ts` (47 lines)
**Purpose:** Single theme source (mirrors web `globals.css` vars).
**Key:** `Colors{light,dark}` (primary `#6C5CE7/#7C6EF7`, `primarySoft, text/background/backgroundElement/backgroundSelected/textSecondary/card/border/accent` + `chatBg/chatCard/bubbleMe/bubbleMeText/bubbleOther/bubbleOtherText` mirroring web). Imports `@/global.css` (side-effect).
**Connects to:** All screens/components via `makeStyles(c)` / `useTheme`.

### `src/global.css` (9 lines)
**Purpose:** Font vars only.
**Key:** `:root --font-display/mono/rounded/serif`.
**Connects to:** Imported by `theme.ts`.

---

## 7. `android/`, `assets/`

### `app/android/` (CNG generated)
**Purpose:** Native Android project generated by `npx expo prebuild` (Continuous Native Generation). Do not hand-edit; edit `app.json` instead.
**Connects to:** Built from `app.json + package.json`.

### `app/assets/images/icon.png`
**Purpose:** App launcher icon (1024px default).
**Connects to:** Referenced by `app.json icon/adaptiveIcon`.

### `app/assets/images/splash-icon.png`
**Purpose:** Splash-screen image.
**Connects to:** `expo-splash-screen` plugin + `_layout.tsx`.

### `app/assets/images/favicon.png`
**Purpose:** Web favicon.
**Connects to:** `app.json web.favicon`.

### `app/assets/images/adaptive foreground/background/monochrome` — `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`
**Purpose:** Android adaptive-icon layers.
**Connects to:** `app.json android.adaptiveIcon`.

### `app/assets/images/react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png`
**Purpose:** Template demo logos (unused by Mosaic screens).
**Connects to:** None (template leftover).

### `app/assets/images/expo-logo.png`, `expo-badge.png`, `expo-badge-white.png`
**Purpose:** Template badges; `expo-badge*.png` used by `web-badge.tsx` (broken alias, see above).
**Connects to:** `web-badge.tsx`.

### `app/assets/images/logo-glow.png`
**Purpose:** Decorative glow (template).
**Connects to:** None specific.

### `app/assets/images/tutorial-web.png`
**Purpose:** Template tutorial art (unused).
**Connects to:** None.

### `app/assets/images/tabIcons/home.png`, `home@2x.png`, `home@3x.png`, `explore.png`, `explore@2x.png`, `explore@3x.png`
**Purpose:** Tab-bar icons at 1x/2x/3x densities (template set; Mosaic `index.tsx` uses `Ionicons` instead).
**Connects to:** None currently (reserved).

### `app/assets/expo.icon/icon.json`, `app/assets/expo.icon/Assets/grid.png`, `app/assets/expo.icon/Assets/expo-symbol 2.svg`
**Purpose:** iOS icon-composer source.
**Connects to:** Xcode icon generation only.

---

## 8. Cross-File Dependency Map

```
app.json(extra.apiUrl) + .env(EXPO_PUBLIC_API_URL) → lib/config → API_BASE_URL → lib/api → index.tsx + [roomId].tsx
                                                              ↘ WS_BASE_URL → store/useChatStore → [roomId].tsx → MessageBubble/DraftPreview → Footnotes
lib/languages → index.tsx(chips) + [roomId].tsx(subtitle/placeholder) + MessageBubble(translated-from)
store/useAuthStore → _layout(hydrate/splash) + index(auth/tabs/profile) + [roomId](myLang/myEmail/token)
constants/theme → every screen/component styling (Colors + makeStyles)
```

---

## 9. Generated / Excluded (folder-level summary)

### `app/node_modules/`
**Purpose:** Installed deps (`expo, react-native, zustand`, etc.). Thousands of files, regenerated by `npm install`. Do not edit or document per-file.

### `app/.expo/`
**Purpose:** Expo dev cache + types (`.expo/types`). Regenerated by `expo start`. Do not edit.

### `app/dist/` (when built)
**Purpose:** `expo export` web output (`web.output:static`). Regenerated, do not edit.
