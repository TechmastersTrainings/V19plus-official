package com.v19plus.app;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "V19PlusMainActivity";
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private FrameLayout fullscreenContainer;

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

                // Hardware acceleration on the WebView layer
                webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
                webView.setBackgroundColor(0xFF0A0A0A);

                // Setup Fullscreen container for HTML5 <video> fullscreen handling
                setupFullscreenVideoSupport(webView);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error configuring WebView settings", e);
        }
    }

    private void setupFullscreenVideoSupport(WebView webView) {
        fullscreenContainer = new FrameLayout(this);
        fullscreenContainer.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        fullscreenContainer.setBackgroundColor(0xFF000000);
        fullscreenContainer.setVisibility(View.GONE);

        ViewGroup decorView = (ViewGroup) getWindow().getDecorView();
        decorView.addView(fullscreenContainer);

        // Attach custom WebChromeClient preserving Capacitor plugin bridges
        webView.setWebChromeClient(new BridgeWebChromeClient(this.getBridge()) {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    onHideCustomView();
                    return;
                }
                customView = view;
                customViewCallback = callback;
                webView.setVisibility(View.GONE);
                fullscreenContainer.addView(view);
                fullscreenContainer.setVisibility(View.VISIBLE);

                // Enter immersive sticky fullscreen for video
                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                );
            }

            @Override
            public void onHideCustomView() {
                if (customView == null) return;
                fullscreenContainer.removeView(customView);
                fullscreenContainer.setVisibility(View.GONE);
                customView = null;
                if (customViewCallback != null) {
                    customViewCallback.onCustomViewHidden();
                    customViewCallback = null;
                }
                webView.setVisibility(View.VISIBLE);

                // Restore normal system UI
                getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (customView != null) {
            WebView webView = this.getBridge().getWebView();
            if (webView != null && webView.getWebChromeClient() != null) {
                webView.getWebChromeClient().onHideCustomView();
                return;
            }
        }
        super.onBackPressed();
    }
}


