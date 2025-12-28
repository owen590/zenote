import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zenote.app',
  appName: 'Zenote',
  webDir: 'dist',
  server: {
    hostname: 'zenote',
    androidScheme: 'https',
    allowNavigation: ['*'],
    cleartext: false
  },
  android: {
    webContentsDebuggingEnabled: true,
    allowMixedContent: false,
    backgroundColor: '#ffffff'
  },
  ios: {
    webContentsDebuggingEnabled: true,
    backgroundColor: '#ffffff'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
