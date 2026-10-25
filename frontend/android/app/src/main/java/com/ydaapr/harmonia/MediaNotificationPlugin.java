package com.ydaapr.harmonia;

import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MediaNotification")
public class MediaNotificationPlugin extends Plugin {
    public static MediaNotificationPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void onMediaAction(String action) {
        if (instance != null) {
            JSObject ret = new JSObject();
            ret.put("action", action);
            instance.notifyListeners("mediaAction", ret);
        }
    }

    @PluginMethod
    public void updateMetadata(PluginCall call) {
        String title = call.getString("title", "Sync Play");
        String artist = call.getString("artist", "Music");
        Boolean isPlaying = call.getBoolean("isPlaying", true);
        String artwork = call.getString("artwork", "");

        Context context = getContext();
        Intent intent = new Intent(context, MediaNotificationService.class);
        intent.putExtra(MediaNotificationService.EXTRA_TITLE, title);
        intent.putExtra(MediaNotificationService.EXTRA_ARTIST, artist);
        intent.putExtra(MediaNotificationService.EXTRA_IS_PLAYING, isPlaying != null ? isPlaying : true);
        intent.putExtra(MediaNotificationService.EXTRA_ARTWORK, artwork);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, MediaNotificationService.class);
        intent.setAction("STOP");
        context.startService(intent);
        call.resolve();
    }
}
