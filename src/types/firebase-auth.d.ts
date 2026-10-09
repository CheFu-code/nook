import "firebase/auth";

declare module "firebase/auth" {
  export function getReactNativePersistence(
    storage: typeof import("@react-native-async-storage/async-storage").default,
  ): Persistence;
}
