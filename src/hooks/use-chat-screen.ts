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
    backendId?: string;
    text: string;
    outgoing: boolean;
    delivered?: boolean;
    createdAt?: number;
    time: string;
    edited?: boolean;
    canDeleteForEveryone?: boolean;
    deletedForMe?: boolean;
    deletedForEveryone?: boolean;
    status?: "pending" | "sent" | "failed";
    retry?: () => void;
    replyTo?: {
        id: string;
        text: string;
        outgoing: boolean;
    };
    reactions?: { emoji: string; count: number; reacted: boolean }[];
};

export function useChatScreenLogic({
    messages,
    onSend,
    onAtBottom,
}: {
    messages: ChatMessage[];
    onSend: (text: string, replyTo?: ChatMessage["replyTo"]) => void;
    onAtBottom?: (atBottom: boolean) => void;
}) {
    const [draft, setDraft] = useState("");
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const shouldScroll = useRef(false);
    const nearBottom = useRef(true);
    const initialScrollPending = useRef(true);
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
        if (initialScrollPending.current && messages.length > 0) {
            initialScrollPending.current = false;
            requestAnimationFrame(() =>
                scrollRef.current?.scrollToEnd({ animated: false }),
            );
            return;
        }
        if (!shouldScroll.current) return;
        scrollRef.current?.scrollToEnd({ animated: true });
        shouldScroll.current = false;
    }

    function send() {
        const trimmed = draft.trim();
        if (!trimmed) return;
        shouldScroll.current = true;
        onSend(
            trimmed,
            replyTo
                ? {
                    id: replyTo.id,
                    text: replyTo.text,
                    outgoing: replyTo.outgoing,
                }
                : undefined,
        );
        setDraft("");
        setReplyTo(null);
    }

    return {
        draft,
        setDraft,
        replyTo,
        setReplyTo,
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
