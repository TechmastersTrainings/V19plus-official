# Preserve line numbers for crash reporting and stack traces
-keepattributes SourceFile,LineNumberTable,*Annotation*
-renamesourcefileattribute SourceFile

# Capacitor Core & Plugin Bridge Rules
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
    @com.getcapacitor.annotation.CapacitorPlugin public *;
}

# Android WebView JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Google Sign-In, Firebase, and API client rules
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.api.client.** { *; }

# Capacitor Native Biometric (@capgo/capacitor-native-biometric)
-keep class ee.forgr.biometric.** { *; }
-dontwarn ee.forgr.biometric.**

# Capacitor KeepAwake (@capacitor-community/keep-awake)
-keep class com.capacitorjs.plugins.keepawake.** { *; }
-dontwarn com.capacitorjs.plugins.keepawake.**

# Capacitor ScreenOrientation (@capacitor/screen-orientation)
-keep class com.capacitorjs.plugins.screenorientation.** { *; }
-dontwarn com.capacitorjs.plugins.screenorientation.**

# Capacitor PushNotifications (@capacitor/push-notifications)
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }
-dontwarn com.capacitorjs.plugins.pushnotifications.**

# Retrofit & OkHttp (if used by plugins)
-dontwarn okhttp3.**
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# Kotlin serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
