// Babylon.js type definitions for global usage
declare namespace BABYLON {
  class Engine {
    constructor(canvas: HTMLCanvasElement, antialias: boolean, options?: any);
    runRenderLoop(callback: () => void): void;
    resize(): void;
  }

  class Scene {
    constructor(engine: Engine);
    clearColor: Color4;
    render(): void;
    onBeforeRenderObservable: Observable<Scene>;
  }

  class Observable<T> {
    add(callback: (data?: T) => void): Observer<T>;
    remove(observer: Observer<T>): void;
  }

  class Observer<T> {}

  class Vector3 {
    constructor(x: number, y: number, z: number);
    x: number;
    y: number;
    z: number;
    add(vector: Vector3): Vector3;
    clone(): Vector3;
    static Lerp(start: Vector3, end: Vector3, amount: number): Vector3;
  }

  class Color3 {
    constructor(r: number, g: number, b: number);
  }

  class Color4 {
    constructor(r: number, g: number, b: number, a: number);
  }

  class HemisphericLight {
    constructor(name: string, direction: Vector3, scene: Scene);
    intensity: number;
  }

  class ArcFollowCamera {
    constructor(name: string, alpha: number, beta: number, radius: number, target: any, scene: Scene);
    attachControl(canvas: HTMLCanvasElement, noPreventDefault?: boolean): void;
    target: Vector3;
    wheelPrecision?: number;
  }

  class StandardMaterial {
    constructor(name: string, scene: Scene);
    diffuseColor: Color3;
    emissiveColor: Color3;
  }

  class GridMaterial {
    constructor(name: string, scene: Scene);
    majorUnitFrequency: number;
    minorUnitVisibility: number;
    gridRatio: number;
    mainColor: Color3;
    lineColor: Color3;
  }

  class Mesh {
    position: Vector3;
    rotation: Vector3;
    material: any;
    isVisible: boolean;
    createInstance(name: string): Mesh;
    dispose(): void;
    isDisposed(): boolean;
  }

  namespace MeshBuilder {
    function CreateGround(name: string, options: any, scene: Scene): Mesh;
    function CreateBox(name: string, options: any, scene: Scene): Mesh;
    function CreateCapsule(name: string, options: any, scene: Scene): Mesh;
    function CreateTorus(name: string, options: any, scene: Scene): Mesh;
  }
}
