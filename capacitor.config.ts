import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zenote.app',
  appName: 'Zenote',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'always'
  },
  android: {
    backgroundColor: '#ffffff',
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10; Zenote App) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.130 Mobile Safari/537.36',
    allowMixedContent: true,
    allowNavigation: ['ionic://*', 'capacitor://*', 'localhost', 'https://*', 'http://*']
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    }
  }
};

export default config;
