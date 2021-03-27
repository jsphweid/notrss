import { Maybe } from "../../../generated";

export interface Snapshot {
  dateCreated: Date;
  site: string;
  version: number; // TODO: maybe this shouldn't be included as it only has relevance in DB...?
  objectStorageUrl: string;
  diffObjectStorageUrl: Maybe<string>;
}
