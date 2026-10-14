package com.pdi.ranking;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Initialize AndroidX SplashScreen before super.onCreate
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        // Ensure dark status bar and system windows integration
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
