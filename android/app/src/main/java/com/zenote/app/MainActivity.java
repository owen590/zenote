package com.zenote.app;

import android.os.Bundle;
import android.view.WindowManager;
import android.view.View;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.Plugin;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 设置全屏显示，确保内容延伸到状态栏和导航栏
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        
        // 设置内容延伸到状态栏和导航栏下方
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }
    
    @Override
    public void onResume() {
        super.onResume();
        // 恢复沉浸式模式
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );
    }
    
    @Override
    protected void init(Bundle savedInstanceState) {
        super.init(savedInstanceState);
        
        // 配置WebView
        bridge.getWebView().setBackgroundColor(0x00000000); // 设置透明背景
        bridge.getWebView().setOverScrollMode(BridgeWebView.OVER_SCROLL_NEVER);
        bridge.getWebView().setScrollBarStyle(BridgeWebView.SCROLLBARS_INSIDE_OVERLAY);
        
        // 禁用WebView的缩放控制
        bridge.getWebView().getSettings().setBuiltInZoomControls(false);
        bridge.getWebView().getSettings().setDisplayZoomControls(false);
    }
}
