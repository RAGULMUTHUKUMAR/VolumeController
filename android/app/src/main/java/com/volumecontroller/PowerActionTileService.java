package com.volumecontroller;

import android.app.PendingIntent;
import android.content.Intent;
import android.provider.Settings;
import android.service.quicksettings.TileService;
import android.widget.Toast;

abstract class PowerActionTileService extends TileService {
    @Override
    public void onClick() {
        super.onClick();

        if (PowerMenuAccessibilityService.showPowerDialog()) {
            return;
        }

        Toast.makeText(
                this,
                "Enable Volume Controller Power Menu in Accessibility settings, then try again.",
                Toast.LENGTH_LONG).show();

        Intent settingsIntent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    0,
                    settingsIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            startActivityAndCollapse(pendingIntent);
        } else {
            settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivityAndCollapse(settingsIntent);
        }
    }
}
