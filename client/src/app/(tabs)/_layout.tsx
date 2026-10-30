import { AuthBackground } from "@/components/auth/AuthBackground";
import { GlowTabBar } from "@/components/ui/GlowTabBar";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <AuthBackground>
      <Tabs
        tabBar={(props) => <GlowTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: "transparent" },
          tabBarStyle: {
            position: "absolute",
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Today" }} />
        <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
        <Tabs.Screen name="habits" options={{ title: "Habits" }} />
      </Tabs>
    </AuthBackground>
  );
}
