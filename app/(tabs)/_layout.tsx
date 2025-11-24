import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { COLORS_V2, ELEVATION } from '../../constants/designSystem';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS_V2.primary[600],
        tabBarInactiveTintColor: COLORS_V2.text.tertiary,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : COLORS_V2.surface.base,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          ...ELEVATION.xl,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={95}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : null
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={26}
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* Tasks Tab */}
      <Tabs.Screen
        name="tasks/index"
        options={{
          title: 'Tasks',
          href: '/tasks',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? 'checkbox' : 'checkbox-outline'}
                size={26}
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* Courses Tab */}
      <Tabs.Screen
        name="courses/index"
        options={{
          title: 'Courses',
          href: '/courses',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? 'book' : 'book-outline'}
                size={26}
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* AI Chat Tab */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI Chat',
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons
                name={focused ? 'sparkles' : 'sparkles-outline'}
                size={26}
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* Hidden screens - accessible via navigation but not in tab bar */}
      <Tabs.Screen
        name="planner"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      
      <Tabs.Screen
        name="tasks/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      
      <Tabs.Screen
        name="tasks/add"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      
      <Tabs.Screen
        name="courses/add"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 44,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  iconContainerActive: {
    backgroundColor: `${COLORS_V2.primary[500]}15`,
  },
});
