import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

/**
 * MobileBridge integrates Capacitor native Android runtime lifecycle events:
 * 1. Hardware/gesture Back button navigation stack management.
 * 2. Deep linking for custom URL schemes (pdi://app/...) and App Links (https://ranking.pdistudios.com/...).
 */
export const MobileBridge: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Handle deep links when app is opened via URI scheme or Android App Link
    const urlListenerPromise = CapApp.addListener('appUrlOpen', (event) => {
      try {
        const rawUrl = event.url;
        let routePath = '';

        if (rawUrl.includes('://')) {
          const parsed = new URL(rawUrl);
          routePath = parsed.pathname + parsed.search + parsed.hash;
        } else {
          routePath = rawUrl;
        }

        if (routePath && routePath !== '/') {
          navigate(routePath);
        }
      } catch (err) {
        console.warn('Failed to parse incoming deep link:', err);
      }
    });

    // Handle Android hardware & gesture back button
    const backListenerPromise = CapApp.addListener('backButton', () => {
      if (location.pathname !== '/' && window.history.length > 1) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });

    return () => {
      urlListenerPromise.then((handle) => handle.remove()).catch(() => {});
      backListenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [navigate, location.pathname]);

  return null;
};
