import { _getAllEmailsSubscribedToSite } from "./emails/get-all-subscribed-to-sites";
import { _subscribeEmailToSites } from "./emails/subscribe-to-sites";
import { _ensureSitesAreBeingWatched } from "./sites/ensure-being-watched";
import { _deleteSites } from "./sites/delete";
import { _addNewSnapshot } from "./snapshots/add";
import { _getSnapshots } from "./snapshots/get";
import { _getAllLatestItems } from "./snapshots/get-all-latest";
import { _getSubscriptionsByEmail } from "./subscriptions/get-by-email";
import { _getTotalCountBySite } from "./snapshots/get-total-count-by-site";
import { _unsubscribeEmailFromSites } from "./emails/unsubscribe-from-sites";

import { Snapshot as _Snapshot } from "./snapshots";
import { GetSnapshotResult as _GetSnapshotResult } from "./snapshots/get";

export namespace DB {
  export type Snapshot = _Snapshot;
  export type GetSnapshotResult = _GetSnapshotResult;

  export const getAllEmailsSubscribedToSite = _getAllEmailsSubscribedToSite;
  export const subscribeEmailToSites = _subscribeEmailToSites;
  export const unsubscribeEmailFromSites = _unsubscribeEmailFromSites;
  export const ensureSitesAreBeingWatched = _ensureSitesAreBeingWatched;
  export const addNewSnapshot = _addNewSnapshot;
  export const getAllLatestItems = _getAllLatestItems;
  export const getSnapshots = _getSnapshots;
  export const getSubscriptionsByEmail = _getSubscriptionsByEmail;
  export const getTotalCountBySite = _getTotalCountBySite;
  export const deleteSites = _deleteSites;
}
