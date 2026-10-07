import { Image } from "expo-image";
import * as Device from "expo-device";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState, useEffect } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Linking,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChefuAccessToken } from "@/context/social-context";
import { errorMessage, type Id } from "@/lib/social";
import { useNookApi } from "@/hooks/use-nook-api";
import { sendUpload, validateMedia } from "@/lib/upload";
import { useAppTheme } from "@/lib/theme";
import { ui } from "./ui";
import { FeedIcon } from "../feed-icon";

export function Composer({ story = false }: { story?: boolean }) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const scale = Math.min(1.12, Math.max(0.9, width / 390));
	const theme = useAppTheme();
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
	const pickerBusy = useRef(false);
	const uploadId = useRef<Id<"uploads"> | null>(null);
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
	function close() {
		if (pickerBusy.current) return;
		if (busy.current) {
			if (phase === "publishing") {
				Alert.alert(
					"Finishing publication",
					`Keep this screen open while the server confirms your ${story ? "story" : "post"}.`,
				);
				return;
			}
			Alert.alert(
				"Cancel upload?",
				story
					? "Your unfinished upload will be discarded."
					: "Your unfinished upload and caption will be discarded.",
				[
					{ text: "Keep uploading", style: "cancel" },
					{
						text: "Cancel upload",
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
				story ? "Discard story?" : "Discard post?",
				story
					? "Your selected photo will be discarded."
					: "Your selected media and caption will be discarded.",
				[
					{ text: "Keep editing", style: "cancel" },
					{ text: "Discard", style: "destructive", onPress: discard },
				],
			);
		else discard();
	}
	async function pick(source: "library" | "camera" = "library") {
		if (busy.current || pickerBusy.current) return;
		pickerBusy.current = true;
		setPicking(true);
		setError("");
		try {
			if (source === "camera") {
				if (Platform.OS === "ios" && !Device.isDevice) {
					Alert.alert(
						"Camera unavailable",
						"Use a physical device to take a photo, or choose one from the photo library.",
					);
					return;
				}
				const permission = await ImagePicker.requestCameraPermissionsAsync();
				if (!permission.granted) {
					Alert.alert(
						"Camera access needed",
						"Allow camera access to take a photo.",
						permission.canAskAgain
							? [{ text: "OK" }]
							: [
								{ text: "Cancel", style: "cancel" },
								{
									text: "Open settings",
									onPress: () => {
										void Linking.openSettings().catch(() =>
											setError(
												"Open your device settings to allow camera access.",
											),
										);
									},
								},
							],
					);
					return;
				}
			}
			const result =
				source === "camera"
					? await ImagePicker.launchCameraAsync({
						mediaTypes: ["images"],
						quality: 0.8,
					})
					: await ImagePicker.launchImageLibraryAsync({
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
		if (!asset || busy.current) return;
		busy.current = true;
		controller.current = new AbortController();
		const signal = controller.current.signal;
		setError("");
		setPhase("preparing");
		try {
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
				const local = await fetch(asset.uri);
				const raw = await local.blob();
				if (!raw.size || raw.size > meta.max)
					throw new Error(
						"This file is empty or exceeds the upload size limit.",
					);
				const blob = raw.slice(0, raw.size, meta.mime);
				const token = await getToken();
				if (!token) throw new Error("Session expired. Sign in again.");
				if (signal.aborted) return;
				setPhase("uploading");
				await sendUpload(activeId, blob, token, setProgress, signal);
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
		} finally {
			busy.current = false;
			if (mounted.current) setPhase("idle");
		}
	}
	return (
		<KeyboardAvoidingView
			style={[ui.screen, { paddingTop: insets.top, backgroundColor: theme.background }]}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<View
				style={{
					minHeight: 60 * scale,
					paddingHorizontal: 18 * scale,
					flexDirection: "row",
					alignItems: "center",
					gap: 14 * scale,
					borderBottomWidth: 1,
					borderBottomColor: theme.border,
				}}
			>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Close composer"
					disabled={picking}
					onPress={close}
					style={{
						width: 42 * scale,
						height: 42 * scale,
						borderRadius: 15 * scale,
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: theme.subtle,
					}}
				>
					<FeedIcon name="close" />
				</Pressable>
				<View style={{ flex: 1, gap: 2 }}>
					<Text style={{ color: theme.ink, fontSize: 18 * scale, fontWeight: "700", letterSpacing: -0.4 }}>
						{story ? "Create a story" : "Create a post"}
					</Text>
					<Text style={{ color: theme.muted, fontSize: 12 * scale }}>
						{story ? "A moment that lasts 24 hours" : "Share a moment with nook"}
					</Text>
				</View>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={phase === "publishing" ? "Publishing" : story ? "Publish story" : "Publish post"}
					accessibilityState={{ disabled: phase !== "idle" || picking || !asset, busy: phase !== "idle" }}
					disabled={phase !== "idle" || picking || !asset}
					style={{
						minWidth: 86 * scale,
						height: 42 * scale,
						paddingHorizontal: 16 * scale,
						borderRadius: 15 * scale,
						backgroundColor: theme.blue,
						alignItems: "center",
						justifyContent: "center",
						opacity: !asset || phase !== "idle" || picking ? 0.48 : 1,
					}}
					onPress={() => void submit()}
				>
					<Text style={{ color: "#FFFFFF", fontSize: 14 * scale, fontWeight: "700" }}>
						{phase === "publishing" ? "Posting…" : "Share"}
					</Text>
				</Pressable>
			</View>
			<ScrollView
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				keyboardDismissMode="interactive"
				contentContainerStyle={{
					paddingHorizontal: 20 * scale,
					paddingTop: 22 * scale,
					gap: 22 * scale,
					paddingBottom: insets.bottom + 32 * scale,
				}}
			>
				<View style={{ gap: 11 * scale }}>
					<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
						<Text style={{ color: theme.ink, fontSize: 15 * scale, fontWeight: "700" }}>
							{story ? "Story photo" : "Media"}
						</Text>
						{asset && (
							<Text style={{ color: theme.muted, fontSize: 12 * scale }}>
								{asset.type === "video" ? "VIDEO" : "PHOTO"}
							</Text>
						)}
					</View>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={asset ? "Change selected media" : "Choose media"}
						accessibilityHint={story ? "Select a photo for your story" : "Select a photo or video for your post"}
						disabled={phase !== "idle" || picking}
						onPress={() => void pick()}
						style={{
							width: "100%",
							aspectRatio: 1,
							maxHeight: width - 40 * scale,
							borderRadius: 24 * scale,
							backgroundColor: asset?.type === "video" ? "#101B32" : theme.subtle,
							borderWidth: asset ? 0 : 1,
							borderColor: theme.border,
							borderStyle: "dashed",
							justifyContent: "center",
							alignItems: "center",
							overflow: "hidden",
						}}
					>
						{asset?.type === "image" ? (
							<Image
								source={{ uri: asset.uri }}
								style={{ width: "100%", height: "100%" }}
								contentFit="contain"
							/>
						) : asset?.type === "video" ? (
							<View style={{ alignItems: "center", gap: 12 * scale, padding: 28 * scale }}>
								<View style={{ width: 68 * scale, height: 68 * scale, borderRadius: 34 * scale, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
									<FeedIcon name="video" size={31 * scale} color="#FFFFFF" />
								</View>
								<Text style={{ color: "#FFFFFF", fontSize: 16 * scale, fontWeight: "700" }}>Video ready to share</Text>
								<Text style={{ color: "#D3DCEB", fontSize: 13 * scale }}>
									{Math.round((asset.duration ?? 0) / 1000)} sec · {asset.fileName || "Selected video"}
								</Text>
							</View>
						) : (
							<View style={{ alignItems: "center", gap: 12 * scale, padding: 28 * scale }}>
								<View style={{ width: 66 * scale, height: 66 * scale, borderRadius: 22 * scale, backgroundColor: theme.blueSoft, alignItems: "center", justifyContent: "center" }}>
									<FeedIcon name="photo" size={30 * scale} color={theme.blue} />
								</View>
								<Text style={{ color: theme.ink, fontSize: 16 * scale, fontWeight: "700" }}>
									{story ? "Add a photo to your story" : "Add a photo or video"}
								</Text>
								<Text style={{ color: theme.muted, fontSize: 13 * scale, textAlign: "center" }}>
									{picking ? "Opening your library…" : "Choose from your library to get started"}
								</Text>
							</View>
						)}
						{asset && phase === "idle" && (
							<View style={{ position: "absolute", right: 12 * scale, top: 12 * scale, width: 38 * scale, height: 38 * scale, borderRadius: 19 * scale, backgroundColor: "rgba(13,21,41,0.72)", alignItems: "center", justifyContent: "center" }}>
								<FeedIcon name="photo" size={18 * scale} color="#FFFFFF" />
							</View>
						)}
					</Pressable>
				</View>
				<View style={{ flexDirection: "row", gap: 11 * scale }}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Take a photo"
						disabled={phase !== "idle" || picking}
						onPress={() => void pick("camera")}
						style={[
							{
								flex: story ? 1 : 0.85,
								minHeight: 48 * scale,
								borderRadius: 16 * scale,
								backgroundColor: theme.blue,
								flexDirection: "row",
								justifyContent: "center",
								alignItems: "center",
								gap: 9 * scale,
							},
							(phase !== "idle" || picking) && ui.disabled,
						]}
					>
						<FeedIcon name="camera" size={19 * scale} color="white" />
						<Text style={{ color: "#FFFFFF", fontSize: 14 * scale, fontWeight: "700" }}>Take photo</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={story ? "Choose a photo from your library" : "Choose a photo or video from your library"}
						disabled={phase !== "idle" || picking}
						onPress={() => void pick("library")}
						style={{
							flex: 1,
							minHeight: 48 * scale,
							borderRadius: 16 * scale,
							backgroundColor: theme.blueSoft,
							borderWidth: 1,
							borderColor: theme.border,
							flexDirection: "row",
							justifyContent: "center",
							alignItems: "center",
							gap: 9 * scale,
							opacity: phase !== "idle" || picking ? 0.45 : 1,
						}}
					>
						<FeedIcon name="photo" size={19 * scale} color={theme.blue} />
						<Text style={{ color: theme.blue, fontSize: 14 * scale, fontWeight: "700" }}>Photo library</Text>
					</Pressable>
				</View>
				<View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 * scale, padding: 13 * scale, borderRadius: 16 * scale, backgroundColor: theme.subtle }}>
					<FeedIcon name="info" size={17 * scale} color={theme.secondary} />
					<Text style={{ flex: 1, color: theme.secondary, fontSize: 12 * scale, lineHeight: 18 * scale }}>
						{story
							? "Your photo will be visible to signed-in members for 24 hours. Maximum size: 10 MB."
							: "Photos up to 10 MB. MP4 or MOV videos up to 30 seconds and 50 MB."}
					</Text>
				</View>
				{!story && (
					<>
						<View style={{ gap: 10 * scale }}>
							<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
								<Text style={{ color: theme.ink, fontSize: 15 * scale, fontWeight: "700" }}>Write a caption</Text>
								<Text style={{ color: theme.muted, fontSize: 12 * scale }}>{caption.length}/2200</Text>
							</View>
							<TextInput
								accessibilityLabel="Post caption"
								placeholder="What would you like to share?"
								placeholderTextColor={theme.muted}
								value={caption}
								onChangeText={setCaption}
								editable={phase === "idle"}
								multiline
								maxLength={2200}
								textAlignVertical="top"
								style={{
									minHeight: 132 * scale,
									padding: 16 * scale,
									borderRadius: 18 * scale,
									borderWidth: 1,
									borderColor: theme.border,
									backgroundColor: theme.surface,
									color: theme.ink,
									fontSize: 15 * scale,
									lineHeight: 22 * scale,
								}}
							/>
						</View>
					</>
				)}
				{phase !== "idle" && (
					<View style={{ gap: 11 * scale, padding: 16 * scale, borderRadius: 18 * scale, backgroundColor: theme.subtle }}>
						<View style={{ flexDirection: "row", alignItems: "center", gap: 10 * scale }}>
							<ActivityIndicator color={theme.blue} />
							<Text accessibilityLiveRegion="polite" style={{ flex: 1, color: theme.secondary, fontSize: 13 * scale, lineHeight: 19 * scale }}>
							{phase === "uploading"
								? `Uploading ${Math.round(progress * 100)}%`
								: phase === "publishing"
									? "Publishing…"
									: "Preparing media…"}{" "}
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
						<Text style={{ color: theme.muted, fontSize: 11 * scale }}>Keep this screen open while your {story ? "story" : "post"} is being shared.</Text>
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
							<Text style={ui.buttonText}>Retry sharing</Text>
						</Pressable>
					</View>
				)}
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
