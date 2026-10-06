import { ChatSession } from '../types';
import {
  ApiError,
  appendServerMessages,
  chatMeta,
  ChatSyncState,
  messageFingerprint,
  saveServerChat,
} from './api';

type UrlBuilder = (path: string) => string;

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Sync local chats to the server.
 *
 * Strategy:
 * - If only NEW messages were appended (no existing message changed), send just those
 *   via POST /chats/:id/append — the payload stays tiny.
 * - If existing messages changed (regenerate, edit, first-time save), fall back to a
 *   full PUT /chats/:id.
 * - Chats whose messages haven't been loaded yet (metadata-only) are skipped entirely.
 *
 * Messages are always sorted by `timestamp` before saving. This keeps the server-side
 * order consistent even when text replies and image generations happen quickly in the
 * same chat (they carry slightly different timestamps, and a stale in-memory order can
 * otherwise persist a wrong sequence).
 *
 * Returns false if a 401 (session expired) is encountered, true otherwise.
 */
export async function syncChatsToServer(
  chats: ChatSession[],
  synced: Map<string, ChatSyncState>,
  unloaded: Set<string>,
  getApiUrl: UrlBuilder
): Promise<boolean> {
  for (const chat of chats) {
    if (chat.isTemp) continue;
    if (chat.messages.length === 0) continue;
    // Chat metadata came from the server but messages haven't been fetched yet — skip.
    if (unloaded.has(chat.id)) continue;

    // Ensure messages are in strict chronological order before saving.
    // This prevents image and text messages from being saved out of sequence
    // when both are being generated in the same chat.
    const sortedMessages = [...chat.messages].sort((a, b) => a.timestamp - b.timestamp);

    const prev = synced.get(chat.id);
    const meta = chatMeta(chat);
    const fp = sortedMessages.map(messageFingerprint);

    // Nothing changed at all
    if (prev && prev.meta === meta && arraysEqual(prev.fp, fp)) continue;

    // Can we append? Only if:
    //   - we have a previous sync state
    //   - the previous fingerprint is a strict prefix of the new one (only new messages added)
    const canAppend =
      !!prev &&
      prev.fp.length > 0 &&
      prev.fp.length <= fp.length &&
      prev.fp.every((v, i) => v === fp[i]);

    try {
      if (canAppend && prev) {
        const baseCount = prev.fp.length;
        const newMsgs = sortedMessages.slice(baseCount);

        if (newMsgs.length === 0) {
          // Only meta (title / pin) changed — a light PUT keeps the server consistent.
          await saveServerChat(getApiUrl, chat);
        } else {
          try {
            const res = await appendServerMessages(getApiUrl, chat, baseCount, newMsgs);
            if (res?.skipped === 'trashed') {
              // Server had already trashed this chat — record state and move on.
              synced.set(chat.id, { fp, meta });
              continue;
            }
          } catch (e: any) {
            if (e instanceof ApiError && e.status === 409) {
              // Server count mismatch → resync with a full PUT.
              await saveServerChat(getApiUrl, chat);
            } else {
              throw e;
            }
          }
        }
      } else {
        // Full PUT — first save, or something deeper changed (regenerate / edit).
        await saveServerChat(getApiUrl, chat);
      }

      synced.set(chat.id, { fp, meta });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return false;
      console.error('Chat sync failed', e);
    }
  }
  return true;
}