#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

@implementation AppDelegate

- (void)handleShortcutItem:(UIApplicationShortcutItem *)shortcutItem
               application:(UIApplication *)application {
  if (shortcutItem == nil || shortcutItem.type == nil ||
      [shortcutItem.type length] == 0) {
    return;
  }

  // We store the deep link directly in UIApplicationShortcutItemType (e.g.
  // "orbit://create-event")
  NSString *urlString = shortcutItem.type;
  NSURL *url = [NSURL URLWithString:urlString];

  if (url == nil) {
    return;
  }

  // Forward to React Native's Linking so JS can handle it
  [RCTLinkingManager application:application openURL:url options:@{}];
}

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  self.moduleName = @"main";

  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  BOOL result = [super application:application
      didFinishLaunchingWithOptions:launchOptions];

  // Handle launch via Home Screen Quick Action
  UIApplicationShortcutItem *shortcutItem =
      [launchOptions objectForKey:UIApplicationLaunchOptionsShortcutItemKey];
  if (shortcutItem) {
    [self handleShortcutItem:shortcutItem application:application];
  }

  return result;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {
  return [self bundleURL];
}

- (NSURL *)bundleURL {
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings]
      jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main"
                                 withExtension:@"jsbundle"];
#endif
}

// Linking API
- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:
                (NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {
  return [super application:application openURL:url options:options] ||
         [RCTLinkingManager application:application
                                openURL:url
                                options:options];
}

// Universal Links
- (BOOL)application:(UIApplication *)application
    continueUserActivity:(nonnull NSUserActivity *)userActivity
      restorationHandler:
          (nonnull void (^)(NSArray<id<UIUserActivityRestoring>> *_Nullable))
              restorationHandler {
  BOOL result = [RCTLinkingManager application:application
                          continueUserActivity:userActivity
                            restorationHandler:restorationHandler];
  return [super application:application
             continueUserActivity:userActivity
               restorationHandler:restorationHandler] ||
         result;
}

// Explicitly define remote notification delegates to ensure compatibility with
// some third-party libraries
- (void)application:(UIApplication *)application
    didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  return [super application:application
      didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// Explicitly define remote notification delegates to ensure compatibility with
// some third-party libraries
- (void)application:(UIApplication *)application
    didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  return [super application:application
      didFailToRegisterForRemoteNotificationsWithError:error];
}

// Explicitly define remote notification delegates to ensure compatibility with
// some third-party libraries
- (void)application:(UIApplication *)application
    didReceiveRemoteNotification:(NSDictionary *)userInfo
          fetchCompletionHandler:
              (void (^)(UIBackgroundFetchResult))completionHandler {
  return [super application:application
      didReceiveRemoteNotification:userInfo
            fetchCompletionHandler:completionHandler];
}

- (void)application:(UIApplication *)application
    performActionForShortcutItem:(UIApplicationShortcutItem *)shortcutItem
               completionHandler:(void (^)(BOOL))completionHandler {
  // Handle Quick Action while app is running / in background
  [self handleShortcutItem:shortcutItem application:application];

  if (completionHandler) {
    completionHandler(YES);
  }
}

@end
