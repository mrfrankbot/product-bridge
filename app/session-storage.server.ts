import { kv } from "@vercel/kv";
import type { Session } from "@shopify/shopify-api";

/**
 * Custom Vercel KV session storage for Shopify apps
 * Persists sessions across serverless function invocations
 */
export class KVSessionStorage {
  private prefix = "shopify_session:";

  async storeSession(session: Session): Promise<boolean> {
    try {
      const key = this.prefix + session.id;
      // Store session with 24-hour TTL
      await kv.set(key, JSON.stringify(session), { ex: 86400 });
      return true;
    } catch (error) {
      console.error("Failed to store session:", error);
      return false;
    }
  }

  async loadSession(id: string): Promise<Session | undefined> {
    try {
      const key = this.prefix + id;
      const data = await kv.get<string>(key);
      if (!data) return undefined;
      
      const sessionData = typeof data === 'string' ? JSON.parse(data) : data;
      return sessionData as Session;
    } catch (error) {
      console.error("Failed to load session:", error);
      return undefined;
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      const key = this.prefix + id;
      await kv.del(key);
      return true;
    } catch (error) {
      console.error("Failed to delete session:", error);
      return false;
    }
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      const keys = ids.map(id => this.prefix + id);
      if (keys.length > 0) {
        await kv.del(...keys);
      }
      return true;
    } catch (error) {
      console.error("Failed to delete sessions:", error);
      return false;
    }
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    // Note: This is a simplified implementation
    // For production, you might want to maintain a secondary index
    console.warn("findSessionsByShop not fully implemented for KV storage");
    return [];
  }
}
