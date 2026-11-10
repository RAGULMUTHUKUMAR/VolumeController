package com.volumecontroller;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;

public class PowerMenuAccessibilityService extends AccessibilityService {
    private static volatile PowerMenuAccessibilityService instance;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
    }

    @Override
    public void onInterrupt() {
    }

    @Override
    public void onDestroy() {
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }

    static boolean showPowerDialog() {
        PowerMenuAccessibilityService service = instance;
        return service != null
                && service.performGlobalAction(GLOBAL_ACTION_POWER_DIALOG);
    }
}
