import { router } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { View, type ViewStyle } from "react-native";
import React from "react";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function SwipeBackView({ children, style }: Props) {
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([15, 999])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (e.translationX > 60 && e.velocityX > 100) {
        router.back();
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </GestureDetector>
  );
}
