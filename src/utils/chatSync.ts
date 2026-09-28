import { ChatSession } from '../types';
import {
  ApiError,
  ChatSyncState,
  appendServerMessages,
  chatMeta,
  messageFingerprint,
  saveServerChat,
} from './api';

// Logged-in user ki chats ko DB se sync karo. Normal case me sirf NAYE messages bhejta hai (append),
// poori chat tabhi jaati hai jab purane messages badle ho (jaise Regenerate) ya server ki copy alag ho.
// false return = session expire (401).
export async function syncChatsToServer(
  chats: ChatSession[],
  synced: Map<string, ChatSyncState>,
  unloaded: Set<string>,
  getUrl: (path: string) => string
): Promise<boolean> {
  for (const chat of chats) {
    if (chat.isTemp || chat.messages.length === 0) continue;
    if (unloaded.has(chat.id)) continue; // server ke messages abhi load nahi hue, overwrite ka risk

    const known: ChatSyncState = synced.get(chat.id) || { fp: [], meta: '' };
    const fpNow = chat.messages.map(messageFingerprint);
    const metaNow = chatMeta(chat);
    // Server pe jo messages hain wo abhi bhi bilkul waise hi hain? (Regenerate ne badla to false)
    const prefixOk = known.fp.length <= fpNow.length && known.fp.every((f, i) => f === fpNow[i]);

    try {
      if (prefixOk) {
        // Sirf naye messages bhejo. Jo message abhi stream ho raha hai use baad ke liye chhod do.
        let newMsgs = chat.messages.slice(known.fp.length);
        const streamingIdx = newMsgs.findIndex((m) => m.status === 'streaming');
        if (streamingIdx !== -1) newMsgs = newMsgs.slice(0, streamingIdx);
        if (newMsgs.length === 0 && known.meta === metaNow) continue; // kuch badla hi nahi

        try {
          await appendServerMessages(getUrl, chat, known.fp.length, newMsgs);
          synced.set(chat.id, { fp: fpNow.slice(0, known.fp.length + newMsgs.length), meta: metaNow });
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            // Server ki copy alag hai (dusra device, ya pehle save fail hua): poori chat bhejkar theek karo
            await saveServerChat(getUrl, chat);
            synced.set(chat.id, { fp: fpNow, meta: metaNow });
          } else {
            throw e;
          }
        }
      } else {
        // Purane messages badle (jaise Regenerate): poori chat replace karo
        await saveServerChat(getUrl, chat);
        synced.set(chat.id, { fp: fpNow, meta: metaNow });
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return false;
      console.error('Chat sync failed', e);
    }
  }
  return true;
}