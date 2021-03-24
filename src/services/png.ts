import { PNG as PNGJS } from "pngjs";
import pixelmatch from "pixelmatch";
import stream from "stream";

export namespace PNG {
  export const fromBuffer = (buffer: Buffer): Promise<PNGJS> =>
    new Promise((resolve, reject) =>
      new PNGJS().parse(buffer, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      })
    );

  export const getDiff = (png1: PNGJS, png2: PNGJS): PNGJS | null => {
    const { width, height } = png1;
    const diff = new PNGJS({ width, height });
    return pixelmatch(png1.data, png2.data, diff.data, width, height) === 0
      ? null
      : diff;
  };

  export const pack = (png: PNGJS): stream.PassThrough => {
    const body = new stream.PassThrough();
    png.pack().pipe(body);
    return body;
  };
}
