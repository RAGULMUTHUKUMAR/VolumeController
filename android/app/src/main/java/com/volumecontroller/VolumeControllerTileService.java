package com.volumecontroller;

import android.media.AudioManager;
import android.service.quicksettings.TileService;

public class VolumeControllerTileService extends TileService {
    @Override
    public void onClick() {
        super.onClick();

        AudioManager audioManager = getSystemService(AudioManager.class);
        audioManager.adjustStreamVolume(
                AudioManager.STREAM_MUSIC,
                AudioManager.ADJUST_SAME,
                AudioManager.FLAG_SHOW_UI);
    }
}
