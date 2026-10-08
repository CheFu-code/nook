import { Image, type ImageSource } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { validateProfile, type ProfileDraft } from "@/lib/profile-form";
import { FeedIcon, type IconName } from "./feed-icon";
import { useAppTheme } from "@/lib/theme";
import { useNookLanguage } from "@/lib/language";

type Props = {
  initial: ProfileDraft;
  avatar: ImageSource;
  onSave: (profile: ProfileDraft) => void;
  onClose: () => void;
};
export function EditProfileScreen({ initial, avatar, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(initial);
  const [picking, setPicking] = useState(false);
  const pickingRef = useRef(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollView = useRef<ScrollView>(null);
  const theme = useAppTheme();
  const { t } = useNookLanguage();
  const s = width / 390;
  const v = Math.max(0.82, (height - insets.top - 20) / 820);
  const fs = (n: number) => n * s;
  const update = (key: keyof ProfileDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const dirty = Object.keys(draft).some(
    (key) =>
      draft[key as keyof ProfileDraft] !== initial[key as keyof ProfileDraft],
  );
  const close = () =>
    dirty
      ? Alert.alert(
          t("Discard changes?"),
          t("Your unsaved profile changes will be lost."),
          [
            { text: t("Keep editing"), style: "cancel" },
            { text: t("Discard"), style: "destructive", onPress: onClose },
          ],
        )
      : onClose();
  function save() {
    const error = validateProfile(draft);
    if (error) return Alert.alert(t("Check your profile"), t(error));
    onSave({
      ...draft,
      username: draft.username.trim(),
      name: draft.name.trim(),
      website: draft.website.trim(),
      location: draft.location.trim(),
    });
  }
  async function changePhoto() {
    if (pickingRef.current) return;
    pickingRef.current = true;
    setPicking(true);
    try {
      const ImagePicker = await import("expo-image-picker");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const image = result.assets[0];
      const mime = image.mimeType?.toLowerCase();
      if (
        mime
          ? !["image/jpeg", "image/png", "image/jpg"].includes(mime)
          : !/\.(jpe?g|png)$/i.test(image.fileName ?? image.uri)
      ) {
        Alert.alert(
          t("Choose a JPG or PNG"),
          t("Please select a JPG or PNG image for your profile photo."),
        );
        return;
      }
      if (image.fileSize == null || image.fileSize > 5 * 1024 * 1024) {
        Alert.alert(
          t("Choose a smaller photo"),
          t("Select an image with a known size of 5 MB or less."),
        );
        return;
      }
      update("photoUri", image.uri);
    } catch {
      Alert.alert(
        t("Unable to open photos"),
        t("Please try opening the photo library again."),
      );
    } finally {
      pickingRef.current = false;
      setPicking(false);
    }
  }
  const field = (
    key: "username" | "name" | "bio" | "website" | "location",
    label: string,
    icon: IconName | "@",
    helper?: string,
  ) => (
    <View
      style={{
        marginTop:
          (key === "username"
            ? 12
            : key === "website"
              ? 15
              : helper || key === "bio"
                ? 14
                : 11) * v,
      }}
    >
      <Text
        style={{
          color: theme.muted,
          fontSize: fs(12.5),
          fontWeight: "500",
          marginLeft: fs(3),
          marginBottom: 5 * v,
        }}
      >
        {t(label)}
      </Text>
      <View
        style={[
          styles.field,
          {
            borderRadius: fs(18),
            minHeight: (key === "bio" ? 70 : 43) * v,
            paddingHorizontal: fs(16),
            gap: fs(20),
            alignItems: key === "bio" ? "flex-start" : "center",
            paddingTop: key === "bio" ? 12 * v : 0,
            backgroundColor: theme.input,
            borderColor: theme.border,
          },
        ]}
      >
        {icon === "@" ? (
          <Text
            style={{
              color: theme.secondary,
              fontSize: fs(21),
              fontWeight: "600",
              width: fs(20),
              textAlign: "center",
            }}
          >
            @
          </Text>
        ) : (
          <FeedIcon name={icon} size={fs(19)} color={theme.secondary} />
        )}
        <TextInput
          accessibilityLabel={t(label)}
          placeholder={
            key === "username"
              ? t("Choose a username")
              : key === "name"
                ? t("Your name")
                : key === "bio"
                  ? t("Tell people about yourself")
                  : key === "website"
                    ? "https://example.com"
                    : t("City, country")
          }
          onFocus={(event) => {
            const target = event.nativeEvent.target;
            requestAnimationFrame(() => {
              scrollView.current?.scrollResponderScrollNativeHandleToKeyboard(
                target,
                120,
                true,
              );
            });
          }}
          value={draft[key]}
          onChangeText={(value) => update(key, value)}
          placeholderTextColor={theme.muted}
          style={{
            flex: 1,
            padding: 0,
            color: key === "website" ? theme.secondary : theme.ink,
            fontSize: fs(14.5),
            lineHeight: 19 * v,
            minHeight: key === "bio" ? 42 * v : 43 * v,
            paddingBottom: key === "bio" ? 15 * v : 0,
          }}
          multiline={key === "bio"}
          textAlignVertical={key === "bio" ? "top" : "center"}
          maxLength={
            key === "bio"
              ? 280
              : key === "username"
                ? 30
                : key === "name"
                  ? 60
                  : 200
          }
          autoCapitalize={
            key === "username" || key === "website" ? "none" : "sentences"
          }
          autoCorrect={key !== "username" && key !== "website"}
          keyboardType={key === "website" ? "url" : "default"}
          returnKeyType={key === "bio" ? "default" : "done"}
        />
        {key === "bio" && (
          <Text
            accessibilityLabel={`${draft.bio.length} of 280 characters`}
            style={{
              position: "absolute",
              bottom: 9 * v,
              right: fs(14),
              fontSize: fs(10.5),
              color: theme.muted,
            }}
          >
            {draft.bio.length}/280
          </Text>
        )}
      </View>
      {helper && (
        <Text
          style={{
            fontSize: fs(10.5),
            color: theme.muted,
            marginTop: 6 * v,
            marginLeft: key === "username" ? fs(45) : fs(13),
            lineHeight: 14 * v,
          }}
        >
          {t(helper)}
        </Text>
      )}
    </View>
  );
  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        {
          paddingTop: Math.max(0, insets.top - 4),
          backgroundColor: theme.background,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View
        style={{
          height: 45 * v,
          marginHorizontal: fs(18),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Back to profile")}
          onPress={close}
          style={[
            styles.back,
            {
              width: fs(37),
              height: 39 * v,
              borderRadius: fs(15),
              backgroundColor: theme.subtle,
              borderColor: theme.border,
            },
          ]}
        >
          <FeedIcon name="back" size={fs(21)} color={theme.ink} />
        </Pressable>
        <Text
          style={{
            fontSize: fs(17),
            fontWeight: "700",
            letterSpacing: -0.4,
            color: theme.ink,
            marginLeft: fs(15),
          }}
        >
          {t("Edit Profile")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Save profile")}
          disabled={picking}
          onPress={save}
          style={[
            styles.save,
            { width: fs(60), height: 39 * v, borderRadius: fs(16) },
          ]}
        >
          <Text style={{ color: "white", fontSize: fs(14), fontWeight: "600" }}>
            {t("Save")}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scrollView}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: fs(18),
          paddingBottom: Math.min(insets.bottom, 34) + 12,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: 12 * v }}>
          <View style={{ width: fs(128), height: 126 * v }}>
            <Image
              source={draft.photoUri ? { uri: draft.photoUri } : avatar}
              style={{ width: fs(128), height: 126 * v, borderRadius: fs(70) }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Change profile photo")}
              disabled={picking}
              onPress={changePhoto}
              style={[
                styles.camera,
                {
                  width: fs(37),
                  height: fs(37),
                  borderRadius: fs(20),
                  bottom: -1,
                  right: -1,
                },
              ]}
            >
              {picking ? (
                <ActivityIndicator color="white" />
              ) : (
                <FeedIcon name="camera" size={fs(21)} color="white" />
              )}
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={picking}
            onPress={changePhoto}
            style={{ marginTop: 9 * v, paddingVertical: 2 * v }}
          >
            <Text
              style={{
                color: theme.blue,
                fontSize: fs(13.5),
                fontWeight: "500",
              }}
            >
              {t("Change Photo")}
            </Text>
          </Pressable>
          <Text
            style={{ color: theme.muted, fontSize: fs(10.5), marginTop: 2 * v }}
          >
            {t("JPG, PNG up to 5MB")}
          </Text>
        </View>
        {field(
          "username",
          "Username",
          "@",
          "This is how people find you on nook.",
        )}
        {field("name", "Display Name", "profile", "This is your public name.")}
        {field("bio", t("Bio"), "bio")}
        {field("website", t("Website"), "link")}
        {field("location", t("Location"), "location")}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FCFDFE" },
  field: {
    backgroundColor: "#F4F5F7",
    borderWidth: 1,
    borderColor: "#E7EAF0",
    flexDirection: "row",
  },
  back: {
    backgroundColor: "#F0F2F5",
    borderWidth: 1,
    borderColor: "#E7EAF0",
    alignItems: "center",
    justifyContent: "center",
  },
  save: {
    backgroundColor: "#087EFF",
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    position: "absolute",
    backgroundColor: "#087EFF",
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 4px 8px #087EFF22",
  },
});
