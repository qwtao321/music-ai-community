import { shouldUseCloudBaseStore } from "@/lib/cloudbase/config";
import type { MusicStore } from "./music-store";
import { createMusicProvider } from "./provider";
import { createDemoMusicStore } from "./store";

const globalForMusicStore = globalThis as unknown as {
  musicStore?: MusicStore;
};

function isCurrentMusicStore(store: MusicStore | undefined) {
  return typeof store?.listStyleTemplates === "function";
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

function createResilientStore(primary: MusicStore, fallback: MusicStore): MusicStore {
  return new Proxy(primary, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);

      if (typeof value !== "function") {
        return value;
      }

      return (...args: unknown[]) => {
        const fallbackToDemo = (error: unknown) => {
          console.error(
            `CloudBase store method failed for ${String(property)}, falling back to demo store`,
            error,
          );
          globalForMusicStore.musicStore = fallback;
          const fallbackValue = Reflect.get(fallback, property, fallback);
          if (typeof fallbackValue !== "function") {
            throw error;
          }
          return Reflect.apply(fallbackValue, fallback, args);
        };

        try {
          const result = Reflect.apply(value, target, args);
          return isPromiseLike(result) ? result.catch(fallbackToDemo) : result;
        } catch (error) {
          return fallbackToDemo(error);
        }
      };
    },
  }) as MusicStore;
}

export async function getMusicStore(): Promise<MusicStore> {
  if (!isCurrentMusicStore(globalForMusicStore.musicStore)) {
    const provider = createMusicProvider();
    const demoStore = createDemoMusicStore(provider);

    if (shouldUseCloudBaseStore()) {
      try {
        const { createCloudBaseMusicStore } = await import("./cloudbase-store");
        const cloudBaseStore = createCloudBaseMusicStore(provider);
        globalForMusicStore.musicStore = createResilientStore(
          cloudBaseStore,
          demoStore,
        );
      } catch (error) {
        console.error("CloudBase store unavailable, falling back to demo store", error);
        globalForMusicStore.musicStore = demoStore;
      }
    } else {
      globalForMusicStore.musicStore = demoStore;
    }
  }

  return globalForMusicStore.musicStore!;
}
