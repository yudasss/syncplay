package com.ydaapr.harmonia;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MediaNotificationService extends Service {
    public static final String CHANNEL_ID = "syncplay_music_playback";
    public static final int NOTIFICATION_ID = 1001;

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_IS_PLAYING = "extra_is_playing";
    public static final String EXTRA_ARTWORK = "extra_artwork";

    private MediaSessionCompat mediaSession;
    private NotificationManager notificationManager;
    private String currentTitle = "Sync Play";
    private String currentArtist = "Playing Music";
    private boolean currentIsPlaying = true;
    private String currentArtwork = "";
    private Bitmap cachedArtworkBitmap = null;
    private String cachedArtworkUrl = null;

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();

        mediaSession = new MediaSessionCompat(this, "SyncPlayMediaSession");
        mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                MediaNotificationPlugin.onMediaAction("play");
            }

            @Override
            public void onPause() {
                MediaNotificationPlugin.onMediaAction("pause");
            }

            @Override
            public void onSkipToNext() {
                MediaNotificationPlugin.onMediaAction("next");
            }

            @Override
            public void onSkipToPrevious() {
                MediaNotificationPlugin.onMediaAction("prev");
            }

            @Override
            public void onStop() {
                MediaNotificationPlugin.onMediaAction("stop");
            }
        });
        mediaSession.setActive(true);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Sync Play Musik",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Kontrol pemutaran musik di layar kunci dan bilah notifikasi");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            if ("STOP".equals(intent.getAction())) {
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }

            currentTitle = intent.getStringExtra(EXTRA_TITLE);
            if (currentTitle == null || currentTitle.isEmpty()) currentTitle = "Sync Play";
            
            currentArtist = intent.getStringExtra(EXTRA_ARTIST);
            if (currentArtist == null || currentArtist.isEmpty()) currentArtist = "Musik";

            currentIsPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, true);
            currentArtwork = intent.getStringExtra(EXTRA_ARTWORK);

            updatePlaybackState(currentIsPlaying);

            // If artwork changed, load asynchronously
            if (currentArtwork != null && !currentArtwork.isEmpty() && !currentArtwork.equals(cachedArtworkUrl)) {
                cachedArtworkUrl = currentArtwork;
                new Thread(() -> {
                    try {
                        URL url = new URL(currentArtwork);
                        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                        conn.setConnectTimeout(2500);
                        conn.setReadTimeout(2500);
                        conn.setDoInput(true);
                        conn.connect();
                        InputStream input = conn.getInputStream();
                        cachedArtworkBitmap = BitmapFactory.decodeStream(input);
                    } catch (Exception e) {
                        cachedArtworkBitmap = null;
                    }
                    showNotification();
                }).start();
            } else {
                showNotification();
            }
        }

        return START_STICKY;
    }

    private void updatePlaybackState(boolean isPlaying) {
        if (mediaSession == null) return;
        long actions = PlaybackStateCompat.ACTION_PLAY |
                PlaybackStateCompat.ACTION_PAUSE |
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                PlaybackStateCompat.ACTION_STOP;

        int state = isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        mediaSession.setPlaybackState(new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f)
                .build());

        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "Sync Play");

        if (cachedArtworkBitmap != null) {
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, cachedArtworkBitmap);
        }
        mediaSession.setMetadata(metaBuilder.build());
    }

    private void showNotification() {
        int intentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            intentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        // Action Prev
        Intent prevIntent = new Intent(this, MediaButtonReceiver.class);
        prevIntent.setAction(MediaButtonReceiver.ACTION_PREV);
        PendingIntent pPrev = PendingIntent.getBroadcast(this, 1, prevIntent, intentFlags);

        // Action Play / Pause
        Intent playPauseIntent = new Intent(this, MediaButtonReceiver.class);
        playPauseIntent.setAction(currentIsPlaying ? MediaButtonReceiver.ACTION_PAUSE : MediaButtonReceiver.ACTION_PLAY);
        PendingIntent pPlayPause = PendingIntent.getBroadcast(this, 2, playPauseIntent, intentFlags);

        // Action Next
        Intent nextIntent = new Intent(this, MediaButtonReceiver.class);
        nextIntent.setAction(MediaButtonReceiver.ACTION_NEXT);
        PendingIntent pNext = PendingIntent.getBroadcast(this, 3, nextIntent, intentFlags);

        // Open App Intent
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pOpenApp = PendingIntent.getActivity(this, 0, openAppIntent, intentFlags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(currentTitle)
                .setContentText(currentArtist)
                .setSubText("Sync Play")
                .setContentIntent(pOpenApp)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(currentIsPlaying)
                .addAction(R.drawable.ic_prev, "Prev", pPrev)
                .addAction(currentIsPlaying ? R.drawable.ic_pause : R.drawable.ic_play, currentIsPlaying ? "Pause" : "Play", pPlayPause)
                .addAction(R.drawable.ic_next, "Next", pNext)
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                        .setMediaSession(mediaSession.getSessionToken())
                        .setShowActionsInCompactView(0, 1, 2));

        if (cachedArtworkBitmap != null) {
            builder.setLargeIcon(cachedArtworkBitmap);
        } else {
            Bitmap defaultIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
            builder.setLargeIcon(defaultIcon);
        }

        Notification notification = builder.build();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            if (notificationManager != null) {
                notificationManager.notify(NOTIFICATION_ID, notification);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        stopForeground(true);
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
