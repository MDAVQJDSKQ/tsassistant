# Chat Application Troubleshooting and Enhancement Plan

This document outlines the plan to address two issues identified in the chat application: excessive API calls from the frontend and incorrect chat title reversion behavior.

## Issues Identified

1.  **Excessive API Calls (Frontend):**
    *   **Symptom:** The backend server logs show a high volume of `GET /api/conversations/.../config` requests for the same conversation ID, originating from the frontend. This was initially perceived as "port scanning" due to the changing ephemeral client ports.
    *   **Location:** [`frontend/src/app/simple-chatbot/page.tsx`](frontend/src/app/simple-chatbot/page.tsx)
    *   **Suspected Cause:** The `useEffect` hook at line [`385`](frontend/src/app/simple-chatbot/page.tsx:385) is likely re-triggering due to an unstable reference of the `loadConversationConfig` function, despite it being wrapped in `useCallback(..., [])`.

2.  **Chat Title Reversion (Frontend):**
    *   **Symptom:** AI-generated or UUID-based chat titles in the conversation list revert to a title derived from the first user message when a conversation is selected or its messages are updated.
    *   **Location:** [`frontend/src/app/simple-chatbot/page.tsx`](frontend/src/app/simple-chatbot/page.tsx)
    *   **Cause:** The `updateConversationMessages` function (lines [`165-177`](frontend/src/app/simple-chatbot/page.tsx:165-177)) unconditionally calls `getConversationTitle` (lines [`121-136`](frontend/src/app/simple-chatbot/page.tsx:121-136)), which prioritizes the first user message for the title, overwriting any existing AI-generated title.

## Investigation Summary

*   **Frontend Analysis ([`frontend/src/app/simple-chatbot/page.tsx`](frontend/src/app/simple-chatbot/page.tsx)):**
    *   Identified the `useEffect` hook (line [`385`](frontend/src/app/simple-chatbot/page.tsx:385)) calling `loadConversationConfig` as the source of the config API calls.
    *   Identified `updateConversationMessages` and `getConversationTitle` as responsible for the title reversion.
*   **Next.js API Route Analysis ([`frontend/src/app/api/conversations/[id]/config/route.ts`](frontend/src/app/api/conversations/[id]/config/route.ts)):**
    *   Confirmed it acts as a simple proxy to the Python backend.
*   **Backend Server Analysis ([`backend/backend_server.py`](backend/backend_server.py)):**
    *   The `/api/conversations/{conversation_id}/config` endpoint (lines [`449-456`](backend/backend_server.py:449-456)) and its helper `load_conversation_config` (lines [`164-174`](backend/backend_server.py:164-174)) are simple and do not initiate network scans.
*   **Backend Configuration Analysis ([`backend/config.py`](backend/config.py)):**
    *   No configurations found that would cause network scanning on port 50000.
*   **Log Analysis (User Provided):**
    *   Revealed that the "scanning" was actually numerous legitimate requests from the frontend to the backend's `/config` endpoint, distinguished by changing client-side ephemeral ports.

## Proposed Solutions

### 1. Address Excessive API Calls (Frontend)

*   **File:** [`frontend/src/app/simple-chatbot/page.tsx`](frontend/src/app/simple-chatbot/page.tsx)
*   **Goal:** Prevent the `useEffect` hook (line [`385`](frontend/src/app/simple-chatbot/page.tsx:385)) from making redundant calls to `loadConversationConfig`.
*   **Action:**
    1.  Investigate why the `loadConversationConfig` function reference, defined with `useCallback(..., [])` (lines [`49-60`](frontend/src/app/simple-chatbot/page.tsx:49-60)), might be changing across re-renders or if the `ChatPage` component is remounting.
    2.  Ensure `loadConversationConfig` maintains a stable reference. The `useCallback` hook with an empty dependency array `[]` is intended for this, so the investigation will focus on why this might not be behaving as expected in this context (e.g., component remounts, or subtle interactions with other hooks or state).
*   **Diagram:**
    ```mermaid
    graph TD
        A[Component Renders] --> B{loadConversationConfig ref stable?};
        B -- Yes (Target State) --> C[useEffect (line 385) runs only if activeConversation changes];
        C --> D[loadConversationConfig called once per activeConversation change];
        B -- No (Current Problem) --> E[useEffect (line 385) re-runs even if activeConversation is same];
        E --> F[loadConversationConfig called repeatedly];
        F --> G[Excessive API calls];
    ```

### 2. Address Chat Title Reversion (Frontend)

*   **File:** [`frontend/src/app/simple-chatbot/page.tsx`](frontend/src/app/simple-chatbot/page.tsx)
*   **Goal:** Preserve AI-generated or existing meaningful titles when a conversation's messages are updated.
*   **Action:**
    1.  Modify the `updateConversationMessages` function (around line [`171`](frontend/src/app/simple-chatbot/page.tsx:171)).
    2.  **New Logic:** Before setting the title, check if `conv.title` already exists and is not a default placeholder (e.g., "New Conversation", or a UUID prefix).
        *   If a meaningful title exists, retain `conv.title`.
        *   Otherwise, call `getConversationTitle(newMessages, conv.id)` to generate a new title.
*   **Diagram:**
    ```mermaid
    graph TD
        SA[Messages Updated for Active Conversation] --> SB{Conversation has existing meaningful title?};
        SB -- Yes --> SC[Keep existing title `conv.title`];
        SB -- No --> SD[Call getConversationTitle(newMessages, conv.id)];
        SD --> SE[Update title with result of getConversationTitle];
        SC --> SF[Conversation messages and title updated in state];
        SE --> SF;
    ```

## Next Steps After Plan Approval

1.  Write this plan to a markdown file (this step).
2.  Switch to "Code" mode to implement the proposed solutions.