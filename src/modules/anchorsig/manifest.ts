import { ModuleManifest } from '../../core/module-loader';

export const AnchorSigManifest: ModuleManifest = {
  id: 'anchorsig',
  name: 'AnchorSig',
  description: 'Continuity capture and physical asset tracking',
  version: '1.0.0',
  routes: [
    {
      path: '/anchorsig/capture',
      label: 'Log Continuity',
    },
    {
      path: '/anchorsig/replay',
      label: 'Continuity Timeline',
    },
  ],
};
