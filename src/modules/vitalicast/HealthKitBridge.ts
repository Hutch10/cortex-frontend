// Placeholder Native Bridge Interface for Vitalicast HealthKit
// Matches the Native API Specification

export interface HealthKitAuthResult {
  status: 'GRANTED' | 'DENIED' | 'PENDING';
}

export const VitalicastHealthKit = {
  requestAuthorization: async (options: { types: string[] }): Promise<HealthKitAuthResult> => {
    console.log('Mocking requestAuthorization for types:', options.types);
    return { status: 'PENDING' };
  },

  getAuthorizationStatus: async (): Promise<HealthKitAuthResult> => {
    return { status: 'PENDING' };
  },

  startBackgroundSync: async (options: { frequencyMin: number }): Promise<void> => {
    console.log(`Mocking startBackgroundSync at ${options.frequencyMin} min`);
  },

  stopBackgroundSync: async (): Promise<void> => {
    console.log('Mocking stopBackgroundSync');
  }
};
