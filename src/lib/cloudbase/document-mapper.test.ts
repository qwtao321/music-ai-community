import { describe, expect, it } from "vitest";
import { fromCloudBaseDoc, toCloudBaseDoc } from "./document-mapper";

describe("cloudbase document mapper", () => {
  it("omits app id when writing through an explicit CloudBase document id", () => {
    expect(toCloudBaseDoc({ id: "track-1", title: "Song" })).toEqual({
      title: "Song",
    });
  });

  it("maps CloudBase _id back to app id when reading", () => {
    expect(fromCloudBaseDoc<{ id: string; title: string }>({
      _id: "track-1",
      title: "Song",
    })).toEqual({
      id: "track-1",
      title: "Song",
    });
  });
});
