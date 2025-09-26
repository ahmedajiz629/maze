import { Engine } from '@babylonjs/core';
export const makeEngine = (canvas: HTMLCanvasElement) => new Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
})