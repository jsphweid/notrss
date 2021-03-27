import { Utils } from "../../utils";

export namespace Version {
  // versions look like `v000005`

  type Version = string;

  // The maximum number of digits expected to be used
  const MAX_NUM_LENGTH = 6;
  const VERSION_STR_LENGTH = MAX_NUM_LENGTH + 1; // for the `v` prefix
  const MAX_VERSION = `v${"9".repeat(MAX_NUM_LENGTH)}`;
  export const CURRENT = `v${"0".repeat(MAX_NUM_LENGTH)}`;

  const assertValid = (version: Version): void => {
    if (version.length != VERSION_STR_LENGTH) {
      throw new Error(`A version must have total length ${VERSION_STR_LENGTH}`);
    }
    if (version[0] !== "v") {
      throw new Error("A version must start with a `v`");
    }
    if (isNaN(version.slice(1) as any)) {
      throw new Error(
        "Version `" + version + "` is invalid because in contains non-numeric."
      );
    }
  };

  export const getIntRepresentation = (version: Version): number => {
    assertValid(version);
    return parseInt(version.slice(1), 10);
  };

  export const fromInt = (num: number): Version => {
    if (!Utils.isInt(num)) {
      throw new Error("Number `" + num + "` is not an Integer...");
    }
    if (num > getIntRepresentation(MAX_VERSION)) {
      throw new Error(`Number ${num} is too large to make a version...`);
    }

    return "v" + `${num}`.padStart(MAX_NUM_LENGTH, "0");
  };

  export const increment = (current: Version): Version => {
    if (current === MAX_VERSION) {
      throw new Error("Can't increment version any more...");
    }

    assertValid(current);

    return fromInt(getIntRepresentation(current) + 1);
  };
}
