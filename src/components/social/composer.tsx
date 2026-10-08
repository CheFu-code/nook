import { Image } from "expo-image";
import { randomUUID } from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState, useEffect } from "react";
import {
	ActivityIndicator,
	Alert,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChefuAccessToken, useProfile } from "@/context/social-context";
import { errorMessage, type Id } from "@/lib/social";
import { useNookApi } from "@/hooks/use-nook-api";
import { readUploadBlob, sendUpload, validateMedia } from "@/lib/upload";
import { useAppTheme } from "@/lib/theme";
import { ui } from "./ui";
import { FeedIcon } from "../feed-icon";
import { Avatar } from "./media";
import { useNookLanguage } from "@/lib/language";

export function Composer({ story = false }: { story?: boolean }) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const scale = Math.min(1.12, Math.max(0.9, width / 390));
	const theme = useAppTheme();
	const { t } = useNookLanguage();
	const profile = useProfile();
	const getToken = useChefuAccessToken();
	const request = useNookApi();
	const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
	const [caption, setCaption] = useState("");
	const [phase, setPhase] = useState<
		"idle" | "preparing" | "uploading" | "publishing"
	>("idle");
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState("");
	const [picking, setPicking] = useState(false);
	const scrollView = useRef<ScrollView>(null);
	const captionFocused = useRef(false);
	const pickerBusy = useRef(false);
	const uploadId = useRef<Id<"uploads"> | null>(null);
	const postRequestId = useRef(randomUUID());
	const uploaded = useRef(false);
	const busy = useRef(false);
	const controller = useRef<AbortController | null>(null);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			controller.current?.abort();
		};
	}, []);
	useEffect(() => {
		const subscription = Keyboard.addListener("keyboardDidShow", () => {
			if (captionFocused.current) scrollView.current?.scrollToEnd({ animated: true });
		});
		return () => subscription.remove();
	}, []);
	function close() {
		if (pickerBusy.current) return;
		if (busy.current) {
			if (phase === "publishing") {
				Alert.alert(
					t("Finishing publication"),
					`${t("Keep this screen open while the server confirms your")} ${t(story ? "story" : "post")}.`,
				);
				return;
			}
			Alert.alert(
				t("Cancel upload?"),
				story
					? t("Your unfinished upload will be discarded.")
					: t("Your unfinished upload and caption will be discarded."),
				[
					{ text: t("Keep uploading"), style: "cancel" },
					{
						text: t("Cancel upload"),
						style: "destructive",
						onPress: () => {
							controller.current?.abort();
							if (uploadId.current)
								void request(
									`/nook/uploads/${encodeURIComponent(uploadId.current)}`,
									{ method: "DELETE" },
								).catch(() => { });
							router.back();
						},
					},
				],
			);
			return;
		}
		const discard = () => {
			if (uploadId.current)
				void request(`/nook/uploads/${encodeURIComponent(uploadId.current)}`, {
					method: "DELETE",
				}).catch(() => { });
			router.back();
		};
		if (asset || caption)
			Alert.alert(
				t(story ? "Discard story?" : "Discard post?"),
				story
					? t("Your selected photo will be discarded.")
					: asset
						? t("Your selected media and caption will be discarded.")
						: t("Your text post will be discarded."),
				[
					{ text: t("Keep editing"), style: "cancel" },
					{ text: t("Discard"), style: "destructive", onPress: discard },
				],
			);
		else discard();
	}
	async function pick() {
		if (busy.current || pickerBusy.current) return;
		pickerBusy.current = true;
		setPicking(true);
		setError("");
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: story ? ["images"] : ["images", "videos"],
				allowsMultipleSelection: false,
				quality: 1,
				videoMaxDuration: 30,
			});
			if (result.canceled) return;
			validateMedia(result.assets[0]);
			if (uploadId.current)
				await request(`/nook/uploads/${encodeURIComponent(uploadId.current)}`, {
					method: "DELETE",
				});
			uploadId.current = null;
			uploaded.current = false;
			setAsset(result.assets[0]);
			setProgress(0);
		} catch (e) {
			setError(e instanceof Error ? e.message : errorMessage(e));
		} finally {
			pickerBusy.current = false;
			if (mounted.current) setPicking(false);
		}
	}
	async function submit() {
		if ((story ? !asset : !asset && !caption.trim()) || busy.current) return;
		busy.current = true;
		controller.current = new AbortController();
		const signal = controller.current.signal;
		setError("");
		setPhase("preparing");
		try {
			if (!asset && !story) {
				setPhase("publishing");
				await request("/nook/posts", {
					method: "POST",
					body: { caption, requestId: postRequestId.current },
				});
				postRequestId.current = randomUUID();
				busy.current = false;
				router.back();
				return;
			}
			if (!asset) throw new Error("Select media before sharing your story.");
			const meta = validateMedia(asset);
			if (!uploadId.current) {
				const created = await request<{ id: string }>("/nook/uploads", {
					method: "POST",
					body: {
						purpose: story ? "story" : "post",
						kind: meta.kind,
						width: meta.width,
						height: meta.height,
						...(meta.duration ? { duration: meta.duration } : {}),
					},
				});
				uploadId.current = created.id;
			}
			if (signal.aborted) {
				if (uploadId.current)
					void request(
						`/nook/uploads/${encodeURIComponent(uploadId.current)}`,
						{ method: "DELETE" },
					).catch(() => { });
				return;
			}
			if (!uploaded.current) {
				const activeId = uploadId.current;
				if (!activeId)
					throw new Error("Upload session is missing. Please try again.");
				const blob = Platform.OS === "web"
					? await readUploadBlob(asset.uri, meta.max, meta.mime)
					: null;
				const token = await getToken();
				if (!token) throw new Error("Session expired. Sign in again.");
				if (signal.aborted) return;
				setPhase("uploading");
				await sendUpload(activeId, asset.uri, meta.mime, blob, token, setProgress, signal);
				uploaded.current = true;
			}
			if (signal.aborted) return;
			setPhase("publishing");
			const activeId = uploadId.current;
			if (!activeId)
				throw new Error("Upload session is missing. Please try again.");
			if (story)
				await request("/nook/stories", {
					method: "POST",
					body: { uploadId: activeId, caption: "" },
				});
			else
				await request("/nook/posts", {
					method: "POST",
					body: { uploadId: activeId, caption },
				});
			uploadId.current = null;
			uploaded.current = false;
			busy.current = false;
			router.back();
		} catch (e) {
			if (mounted.current)
				setError(
					e instanceof Error && !(e as { data?: unknown }).data
						? e.message
						: errorMessage(e),
				);
				console.error("Composer error:", e);
		} finally {
			busy.current = false;
			if (mounted.current) setPhase("idle");
		}
	}
	return (
		<KeyboardAvoidingView
			style={[ui.screen, { paddingTop: insets.top, backgroundColor: theme.background }]}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			<View
				style={{
					height: 58 * scale,
					paddingHorizontal: 18 * scale,
					flexDirection: "row",
					alignItems: "center",
					borderBottomWidth: 1,
					borderBottomColor: theme.border,
				}}
			>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t("Close composer")}
					disabled={picking || phase !== "idle"}
					onPress={close}
					style={{
						width: 42 * scale,
						height: 42 * scale,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<FeedIcon name="close" color={theme.ink} />
				</Pressable>
				<Text
					style={{
						position: "absolute",
						left: 70 * scale,
						right: 112 * scale,
						textAlign: "center",
						color: theme.ink,
						fontSize: 18 * scale,
						fontWeight: "700",
					}}
					numberOfLines={1}
				>
					{story ? t("New story") : t("New post")}
				</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t(phase === "publishing" ? "Publishing" : story ? "Share story" : "Share post")}
					accessibilityState={{ disabled: phase !== "idle" || picking || (story ? !asset : !asset && !caption.trim()), busy: phase !== "idle" }}
					disabled={phase !== "idle" || picking || (story ? !asset : !asset && !caption.trim())}
					hitSlop={5}
					style={{
						marginLeft: "auto",
						minWidth: 76 * scale,
						height: 40 * scale,
						paddingHorizontal: 13 * scale,
						borderRadius: 13 * scale,
						backgroundColor: (story ? !asset : !asset && !caption.trim()) || phase !== "idle" || picking ? theme.subtle : theme.blue,
						alignItems: "center",
						justifyContent: "center",
					}}
					onPress={() => void submit()}
				>
					<Text style={{ color: (story ? !asset : !asset && !caption.trim()) || phase !== "idle" || picking ? theme.muted : "#FFFFFF", fontSize: 14 * scale, fontWeight: "700" }}>
						{phase === "publishing" ? t("Posting…") : t("Share")}
					</Text>
				</Pressable>
			</View>
			<ScrollView
				ref={scrollView}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				keyboardDismissMode="interactive"
				contentContainerStyle={{
					paddingHorizontal: 18 * scale,
					paddingTop: 26 * scale,
					gap: 26 * scale,
					paddingBottom: insets.bottom + 32 * scale,
				}}
			>
				
				<View style={{ gap: 18 * scale }}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 * scale }}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t(asset ? "Change media" : "Add media")}
							accessibilityHint={t(story ? "Select a photo for your story" : "Select a photo or video for your post")}
							accessibilityState={{ disabled: phase !== "idle" || picking, busy: picking }}
							disabled={phase !== "idle" || picking}
							onPress={() => void pick()}
							style={({ pressed }) => ({
								minHeight: 40 * scale,
								paddingHorizontal: 15 * scale,
								borderRadius: 26 * scale,
								borderWidth: 1,
								borderColor: theme.border,
								backgroundColor: pressed ? theme.blueSoft : theme.subtle,
								flexDirection: "row",
								alignItems: "center",
								gap: 11 * scale,
							})}
						>
							<FeedIcon name="photo" size={22 * scale} color={theme.ink} />
							<Text style={{ color: theme.ink, fontSize: 16 * scale, fontWeight: "600" }}>
								{picking ? t("Opening…") : asset ? t("Change media") : t("Media")}
							</Text>
						</Pressable>
					</ScrollView>
					{!!asset && (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t("Change selected media")}
							disabled={phase !== "idle" || picking}
							onPress={() => void pick()}
							style={{
								width: "100%",
								height: 230 * scale,
								borderRadius: 18 * scale,
								backgroundColor: asset.type === "video" ? "#101B32" : theme.subtle,
								overflow: "hidden",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							{asset.type === "image" ? (
								<Image source={{ uri: asset.uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
							) : (
								<View style={{ alignItems: "center", gap: 10 * scale }}>
									<FeedIcon name="video" size={36 * scale} color="#FFFFFF" />
									<Text style={{ color: "#FFFFFF", fontSize: 14 * scale, fontWeight: "600" }}>
										{Math.round((asset.duration ?? 0) / 1000)} {t("sec")} · {asset.fileName || t("Selected video")}
									</Text>
								</View>
							)}
						</Pressable>
					)}
				</View>
				{!story && (
					<TextInput
						accessibilityLabel={t("Post caption")}
						placeholder={t("What’s on your mind?")}
						placeholderTextColor={theme.muted}
						value={caption}
						onChangeText={(value) => {
							setCaption(value);
							postRequestId.current = randomUUID();
						}}
						onFocus={() => {
							captionFocused.current = true;
						}}
						onBlur={() => {
							captionFocused.current = false;
						}}
						editable={phase === "idle"}
						multiline
						maxLength={2200}
						textAlignVertical="top"
						style={{
							minHeight: 200 * scale,
							padding: 0,
							color: theme.ink,
							fontSize: 16 * scale,
							lineHeight: 24 * scale,
						}}
					/>
				)}
				{phase !== "idle" && (
					<View style={{ gap: 11 * scale, padding: 16 * scale, borderRadius: 18 * scale, backgroundColor: theme.subtle }}>
						<View style={{ flexDirection: "row", alignItems: "center", gap: 10 * scale }}>
							<ActivityIndicator color={theme.blue} />
							<Text accessibilityLiveRegion="polite" style={{ flex: 1, color: theme.secondary, fontSize: 13 * scale, lineHeight: 19 * scale }}>
							{phase === "uploading"
								? `${t("Uploading")} ${Math.round(progress * 100)}%`
								: phase === "publishing"
									? t("Publishing…")
									: t("Preparing media…")}{" "}
							</Text>
						</View>
						<View
							style={{ height: 6, backgroundColor: theme.border, borderRadius: 4, overflow: "hidden" }}
						>
							<View
								style={{
									height: 6,
									backgroundColor: theme.blue,
									borderRadius: 4,
									width: `${progress * 100}%`,
								}}
							/>
						</View>
						<Text style={{ color: theme.muted, fontSize: 11 * scale }}>{t("Keep this screen open while your")} {t(story ? "story" : "post")} {t("is being shared.")}</Text>
					</View>
				)}
				{!!error && (
					<View style={{ gap: 12 * scale, padding: 15 * scale, borderRadius: 17 * scale, backgroundColor: theme.isDark ? "#351C24" : "#FFF4F5", borderWidth: 1, borderColor: theme.isDark ? "#6D303D" : "#F4DADD" }}>
						<Text accessibilityRole="alert" style={[ui.error, { lineHeight: 20 * scale }]}>
							{error}
						</Text>
						<Pressable
							accessibilityRole="button"
							disabled={phase !== "idle"}
							style={[ui.button, { minHeight: 46 * scale, borderRadius: 15 * scale }]}
							onPress={() => void submit()}
						>
							<Text style={ui.buttonText}>{t("Retry sharing")}</Text>
						</Pressable>
					</View>
				)}
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
