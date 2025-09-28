export const levels: Record<string, () => { MAP: string[], TIME_MS?: number }> = {
  intro: () => ({
    MAP: [
      "##########",
      "#S.B.~..E#",
      "##########",
    ]
  }),
  speed: () => ({
    MAP: [
      "######",
      "###Sy#",
      "#Ea..#",
      "######",
    ]
  }),
  box: () => ({
    MAP: [
      "##########",
      "#S....~.E#",
      "#.#.#B####",
      "#.#......#",
      "##########",
    ]
  }),
  keys: () => ({
    MAP: [
      "########",
      "#S..~.E#",
      "#.#B####",
      "#.d.#K.#",
      "#.####.#",
      "#......#",
      "########",
    ]
  }),
  auto: () => ({
    MAP: [
      "########",
      "#S..~.E#",
      "#.#B####",
      "#.d.#K.#",
      "#y####.#",
      "#.a....#",
      "########",
    ]
  }),
  lava: () => ({
    MAP: [
      "###############",
      "#St123456789.E#",
      "###############",
    ],
  }),
  random: () => {
    const MAP = [
      "##########",
      "#~~~~~~~E#",
      "#~~~~~~~~#",
      "#~~~~~~~~#",
      "#~~~~~~~~#",
      "#St~~~~~~#",
      "##########",
    ]
    let index = [MAP.length - 2, 2]
    for (const i of Array.from({ length: 9 }, (_, i) => i + 1)) {
      const dir = index[0] == 1 ? 1 : index[1] == MAP[0].length - 2 ? 0 : Math.random() < 0.5 ? 0 : 1
      index[dir] += dir ? 1 : -1
      MAP[index[0]] = MAP[index[0]].substring(0, index[1]) + i + MAP[index[0]].substring(index[1] + 1)
    }
    return {
      MAP,
      TIME_MS: 10000
    }
  },
  integration: () => {
    const MAP = [
      "##########",
      "#......a.#",
      "#.######y#",
      "#.K#...d.#",
      "####B###.#",
      "#E.~.....#",
      "#~~~~~~~.#",
      "#~~~~~~~.#",
      "#~~~~~~~~#",
      "#~~~~~~~~#",
      "#~~~~~~~~#",
      "#St~~~~~~#",
      "##########",
    ]
    let index = [MAP.length - 2, 2]
    for (const i of Array.from({ length: 9 }, (_, i) => i + 1)) {
      const dir = index[0] == 7 ? 1 : index[1] == MAP[0].length - 2 ? 0 : Math.random() < 0.5 ? 0 : 1
      index[dir] += dir ? 1 : -1
      MAP[index[0]] = MAP[index[0]].substring(0, index[1]) + i + MAP[index[0]].substring(index[1] + 1)
    }
    return {
      MAP,
      TIME_MS: 10000
    }

  }
}