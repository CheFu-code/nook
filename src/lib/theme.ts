import { useColorScheme } from "react-native";

const light = {
  background: "#FCFDFE",
  surface: "#FFFFFF",
  subtle: "#F3F5F9",
  input: "#F2F4F8",
  border: "#E7EAF0",
  ink: "#0D1529",
  muted: "#7C879F",
  secondary: "#52617A",
  blue: "#087EFF",
  blueSoft: "#E8F1FF",
};

const dark = {
  background: "#090D16",
  surface: "#111827",
  subtle: "#1A2434",
  input: "#151F2E",
  border: "#273449",
  ink: "#F3F6FC",
  muted: "#9AA8BE",
  secondary: "#B8C4D8",
  blue: "#4B9BFF",
  blueSoft: "#172D49",
};

export function useAppTheme() {
  const isDark = useColorScheme() === "dark";
  return { ... (isDark ? dark : light), isDark };
}
