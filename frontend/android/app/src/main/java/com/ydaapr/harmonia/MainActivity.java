package com.ydaapr.harmonia;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MediaNotificationPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Suppress native scrollbars and overscroll glow for a seamless native app experience
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        }
    }
}
