import { Snapshot } from "../generated";
import { DB } from "../services/db";
import { ObjectStorage } from "../services/object-storage";

export namespace SnapshotMapper {
  export const fromDB = (data: DB.Snapshot): Snapshot => ({
    ...data,
    dateCreated: data.dateCreated.toISOString(),
    objectStorageUrl: ObjectStorage.urlFromKey(data.objectStorageKey),
    diffObjectStorageUrl: data.diffObjectStorageKey
      ? ObjectStorage.urlFromKey(data.diffObjectStorageKey)
      : null,
  });
}
