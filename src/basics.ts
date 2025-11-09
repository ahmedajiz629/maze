import { Level, Levels } from "./level"

const nim = (a: number, b: number): Level => ({
  description: `Welcome to Nim! You and the AI will take turns taking between ${a} and ${b} items from a pile. The one to take the last item wins.
You need to define a function that takes two parameters:
* n: number of pieces
* take: a function to call with the number of pieces you want to take (between ${a} and ${b}).
The function should return when game is over.
If you try to take an invalid number of pieces, you will lose immediately.
Good luck!`,
  code: `
from random import randrange
def test(code):
  a, b = ${a}, ${b}
  n = randrange((a+b) * 5, (a+b) * 8)
  i = 0
  def take(x):
    nonlocal n, i
    if x >= n or not (x in range(a,b+1) or i == x == 0):
      raise RuntimeError("You can't")
    i += 1
    n -= x
    print('Player takes', x, 'remaining', n)
    took = (n - a) % (a + b)
    if took < a:
      took = randrange(a, min(b, n) + 1)
    n -= took
    print('AI takes', took, 'remaining', n)
    return took
  code(n, take)
  if n == 0:
    print('You win!')
  else:
    print('AI wins!')
`})

export const levels: Levels = {
  hi: () => ({
    code: `def hi():
  print("Hello, World!")`
  }),
  nim: () => nim(1, 3),
  nim2: () => nim(2, 5),
  secret: () => ({
    code: `from random import randrange
def test(code):
  secret = randrange(20) + 1
  tries = 0
  max_tries = 5
  def check(guess):
    nonlocal tries
    tries += 1
    if tries > max_tries:
      raise RuntimeError('Out of tries')
    print('checking', guess, 'try nb =', tries)
    if guess == secret:
      print('found', guess)
      return 0
    elif guess < secret:
      print('Too low', guess)
      return 1
    else:
      print('Too high', guess)
      return -1
  if secret == code(check):
    print('Bingo')
  else: print('Try again')
`
  }),
  intro: () => ({
    MAP: [
      "##########",
      "#S.B.~..E#",
      "##########",
    ],
    functions: ['step']
  }),
  while: () => ({
    MAP: [
      "##########",
      "#S.B.~..E#",
      "##########",
    ],
    functions: ['step', 'notDone']
  }),
  box: () => ({
    MAP: [
      "##########",
      "#S....~.E#",
      "#.#.#B####",
      "#.#......#",
      "##########",
    ],
    functions: ['step', 'left', 'right']
  }),
  speed: () => ({
    MAP: [
      "######",
      "###Sy#",
      "#Ea..#",
      "######",
    ],
    functions: ['step', 'left', 'right', 'toggle']
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
    ],
    functions: ['step', 'left', 'right', 'toggle']
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
    ],
    functions: ['step', 'left', 'right', 'toggle']
  }),
  lava: () => ({
    MAP: [
      "###############",
      "#St123456789.E#",
      "###############",
    ],
    functions: ['step', 'left', 'right', 'toggle']
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
      "#.######.#",
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
      TIME_MS: 10000,
      EXTRA_DOOR_TS: 7000,
      EXTRA_LEVER_TS: -1,
    }
  }
}