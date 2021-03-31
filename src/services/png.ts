import { PNG as PNGJS } from "pngjs";
import pixelmatch from "pixelmatch";
import stream from "stream";

export namespace PNG {
  export type PNG = PNGJS;
  export type Dimension = { width: number; height: number };
  export const fromBuffer = (buffer: Buffer): Promise<PNG> =>
    new Promise((resolve, reject) =>
      new PNGJS().parse(buffer, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      })
    );

  export const getDiff = (png1: PNG, png2: PNG): PNG | null => {
    const { width, height } = getCommonDimension(png1, png2);
    const diff = new PNGJS({ width, height });
    const png1Data = areSameSize(png1, diff)
      ? png1.data
      : resize(png1, { width, height }).data;
    const png2Data = areSameSize(png2, diff)
      ? png2.data
      : resize(png2, { width, height }).data;
    return pixelmatch(png1Data, png2Data, diff.data, width, height) === 0
      ? null
      : diff;
  };

  export const pack = (png: PNG): stream.PassThrough => {
    const body = new stream.PassThrough();
    png.pack().pipe(body);
    return body;
  };

  export const areSameSize = (png1: PNG, png2: PNG): boolean =>
    png1.width === png2.width && png1.height === png2.height;

  // This resizing algorithm only works enlarging images to a height by
  // adding white space on the right or bottom side of the image
  export const resize = (
    img: PNG.PNG,
    { width, height }: Dimension
  ): PNG.PNG => {
    if (img.height > height || img.width > width) {
      throw new Error(
        "Resizing height by reducing is currently not supported..."
      );
    }

    const output = new PNGJS({ width, height });

    for (let y = 0; y < output.height; y++) {
      for (let x = 0; x < output.width; x++) {
        const idx = (output.width * y + x) << 2;
        if (x < img.width && y < img.height) {
          const imgIdx = (img.width * y + x) << 2;
          output.data[idx] = img.data[imgIdx];
          output.data[idx + 1] = img.data[imgIdx + 1];
          output.data[idx + 2] = img.data[imgIdx + 2];
          output.data[idx + 3] = img.data[imgIdx + 3];
        } else {
          output.data[idx] = 255;
          output.data[idx + 1] = 255;
          output.data[idx + 2] = 255;
          output.data[idx + 3] = 255;
        }
      }
    }

    return output;
  };

  export const getCommonDimension = (png1: PNG, png2: PNG): Dimension => ({
    width: Math.max(png1.width, png2.width),
    height: Math.max(png1.height, png2.height),
  });
}
