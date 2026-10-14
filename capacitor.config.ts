import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pdi.ranking',
  appName: 'PDI Voice Artist Ranking System',
  webDir: 'apps/web/dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    path: 'apps/android',
    allowMixedContent: true,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080D17',
    },
    App: {
      // Deep linking configuration
    },
  },
};

export default config;
