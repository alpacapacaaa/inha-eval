import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { CourseCollectionScreen } from '../screens/CourseCollectionScreen';
import { CourseDetailScreen } from '../screens/CourseDetailScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MyPageScreen } from '../screens/MyPageScreen';
import { ReviewWriteScreen } from '../screens/ReviewWriteScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { CartFullScreen } from '../screens/CartFullScreen';
import { InquiryScreen } from '../screens/InquiryScreen';
import { PointHistoryScreen } from '../screens/PointHistoryScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TimetableFullScreen } from '../screens/TimetableFullScreen';
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
  const { isAuthenticated, isHydrating } = useAuth();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<AppRoute[]>([{ name: 'Login' }]);
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isTabBarVisible = useRef(true);
  const didResolveInitialAuth = useRef(false);
  const [isTabBarSuppressed, setIsTabBarSuppressed] = useState(false);

  const currentRoute = history[history.length - 1];
  const isTabRoute = TAB_ROUTES.includes(currentRoute.name as (typeof TAB_ROUTES)[number]);

  useEffect(() => {
    if (!isHydrating && !didResolveInitialAuth.current) {
      didResolveInitialAuth.current = true;

      if (isAuthenticated && currentRoute.name === 'Login') {
        setHistory([{ name: 'Home' }]);
      }
    }
  }, [currentRoute.name, isAuthenticated, isHydrating]);

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
                <PressableScale
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
                </PressableScale>
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
    case 'TimetableFull':
      return <TimetableFullScreen navigation={navigation} />;
    case 'CartFull':
      return <CartFullScreen navigation={navigation} />;
    case 'Notifications':
      return <NotificationsScreen navigation={navigation} />;
    case 'Settings':
      return <SettingsScreen navigation={navigation} route={route} />;
    case 'Inquiry':
      return <InquiryScreen navigation={navigation} />;
    case 'PointHistory':
      return <PointHistoryScreen navigation={navigation} />;
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
          <View style={[styles.calBody, tintStyle]} />
          <View style={[styles.calTopBar, tintStyle]} />
          <View style={[styles.calGridDotA, tintStyle]} />
          <View style={[styles.calGridDotB, tintStyle]} />
          <View style={[styles.calGridDotC, tintStyle]} />
          <View style={[styles.calGridDotD, tintStyle]} />
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
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 7,
    gap: 4,
    elevation: 0,
    marginBottom: 0,
  },
  tabButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: spacing.tight,
    alignItems: 'center',
    gap: 3,
  },
  tabButtonActive: {},
  tabIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {},
  tabLabel: {
    color: '#9AA5B5',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  iconFrame: {
    width: 20,
    height: 20,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTintInactive: {
    borderColor: '#9AA5B5',
    backgroundColor: '#9AA5B5',
  },
  iconTintActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
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
  calBody: {
    position: 'absolute',
    width: 16,
    height: 13,
    bottom: 2,
    borderRadius: 3,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  calTopBar: {
    position: 'absolute',
    width: 16,
    height: 4,
    top: 3,
    borderRadius: 2,
  },
  calGridDotA: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1,
    left: 5,
    bottom: 8,
  },
  calGridDotB: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1,
    right: 5,
    bottom: 8,
  },
  calGridDotC: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1,
    left: 5,
    bottom: 4,
  },
  calGridDotD: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1,
    right: 5,
    bottom: 4,
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
