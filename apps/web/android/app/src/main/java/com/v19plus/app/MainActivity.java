package com.v19plus.app;

import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "V19PlusMainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Must be called before super.onCreate to satisfy Android 12+ SplashScreen contract
        try {
            SplashScreen.installSplashScreen(this);
        } catch (Throwable t) {
            Log.w(TAG, "SplashScreen initialization handled: ", t);
        }

        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Uncaught exception on thread: " + thread.getName(), throwable);
        });

        try {
            super.onCreate(savedInstanceState);
        } catch (Throwable t) {
            Log.e(TAG, "Fatal error during BridgeActivity onCreate", t);
            return;
        }

        try {
            // 1. Enable Chrome remote debugging (navigate to chrome://inspect in desktop Chrome)
            WebView.setWebContentsDebuggingEnabled(true);

            // 2. Keep screen on during active app lifecycle / video playback
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

            if (this.getBridge() != null && this.getBridge().getWebView() != null) {
                WebView webView = this.getBridge().getWebView();
                WebSettings settings = webView.getSettings();

                // Core JavaScript and Storage
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);

                // Media Playback & Streaming: Allow autoplay without requiring explicit user tap
                settings.setMediaPlaybackRequiresUserGesture(false);

                // Allow mixed content for video CDNs, HLS fragment chunks, and thumbnail assets
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

                // Caching and File Access for fast offline & streaming performance
                settings.setAllowFileAccess(true);
                settings.setAllowContentAccess(true);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setLoadWithOverviewMode(true);
                settings.setUseWideViewPort(true);
            }
        } catch (Throwable e) {
            Log.e(TAG, "Error configuring WebView settings", e);
        }
    }
}
