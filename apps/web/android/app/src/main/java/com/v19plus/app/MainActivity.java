package com.v19plus.app;

import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "V19PlusMainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Enable Chrome remote debugging (navigate to chrome://inspect in desktop Chrome)
        WebView.setWebContentsDebuggingEnabled(true);

        // 2. Keep screen on during active app lifecycle / video playback
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        try {
            WebView webView = this.getBridge().getWebView();
            if (webView != null) {
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
        } catch (Exception e) {
            Log.e(TAG, "Error configuring WebView settings", e);
        }
    }
}
