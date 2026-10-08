import { type IconName } from "./feed-icon";

export type SettingsProps = {
    onClose: () => void;
    onEdit: () => void;
    onSaved: () => void;
    onBlockedUsers: () => void;
    onSignOut: () => Promise<void>;
    preview?: boolean;
};
export type Row = {
    label: string;
    icon: IconName;
    trailingIcon?: IconName;
    action?: () => void;
    detail?: string;
};