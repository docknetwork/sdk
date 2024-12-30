import { CheqdTestnetAccumulatorId, DockAccumulatorId } from "../src/types";

describe("Identifiers mapping", () => {
  test("AccumulatorId", () => {
    const id = new DockAccumulatorId(
      "0x0adb5ec7a3740435940943056cb7cfc26997020a867823800e3fe197ec52d5fd"
    );

    console.log(CheqdTestnetAccumulatorId.from(id).toJSON());
  });
});
