import { useMessagesTab } from "@/hooks/use-messages-tab";
import { MessagesTabView } from "./messages-tab-ui";

export function MessagesTab() {
    const messages = useMessagesTab();
    return <MessagesTabView {...messages} />;
}
