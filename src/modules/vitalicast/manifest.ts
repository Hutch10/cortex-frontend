import { ModuleManifest } from '../../core/module-loader';

export const VitalicastManifest: ModuleManifest = {
  id: 'vitalicast',
  name: 'Vitalicast',
  description: 'High-frequency personal telemetry and vital observations',
  version: '1.0.0',
  routes: [
    {
      path: '/vitalicast/capture',
      label: 'Log Vitals',
    },
    {
      path: '/vitalicast/replay',
      label: 'Health Timeline',
    },
    {
      path: '/vitalicast/analytics',
      label: 'Telemetry Dash',
    }
  ],
};
