import { router } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { Platform, View, type ViewStyle, type StyleProp } from "react-native";
import React from "react";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

function goBack() {
  router.back();
}

export function SwipeBackView({ children, style }: Props) {
  if (Platform.OS === "android") {
    return <View style={[{ flex: 1 }, style]}>{children}</View>;
  }

  const pan = Gesture.Pan()
    .activeOffsetX([15, 999])
    .failOffsetY([-10, 10])
    .hitSlop({ left: 0, width: 25 })
    .onEnd((e) => {
      "worklet";
      if (e.translationX > 60 && e.velocityX > 100) {
        runOnJS(goBack)();
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </GestureDetector>
  );
}
