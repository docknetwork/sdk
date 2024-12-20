export class Base {
  constructor(dock, modules, spawn) {
    this.dock = dock;
    this.spawn = spawn;
    this.module = modules[this.constructor.Prop];
  }
}
