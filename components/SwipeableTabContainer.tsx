import React, { useRef, useCallback, useEffect } from "react";
import {
    View,
    Animated,
    Dimensions,
    StyleSheet,
} from "react-native";
import {
    GestureHandlerRootView,
    PanGestureHandler,
    PanGestureHandlerGestureEvent,
    State,
} from "react-native-gesture-handler";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = 50; // Minimum distance to trigger tab switch
const SWIPE_VELOCITY_THRESHOLD = 500; // Minimum velocity to trigger tab switch

interface SwipeableTabContainerProps {
    tabs: string[];
    activeIndex: number;
    onTabChange: (index: number) => void;
    children: React.ReactNode[];
    disabledTabs?: number[];
    onDisabledSwipe?: (index: number, tabName: string) => void;
}

export default function SwipeableTabContainer({
    tabs,
    activeIndex,
    onTabChange,
    children,
    disabledTabs = [],
    onDisabledSwipe,
}: SwipeableTabContainerProps) {
    const translateX = useRef(new Animated.Value(0)).current;
    const lastActiveIndex = useRef(activeIndex);

    // Update position when activeIndex changes from outside (bottom nav)
    useEffect(() => {
        if (activeIndex !== lastActiveIndex.current) {
            // Animate to new position
            Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 12,
            }).start();
            lastActiveIndex.current = activeIndex;
        }
    }, [activeIndex, translateX]);

    const handleGestureEvent = useCallback(
        (event: PanGestureHandlerGestureEvent) => {
            const { translationX } = event.nativeEvent;

            // Limit translation to prevent over-swiping
            const maxLeft = activeIndex === 0 ? 0 : SCREEN_WIDTH * 0.3;
            const maxRight = activeIndex === tabs.length - 1 ? 0 : SCREEN_WIDTH * 0.3;

            const clampedTranslation = Math.max(
                -maxRight,
                Math.min(maxLeft, translationX)
            );

            translateX.setValue(clampedTranslation);
        },
        [activeIndex, tabs.length, translateX]
    );

    const handleGestureStateChange = useCallback(
        (event: PanGestureHandlerGestureEvent) => {
            const { translationX, velocityX, state } = event.nativeEvent;

            if (state === State.END) {
                const isSwipeLeft = translationX < -SWIPE_THRESHOLD || velocityX < -SWIPE_VELOCITY_THRESHOLD;
                const isSwipeRight = translationX > SWIPE_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD;

                let newIndex = activeIndex;

                if (isSwipeLeft && activeIndex < tabs.length - 1) {
                    // Swiping left - go to next tab
                    newIndex = activeIndex + 1;
                } else if (isSwipeRight && activeIndex > 0) {
                    // Swiping right - go to previous tab
                    newIndex = activeIndex - 1;
                }

                // Check if the target tab is disabled
                if (newIndex !== activeIndex && disabledTabs.includes(newIndex)) {
                    // Tab is disabled, show feedback
                    if (onDisabledSwipe) {
                        onDisabledSwipe(newIndex, tabs[newIndex]);
                    }
                    // Animate back to current position
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 12,
                    }).start();
                    return;
                }

                // Animate to final position
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 12,
                }).start();

                // Change tab if needed
                if (newIndex !== activeIndex) {
                    lastActiveIndex.current = newIndex;
                    onTabChange(newIndex);
                }
            }
        },
        [activeIndex, tabs, disabledTabs, onDisabledSwipe, onTabChange, translateX]
    );

    return (
        <GestureHandlerRootView style={styles.container}>
            <PanGestureHandler
                onGestureEvent={handleGestureEvent}
                onHandlerStateChange={handleGestureStateChange}
                activeOffsetX={[-20, 20]}
                failOffsetY={[-20, 20]}
            >
                <Animated.View
                    style={[
                        styles.contentContainer,
                        {
                            transform: [{ translateX }],
                        },
                    ]}
                >
                    {children[activeIndex]}
                </Animated.View>
            </PanGestureHandler>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: "100%",
    },
    contentContainer: {
        flex: 1,
        width: "100%",
    },
});
