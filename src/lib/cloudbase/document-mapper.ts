type WithOptionalId = {
  id?: string;
  _id?: string;
  [key: string]: unknown;
};

export function toCloudBaseDoc<T extends WithOptionalId>(doc: T) {
  const rest = { ...doc };
  delete rest.id;
  delete rest._id;

  return rest;
}

export function fromCloudBaseDoc<T extends { id?: string }>(doc: unknown): T {
  const source = doc as WithOptionalId;
  const { _id, ...rest } = source;

  return {
    id: source.id ?? _id,
    ...rest,
  } as T;
}

export function fromCloudBaseDocs<T extends { id?: string }>(docs: unknown[]) {
  return docs.map((doc) => fromCloudBaseDoc<T>(doc));
}
