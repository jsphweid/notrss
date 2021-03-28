import { Maybe } from "../../../generated";

export interface Snapshot {
  dateCreated: Date;
  site: string;
  version: number;
  objectStorageKey: string;
  diffObjectStorageKey: Maybe<string>;
}
