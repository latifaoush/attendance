package com.dwansoft.amgtech;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.location.Location;
import android.os.Build;
import android.provider.Settings;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class FakeGpsModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    // Daftar package fake GPS yang dikenal
    private static final List<String> SUSPICIOUS_PACKAGES = Arrays.asList(
        "com.lexa.fakegps",
        "com.incorporateapps.fakegps.fre",
        "com.gsmartstudio.fakegps",
        "com.fakegps.mock",
        "com.blogspot.newapphorizons.fakegps",
        "com.byterevapps.livegoapp",
        "com.ycdev.adbenabler",
        "com.github.mshortest.fake_location",
        "com.hola.fakegps",
        "com.rubiconapps.spoofgps"
    );

    public FakeGpsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "FakeGpsModule";
    }

    @ReactMethod
    public void detectFakeGpsApps(Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);

            WritableArray detectedApps = Arguments.createArray();

            for (ApplicationInfo app : apps) {
                if (SUSPICIOUS_PACKAGES.contains(app.packageName)) {
                    detectedApps.pushString(app.packageName);
                }
            }

            promise.resolve(detectedApps);

        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void isDeveloperModeEnabled(Promise promise) {
        try {
            int dev = Settings.Secure.getInt(
                reactContext.getContentResolver(),
                Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,
                0
            );
            promise.resolve(dev == 1);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void isMockLocationEnabled(Promise promise) {
        try {
            // Cek lewat Settings (untuk Android < 6)
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                String mockLocation = Settings.Secure.getString(
                    reactContext.getContentResolver(),
                    Settings.Secure.ALLOW_MOCK_LOCATION
                );
                promise.resolve("1".equals(mockLocation));
                return;
            }

            // Cek via LocationManager (Android 6+)
            LocationManager lm = (LocationManager) reactContext
                .getSystemService(android.content.Context.LOCATION_SERVICE);

            String[] providers = {
                LocationManager.GPS_PROVIDER,
                LocationManager.NETWORK_PROVIDER
            };

            for (String provider : providers) {
                try {
                    Location location = lm.getLastKnownLocation(provider);
                    if (location != null && location.isFromMockProvider()) {
                        promise.resolve(true);
                        return;
                    }
                } catch (SecurityException ignored) {}
            }

            promise.resolve(false);

        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}