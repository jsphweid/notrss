export namespace Utils {
  export const chunkArray = <T>(arr: T[], size: number): T[][] => {
    const ret: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      ret.push(arr.slice(i, i + size));
    }
    return ret;
  };

  export const generateGUID = (): string => {
    // stolen from https://stackoverflow.com/a/2117523/4918389
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  export const getNowPrettyFormatted = (): string =>
    new Date()
      .toISOString()
      .replace(/T/, " ") // replace T with a space
      .replace(/\..+/, "");

  export const sleep = (seconds: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });

  export const base64Encode = (str: string): string =>
    Buffer.from(str).toString("base64");

  export const base64Decode = (str: string): string =>
    Buffer.from(str, "base64").toString("ascii");
}
