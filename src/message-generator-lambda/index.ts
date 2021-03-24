import { DB } from "../services/db";
import { Queue } from "../services/queue";

export const handler = async () => {
  console.info("Running message generator...");
  try {
    const latestItems = await DB.getAllLatestItems();
    await Queue.writeMessages(
      latestItems.map((item) => ({
        lastSnapshotObjectStorageKey: item.objectStorageKey || null,
        site: item.site,
      }))
    );
  } catch (e) {
    console.error(e);
  }
};
