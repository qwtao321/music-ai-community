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

export async function getMusicStore(): Promise<MusicStore> {
  if (!isCurrentMusicStore(globalForMusicStore.musicStore)) {
    const provider = createMusicProvider();

    if (shouldUseCloudBaseStore()) {
      try {
        const { createCloudBaseMusicStore } = await import("./cloudbase-store");
        globalForMusicStore.musicStore = createCloudBaseMusicStore(provider);
      } catch (error) {
        console.error("CloudBase store unavailable, falling back to demo store", error);
        globalForMusicStore.musicStore = createDemoMusicStore(provider);
      }
    } else {
      globalForMusicStore.musicStore = createDemoMusicStore(provider);
    }
  }

  return globalForMusicStore.musicStore!;
}
