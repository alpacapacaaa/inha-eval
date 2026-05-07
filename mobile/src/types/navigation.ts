export type AppRoute =
  | { name: 'Home' }
  | { name: 'Login' }
  | { name: 'Search'; initialQuery?: string }
  | { name: 'Timetable' }
  | { name: 'CourseCollection'; courseId: number }
  | { name: 'CourseDetail'; courseId: number }
  | { name: 'ReviewWrite'; courseId: number }
  | { name: 'MyPage' };

export type AppRouteName = AppRoute['name'];
