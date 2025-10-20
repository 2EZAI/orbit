import { useEffect, useState } from "react";
import { useAuth } from "~/src/lib/auth";
import { supabase } from "../src/lib/supabase";
import { router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  GoogleSigninButton,
  SignInResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

export function useSocialLoginsApi() {
  const [error, setError] = useState<Error | null>(null);

  GoogleSignin.configure({
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    iosClientId:
      "687195339278-vf4jcpfcj0mi7r2g74mgnbo9n4frlv5l.apps.googleusercontent.com",
    webClientId:
      "687195339278-vf4jcpfcj0mi7r2g74mgnbo9n4frlv5l.apps.googleusercontent.com",
  });

  const appleUserExistsOrNot = async (uesrId: string) => {
    // console.error('uesr>', uesrId);
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("apple_id", uesrId)
      .maybeSingle(); // Use maybeSingle() if email might not exist

    if (error) {
      console.error("❌ Error querying Supabase:", error);
      return false;
    }

    return !!data; // true if found, false if null
  };

  const checkUserOnboarded = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("❌ Error checking onboarding status:", error);
        return false;
      }
      console.log("onboard data>", data);
      // User is onboarded if they have a username set (not null, undefined, or empty string)
      const hasUsername = !!(
        data &&
        data.username &&
        data.username.trim().length > 0
      );

      return hasUsername;
    } catch (e) {
      console.error("❌ Exception checking onboarding status:", e);
      return false;
    }
  };
  // Update user data
  const updateUser = async (updates: any, user: any) => {
    try {
      const { error: supabaseError } = await supabase
        .from("users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      console.log("supabaseError>", supabaseError);
      if (supabaseError) throw supabaseError;
    } catch (e) {
      console.log(
        "error>",
        e instanceof Error ? e : new Error("An error occurred")
      );
      // setError(e instanceof Error ? e : new Error("An error occurred"));
      throw e;
    }
  };
  const createGoogleUser = async (newUserData: SignInResponse) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .insert({
          google_id: newUserData?.data?.user.id || "",
          register_type: "google",
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error creating user:", error);
        throw error;
      }

      return data;
    } catch (e) {
      console.log(
        "error>",
        e instanceof Error ? e : new Error("An error occurred")
      );
      throw e;
    }
  };

  const appleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // console.log("credential>", credential);
      console.log("credential>", credential);
      // Sign in via Supabase Auth.
      if (credential.identityToken) {
        // console.log("credential??>", credential);
        const {
          error,
          data: { user },
        } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
        });
        const exists = await checkUserOnboarded(user?.id || "");
        if (exists) {
          //user exsist navigate to home
          // User is signed in.
          // Navigate to home
          // router.replace("/(app)/home");
          router.push("/(app)/(map)");
        } else {
          //new user
          if (!error) {
            await updateUser(
              {
                apple_id: credential?.user,
                register_type: "apple",
              },
              user
            );
            // User is signed in.
            // Navigate to onboarding
            setTimeout(() => {
              router.replace("/(auth)/(onboarding)/username");
            }, 500);
          }
        }
      } else {
        throw new Error("No identityToken.");
      }
    } catch (e) {
      if (e instanceof Error && "code" in e) {
        const err = e as { code: string };
        if (err.code === "ERR_REQUEST_CANCELED") {
          // handle that the user canceled the sign-in flow
        } else {
          // handle other error codes
        }
      } else {
        // fallback if it's not an Error with a code
        console.error("Unknown error:", e);
      }
    }
  };

  const googleLogin = async () => {
    console.log("handleGoogleLogin>");
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log("userInfo>", userInfo, userInfo.data?.user.id);
      if (userInfo.data && userInfo.data.idToken) {
        const {
          data: { user },
          error,
        } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: userInfo.data.idToken,
        });

        // console.log("userInfo>", userInfo);
        // console.log("userInfo.data.idToken>", userInfo.data.idToken);
        // console.log("data>", user);
        // console.log("error>", error);
        const exists = await checkUserOnboarded(user?.id || "");
        console.log(exists ? "✅ User exists" : "❌ User does not exist");

        if (exists) {
          //exist user
          // User is signed in.
          // Navigate to home
          router.navigate("/(app)/(map)");
          console.log("user exist, navigate to home");
        } else {
          console.log(await supabase.auth.getSession());
          await updateUser(
            {
              google_id: userInfo.data.user.id,
              register_type: "google",
            },
            user
          );
          // User is signed in.
          // Navigate to onboarding
          setTimeout(() => {
            router.replace("/(auth)/(onboarding)/username");
          }, 500);
        }
      } else {
        throw new Error("no ID token present!");
      }
    } catch (error: any) {
      console.log("handleGoogleLogin>error>", error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
      } else {
        // some other error happened
      }
    }
  };

  return {
    error,
    appleLogin,
    googleLogin,
  };
}
