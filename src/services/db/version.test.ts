import { Version } from "./version";

describe("test version module", () => {
  describe("happy paths...", () => {
    test("getIntRepresentation works", () => {
      expect(Version.getIntRepresentation("v000001")).toEqual(1);
      expect(Version.getIntRepresentation("v000011")).toEqual(11);
      expect(Version.getIntRepresentation("v999999")).toEqual(999999);
    });

    test("fromInt works", () => {
      expect(Version.fromInt(1)).toEqual("v000001");
      expect(Version.fromInt(11)).toEqual("v000011");
      expect(Version.fromInt(999999)).toEqual("v999999");
    });

    test("increment works", () => {
      expect(Version.increment("v000000")).toEqual("v000001");
      expect(Version.increment("v000001")).toEqual("v000002");
      expect(Version.increment("v999998")).toEqual("v999999");
    });
  });
});
