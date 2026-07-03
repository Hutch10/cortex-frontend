import { ModuleManifest } from '../../core/module-loader';

export const MycoManifest: ModuleManifest = {
  id: 'myco-os',
  name: 'Myco OS',
  description: 'Fungal classification and observation tracking',
  version: '1.0.0',
  routes: [
    {
      path: '/myco-os/capture',
      label: 'Capture Observation',
    },
    {
      path: '/myco-os/replay',
      label: 'Myco Timeline',
    },
  ],
};
