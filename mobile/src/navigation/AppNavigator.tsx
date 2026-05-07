import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { CourseCollectionScreen } from '../screens/CourseCollectionScreen';
import { CourseDetailScreen } from '../screens/CourseDetailScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MyPageScreen } from '../screens/MyPageScreen';
import { ReviewWriteScreen } from '../screens/ReviewWriteScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { TimetableScreen } from '../screens/TimetableScreen';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { AppRoute } from '../types/navigation';

const TAB_ROUTES = ['Home', 'Search', 'Timetable', 'MyPage'] as const;

export interface AppNavigation {
  currentRoute: AppRoute;
  goBack: () => void;
  navigate: (route: AppRoute) => void;
  replace: (route: AppRoute) => void;
  switchTab: (routeName: typeof TAB_ROUTES[number]) => void;
  onTabScroll: (offsetY: number) => void;
  setTabBarSuppressed: (suppressed: boolean) => void;
}

export function AppNavigator() {
  const { isHydrating } = useAuth();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<AppRoute[]>([{ name: 'Home' }]);
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isTabBarVisible = useRef(true);
  const [isTabBarSuppressed, setIsTabBarSuppressed] = useState(false);

  const currentRoute = history[history.length - 1];
  const isTabRoute = TAB_ROUTES.includes(currentRoute.name as (typeof TAB_ROUTES)[number]);

  const animateTabBar = (visible: boolean) => {
    if (isTabBarVisible.current === visible) {
      return;
    }

    isTabBarVisible.current = visible;
    Animated.spring(tabBarTranslateY, {
      toValue: visible ? 0 : 118,
      useNativeDriver: true,
      damping: 20,
      stiffness: 180,
      mass: 0.9,
    }).start();
  };

  const navigation = useMemo<AppNavigation>(
    () => ({
      currentRoute,
      navigate: (route) => {
        setIsTabBarSuppressed(false);
        setHistory((prev) => [...prev, route]);
      },
      replace: (route) => {
        setIsTabBarSuppressed(false);
        setHistory((prev) => [...prev.slice(0, -1), route]);
      },
      switchTab: (routeName) => {
        lastScrollY.current = 0;
        setIsTabBarSuppressed(false);
        animateTabBar(true);
        setHistory([{ name: routeName } as AppRoute]);
      },
      goBack: () => {
        setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
      },
      onTabScroll: (offsetY: number) => {
        if (!isTabRoute) {
          return;
        }

        if (offsetY <= 12) {
          lastScrollY.current = offsetY;
          animateTabBar(true);
          return;
        }

        const delta = offsetY - lastScrollY.current;
        if (delta > 8) {
          animateTabBar(false);
        } else if (delta < -8) {
          animateTabBar(true);
        }

        lastScrollY.current = offsetY;
      },
      setTabBarSuppressed: setIsTabBarSuppressed,
    }),
    [currentRoute, isTabRoute, tabBarTranslateY],
  );

  if (isHydrating) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>로그인 상태를 확인하는 중입니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.content}>
        {renderRoute(currentRoute, navigation)}
      </View>

      {isTabRoute && !isTabBarSuppressed ? (
        <Animated.View
          style={[
            styles.tabBarShell,
            {
              transform: [{ translateY: tabBarTranslateY }],
            },
          ]}
        >
          <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            {TAB_ROUTES.map((tabName) => {
              const isActive = currentRoute.name === tabName;

              return (
                <Pressable
                  key={tabName}
                  style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}
                  onPress={() => navigation.switchTab(tabName)}
                >
                  <View style={[styles.tabIconWrap, isActive ? styles.tabIconWrapActive : null]}>
                    <TabIcon routeName={tabName} isActive={isActive} />
                  </View>
                  <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                    {getTabLabel(tabName)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function renderRoute(route: AppRoute, navigation: AppNavigation) {
  switch (route.name) {
    case 'Home':
      return <HomeScreen navigation={navigation} />;
    case 'Login':
      return <LoginScreen navigation={navigation} />;
    case 'Search':
      return <SearchScreen navigation={navigation} route={route} />;
    case 'Timetable':
      return <TimetableScreen navigation={navigation} />;
    case 'CourseCollection':
      return <CourseCollectionScreen navigation={navigation} route={route} />;
    case 'CourseDetail':
      return <CourseDetailScreen navigation={navigation} route={route} />;
    case 'ReviewWrite':
      return <ReviewWriteScreen navigation={navigation} route={route} />;
    case 'MyPage':
      return <MyPageScreen navigation={navigation} />;
    default:
      return null;
  }
}

function getTabLabel(routeName: (typeof TAB_ROUTES)[number]) {
  switch (routeName) {
    case 'Home':
      return '홈';
    case 'Search':
      return '탐색';
    case 'Timetable':
      return '시간표';
    case 'MyPage':
      return '내 정보';
    default:
      return routeName;
  }
}

function TabIcon({
  routeName,
  isActive,
}: {
  routeName: (typeof TAB_ROUTES)[number];
  isActive: boolean;
}) {
  const tintStyle = isActive ? styles.iconTintActive : styles.iconTintInactive;

  switch (routeName) {
    case 'Home':
      return (
        <View style={styles.iconFrame}>
          <View style={[styles.homeRoofLeft, tintStyle]} />
          <View style={[styles.homeRoofRight, tintStyle]} />
          <View style={[styles.homeBody, tintStyle]} />
        </View>
      );
    case 'Search':
      return (
        <View style={styles.iconFrame}>
          <View style={[styles.searchCircle, tintStyle]} />
          <View style={[styles.searchHandle, tintStyle]} />
        </View>
      );
    case 'Timetable':
      return (
        <View style={styles.iconFrame}>
          <View style={[styles.bagBody, tintStyle]} />
          <View style={[styles.bagHandle, isActive ? styles.bagHandleActive : styles.bagHandleInactive]} />
        </View>
      );
    case 'MyPage':
      return (
        <View style={styles.iconFrame}>
          <View style={[styles.profileHead, tintStyle]} />
          <View style={[styles.profileBody, tintStyle]} />
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBarShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: 'transparent',
    zIndex: 30,
    elevation: 30,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: 'rgba(255,255,255,0.68)',
    paddingHorizontal: spacing.page,
    paddingTop: 7,
    gap: spacing.related,
    shadowColor: '#16499a',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 14,
    marginBottom: 0,
  },
  tabButton: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 2,
    paddingHorizontal: spacing.tight,
    alignItems: 'center',
    gap: 3,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    shadowColor: colors.primary,
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  tabIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: 'rgba(22,73,154,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  iconFrame: {
    width: 20,
    height: 20,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTintInactive: {
    borderColor: '#7f92a9',
    backgroundColor: '#7f92a9',
  },
  iconTintActive: {
    borderColor: colors.primaryDeep,
    backgroundColor: colors.primaryDeep,
  },
  homeRoofLeft: {
    position: 'absolute',
    width: 7,
    height: 2,
    top: 5,
    left: 4,
    borderRadius: 99,
    transform: [{ rotate: '-38deg' }],
  },
  homeRoofRight: {
    position: 'absolute',
    width: 7,
    height: 2,
    top: 5,
    right: 4,
    borderRadius: 99,
    transform: [{ rotate: '38deg' }],
  },
  homeBody: {
    position: 'absolute',
    width: 10,
    height: 8,
    bottom: 3,
    borderRadius: 3,
  },
  searchCircle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
    top: 3,
    left: 3,
    backgroundColor: 'transparent',
  },
  searchHandle: {
    position: 'absolute',
    width: 7,
    height: 2,
    borderRadius: 99,
    right: 2,
    bottom: 4,
    transform: [{ rotate: '45deg' }],
  },
  bagBody: {
    position: 'absolute',
    width: 14,
    height: 12,
    bottom: 3,
    borderRadius: 4,
  },
  bagHandle: {
    position: 'absolute',
    width: 10,
    height: 7,
    top: 2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: 'transparent',
  },
  bagHandleInactive: {
    borderColor: '#7f92a9',
  },
  bagHandleActive: {
    borderColor: colors.primaryDeep,
  },
  profileHead: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 999,
    top: 2,
  },
  profileBody: {
    position: 'absolute',
    width: 14,
    height: 8,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    bottom: 3,
  },
  loadingSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
