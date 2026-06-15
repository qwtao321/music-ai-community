import { shouldUseCloudBaseStore } from "@/lib/cloudbase/config";
import type { MusicStore } from "./music-store";
import { createMusicProvider } from "./provider";
import { createDemoMusicStore } from "./store";

const globalForMusicStore = globalThis as unknown as {
  musicStore?: MusicStore;
};

export async function getMusicStore(): Promise<MusicStore> {
  if (!globalForMusicStore.musicStore) {
    const provider = createMusicProvider();

    if (shouldUseCloudBaseStore()) {
      const { createCloudBaseMusicStore } = await import("./cloudbase-store");
      globalForMusicStore.musicStore = createCloudBaseMusicStore(provider);
    } else {
      globalForMusicStore.musicStore = createDemoMusicStore(provider);
    }
  }

  return globalForMusicStore.musicStore!;
}
