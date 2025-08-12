import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

// Animated, softly drifting gradient blobs with subtle parallax
export function EtherealBackground() {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(a, {
        toValue: 1,
        duration: 60000, // 60s drift
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    ).start();
  }, [a]);

  const t1 = a.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });
  const t2 = a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 overflow-hidden bg-sunset-50"
    >
      {/* Base vertical gradient */}
      <LinearGradient
        colors={["#fff7f5", "#ffd2c5", "#ffb3a0"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Blobs */}
      <Animated.View
        style={{
          position: "absolute",
          left: -80,
          top: -60,
          width: 400,
          height: 400,
          borderRadius: 200,
          transform: [{ translateX: t1 }, { translateY: t2 }],
          opacity: 0.55,
        }}
      >
        <LinearGradient
          colors={["#ff8f75", "#ff6b4d"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, borderRadius: 200 }}
        />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          right: -120,
          bottom: -80,
          width: 360,
          height: 360,
          borderRadius: 180,
          transform: [{ translateX: t2 }, { translateY: t1 }],
          opacity: 0.5,
        }}
      >
        <LinearGradient
          colors={["#ffd2c5", "#ff8f75"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1, borderRadius: 180 }}
        />
      </Animated.View>
    </View>
  );
}
