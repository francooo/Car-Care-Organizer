import { type ComponentProps } from "react";
import { Feather } from "@expo/vector-icons";

export type FeatherIconName = ComponentProps<typeof Feather>["name"];
