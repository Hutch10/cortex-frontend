'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { ModuleManifest, ModuleLoader } from './module-loader';

// Import manifests
import { MycoManifest } from '../modules/myco-os/manifest';
import { AnchorSigManifest } from '../modules/anchorsig/manifest';
import { VitalicastManifest } from '../modules/vitalicast/manifest';

// Register manifests
ModuleLoader.register(MycoManifest);
ModuleLoader.register(AnchorSigManifest);
ModuleLoader.register(VitalicastManifest);

// Export dynamic component registry
export const componentRegistry: Record<string, Record<string, React.ComponentType<any>>> = {
  'myco-os': {
    'capture': dynamic(() => import('../modules/myco-os/views/CaptureView').then(mod => mod.CaptureView), { ssr: false }),
    'replay': dynamic(() => import('../modules/myco-os/views/ReplayView').then(mod => mod.ReplayView), { ssr: false }),
  },
  'anchorsig': {
    'capture': dynamic(() => import('../modules/anchorsig/views/CaptureView').then(mod => mod.CaptureView), { ssr: false }),
    'replay': dynamic(() => import('../modules/anchorsig/views/ReplayView').then(mod => mod.ReplayView), { ssr: false }),
  },
  'vitalicast': {
    'archive-health': dynamic(() => import('../modules/vitalicast/views/ArchiveHealthDashboard').then(mod => mod.ArchiveHealthDashboard), { ssr: false }),
  },
};

