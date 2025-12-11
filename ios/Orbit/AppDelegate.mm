#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <React/RCTBridge.h>
#import <React/RCTEventEmitter.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"main";

  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // Handle Quick Action shortcut if app was launched from shortcut
  UIApplicationShortcutItem *shortcutItem = [launchOptions objectForKey:UIApplicationLaunchOptionsShortcutItemKey];
  if (shortcutItem) {
    // Delay handling until bridge is ready
    dispatch_async(dispatch_get_main_queue(), ^{
      [self handleShortcutItem:shortcutItem];
    });
  }

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Linking API
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [super application:application openURL:url options:options] || [RCTLinkingManager application:application openURL:url options:options];
}

// Universal Links
- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  BOOL result = [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
  return [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler] || result;
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  return [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  return [super application:application didFailToRegisterForRemoteNotificationsWithError:error];
}

// Explicitly define remote notification delegates to ensure compatibility with some third-party libraries
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  return [super application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

// Handle Quick Action shortcuts when app is already running
- (void)application:(UIApplication *)application performActionForShortcutItem:(UIApplicationShortcutItem *)shortcutItem completionHandler:(void (^)(BOOL))completionHandler
{
  [self handleShortcutItem:shortcutItem];
  completionHandler(YES);
}

// Helper method to handle shortcut items
- (void)handleShortcutItem:(UIApplicationShortcutItem *)shortcutItem
{
  NSString *shortcutType = shortcutItem.type;
  NSString *deepLink = nil;

  if ([shortcutType isEqualToString:@"com.dovydmcnugget.orbit.create-event"]) {
    deepLink = @"orbit://create-event";
  } else if ([shortcutType isEqualToString:@"com.dovydmcnugget.orbit.create-post"]) {
    deepLink = @"orbit://create-post";
  } else if ([shortcutType isEqualToString:@"com.dovydmcnugget.orbit.dms"]) {
    deepLink = @"orbit://dms";
  } else if ([shortcutType isEqualToString:@"com.dovydmcnugget.orbit.view-tickets"]) {
    deepLink = @"orbit://view-tickets";
  } else if ([shortcutType isEqualToString:@"com.dovydmcnugget.orbit.view-notifications"]) {
    deepLink = @"orbit://view-notifications";
  }

  if (deepLink) {
    NSURL *url = [NSURL URLWithString:deepLink];
    [RCTLinkingManager application:[UIApplication sharedApplication] openURL:url options:@{}];
  }
}

@end
