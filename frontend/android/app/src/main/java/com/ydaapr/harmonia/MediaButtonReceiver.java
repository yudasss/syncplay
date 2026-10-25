package com.ydaapr.harmonia;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class MediaButtonReceiver extends BroadcastReceiver {
    public static final String ACTION_PLAY = "com.ydaapr.syncplay.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.ydaapr.syncplay.ACTION_PAUSE";
    public static final String ACTION_NEXT = "com.ydaapr.syncplay.ACTION_NEXT";
    public static final String ACTION_PREV = "com.ydaapr.syncplay.ACTION_PREV";
    public static final String ACTION_STOP = "com.ydaapr.syncplay.ACTION_STOP";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        if (action.equals(ACTION_PLAY)) {
            MediaNotificationPlugin.onMediaAction("play");
        } else if (action.equals(ACTION_PAUSE)) {
            MediaNotificationPlugin.onMediaAction("pause");
        } else if (action.equals(ACTION_NEXT)) {
            MediaNotificationPlugin.onMediaAction("next");
        } else if (action.equals(ACTION_PREV)) {
            MediaNotificationPlugin.onMediaAction("prev");
        } else if (action.equals(ACTION_STOP)) {
            MediaNotificationPlugin.onMediaAction("stop");
        }
    }
}
