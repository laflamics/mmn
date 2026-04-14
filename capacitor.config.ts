import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mmn.erp',
  appName: 'MMN ERP',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
