import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ColorValue } from "react-native";

export type IconName =
    | "bell"
    | "lock"
    | "blocked"
    | "help"
    | "support"
    | "document"
    | "chevron-right"
    | "trash"
    | "compose"
    | "info"
    | "search"
    | "plus"
    | "heart"
    | "comment"
    | "send"
    | "bookmark"
    | "home"
    | "explore"
    | "profile"
    | "close"
    | "grid"
    | "video"
    | "tagged"
    | "person-plus"
    | "back"
    | "camera"
    | "bio"
    | "link"
    | "location"
    | "sign-out"
    | "settings"
    | "phone"
    | "video-call"
    | "photo"
    | "check"
    | "double-check"
    | "chat-send";
const symbols = {
    bell: { ios: "bell", android: "notifications" },
    lock: { ios: "lock", android: "lock" },
    blocked: { ios: "hand.raised.slash", android: "block" },
    help: { ios: "questionmark.circle", android: "help" },
    support: { ios: "lifepreserver", android: "support_agent" },
    document: { ios: "doc.text", android: "description" },
    "chevron-right": { ios: "chevron.right", android: "chevron_right" },
    trash: { ios: "trash", android: "delete" },
    compose: { ios: "square.and.pencil", android: "edit" },
    info: { ios: "info.circle", android: "info" },
    search: { ios: "magnifyingglass", android: "search" },
    plus: { ios: "plus", android: "add" },
    heart: { ios: "heart", android: "favorite" },
    comment: { ios: "bubble.left", android: "chat_bubble" },
    send: { ios: "paperplane", android: "send" },
    bookmark: { ios: "bookmark", android: "bookmark" },
    home: { ios: "house", android: "home" },
    explore: { ios: "safari", android: "explore" },
    profile: { ios: "person.crop.circle", android: "account_circle" },
    close: { ios: "xmark", android: "close" },
    grid: { ios: "square.grid.2x2", android: "grid_view" },
    video: { ios: "video", android: "videocam" },
    tagged: { ios: "person.crop.square", android: "account_box" },
    "person-plus": { ios: "person.badge.plus", android: "person_add" },
    back: { ios: "chevron.left", android: "arrow_back" },
    camera: { ios: "camera", android: "photo_camera" },
    bio: { ios: "text.alignleft", android: "short_text" },
    link: { ios: "link", android: "link" },
    location: { ios: "location", android: "location_on" },
    "sign-out": { ios: "rectangle.portrait.and.arrow.right", android: "logout" },
    settings: { ios: "gearshape", android: "settings" },
    phone: { ios: "phone", android: "call" },
    "video-call": { ios: "video", android: "videocam" },
    photo: { ios: "photo", android: "photo" },
    check: { ios: "checkmark", android: "check" },
    "double-check": { ios: "checkmark", android: "done_all" },
    "chat-send": { ios: "paperplane.fill", android: "send" },
} as const satisfies Record<IconName, SymbolViewProps["name"]>;

export function FeedIcon({
    name,
    size = 24,
    color = "#101B32",
    filled = false,
}: {
    name: IconName;
    size?: number;
    color?: ColorValue;
    filled?: boolean;
}) {
    const symbol = symbols[name];
    return (
        <SymbolView
            name={{
                ios: filled && name === "heart" ? "heart.fill" : symbol.ios,
                android: filled && name === "heart" ? "favorite" : symbol.android,
                web: filled && name === "heart" ? "favorite" : symbol.android,
            }}
            size={size}
            tintColor={color}
        />
    );
}
