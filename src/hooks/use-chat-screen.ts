import { useEffect, useRef, useState } from "react";
import {
    Keyboard,
    Platform,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    type ScrollView,
} from "react-native";

export type ChatMessage = {
    id: string;
    text: string;
    outgoing: boolean;
    time: string;
    status?: "pending" | "sent" | "failed";
    retry?: () => void;
};

export function useChatScreenLogic({
    messages,
    onSend,
    onAtBottom,
}: {
    messages: ChatMessage[];
    onSend: (text: string) => void;
    onAtBottom?: (atBottom: boolean) => void;
}) {
    const [draft, setDraft] = useState("");
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const shouldScroll = useRef(false);
    const nearBottom = useRef(true);
    const lastId = messages.at(-1)?.id;

    useEffect(() => {
        const show = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            () => {
                setKeyboardVisible(true);
                requestAnimationFrame(() =>
                    scrollRef.current?.scrollToEnd({ animated: true }),
                );
            },
        );
        const hide = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            () => setKeyboardVisible(false),
        );
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    useEffect(() => {
        if (!lastId || !nearBottom.current) return;
        const frame = requestAnimationFrame(() =>
            scrollRef.current?.scrollToEnd({ animated: false }),
        );
        return () => cancelAnimationFrame(frame);
    }, [lastId]);

    function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        nearBottom.current =
            contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
        onAtBottom?.(nearBottom.current);
    }

    function handleContentSizeChange() {
        if (!shouldScroll.current) return;
        scrollRef.current?.scrollToEnd({ animated: true });
        shouldScroll.current = false;
    }

    function send() {
        const trimmed = draft.trim();
        if (!trimmed) return;
        shouldScroll.current = true;
        onSend(trimmed);
        setDraft("");
    }

    return {
        draft,
        setDraft,
        keyboardVisible,
        scrollRef,
        canSend: !!draft.trim(),
        send,
        handleScroll,
        handleContentSizeChange,
        scrollToEnd: (animated: boolean) =>
            scrollRef.current?.scrollToEnd({ animated }),
    };
}
