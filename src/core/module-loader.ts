export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  routes: Array<{
    path: string;
    label: string;
  }>;
}

export class ModuleLoader {
  private static registeredModules: Map<string, ModuleManifest> = new Map();

  static register(manifest: ModuleManifest) {
    this.registeredModules.set(manifest.id, manifest);
  }

  static getManifest(id: string): ModuleManifest | undefined {
    return this.registeredModules.get(id);
  }

  static getAllModules(): ModuleManifest[] {
    return Array.from(this.registeredModules.values());
  }
}
