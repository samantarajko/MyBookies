import { Tabs } from 'expo-router';
import React from 'react';
import { View, Image, ImageSourcePropType, StyleSheet } from 'react-native';
import { globalstyles } from '../styles/globals';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useTheme } from '../context/ThemeContext';

const ICONS: { [key: string]: ImageSourcePropType } = {
  shelves: require('../../assets/images/shelves.png'),
  readingcorner: require('../../assets/images/readingcorner.png'),
  quests: require('../../assets/images/quests.png'),
  profile: require('../../assets/images/profile.png'),
};

function TabIcon({ source, focused }: { source: ImageSourcePropType; focused: boolean }) {
  return (
    <View style={focused ? styles.activeContainer : styles.iconContainer}>
      <Image
        source={source}
        resizeMode="contain"
        style={{
          width: 42,
          height: 42,
          tintColor: '#111',
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { buttonColor } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <Image
        source={require('../../assets/images/Line.png')}
        style={globalstyles.lineAboveHotbar}
        resizeMode="contain"
      />
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: [{ backgroundColor: buttonColor }, globalstyles.hotbar],
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon source={ICONS.shelves} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="pdfs"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon source={ICONS.readingcorner} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="challenges"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon source={ICONS.quests} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => <TabIcon source={ICONS.profile} focused={focused} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 65,
    height: 65,
    borderRadius: 18,
    marginTop: 16,
  },
  activeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(50,50,50,0.35)',
    marginTop: 16,
  },
});
