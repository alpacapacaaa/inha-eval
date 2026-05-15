export type AppRoute =
  | { name: 'Home' }
  | { name: 'Login' }
  | { name: 'Search'; initialQuery?: string }
  | { name: 'Timetable' }
  | { name: 'CourseCollection'; courseId: number }
  | { name: 'CourseDetail'; courseId: number }
  | { name: 'ReviewWrite'; courseId: number }
  | { name: 'MyPage' }
  | { name: 'TimetableFull' }
  | { name: 'CartFull' }
  | { name: 'Notifications' }
  | { name: 'Settings'; section?: 'account' | 'privacy' | 'app' }
  | { name: 'Inquiry' }
  | { name: 'PointHistory' };

export type AppRouteName = AppRoute['name'];
