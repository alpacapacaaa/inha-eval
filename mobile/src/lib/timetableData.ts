export type TimetableDay = '월' | '화' | '수' | '목' | '금';

export type TimetableSlot = {
  day: TimetableDay;
  startPeriod: number;
  endPeriod: number;
  location: string;
};

export const TIMETABLE_DAYS: TimetableDay[] = ['월', '화', '수', '목', '금'];

export const PERIODS = [
  { period: 1, label: '1교시', time: '09:00' },
  { period: 2, label: '2교시', time: '10:00' },
  { period: 3, label: '3교시', time: '11:00' },
  { period: 4, label: '4교시', time: '12:00' },
  { period: 5, label: '5교시', time: '13:00' },
  { period: 6, label: '6교시', time: '14:00' },
  { period: 7, label: '7교시', time: '15:00' },
  { period: 8, label: '8교시', time: '16:00' },
  { period: 9, label: '9교시', time: '17:00' },
  { period: 10, label: '10교시', time: '18:00' },
  { period: 11, label: '11교시', time: '19:00' },
  { period: 12, label: '12교시', time: '20:00' },
  { period: 13, label: '13교시', time: '21:00' },
  { period: 14, label: '14교시', time: '22:00' },
];

export const TIMETABLE_BY_COURSE_ID: Record<string, TimetableSlot[]> = {
  '1': [
    { day: '월', startPeriod: 2, endPeriod: 3, location: '5호관 301' },
    { day: '수', startPeriod: 2, endPeriod: 3, location: '5호관 301' },
  ],
  '2': [
    { day: '월', startPeriod: 8, endPeriod: 9, location: '정보통신관 402' },
    { day: '수', startPeriod: 8, endPeriod: 9, location: '정보통신관 402' },
  ],
  '3': [
    { day: '화', startPeriod: 4, endPeriod: 5, location: '2호관 201' },
    { day: '목', startPeriod: 4, endPeriod: 5, location: '2호관 201' },
  ],
  '4': [
    { day: '화', startPeriod: 9, endPeriod: 10, location: '하이테크 401' },
    { day: '목', startPeriod: 9, endPeriod: 10, location: '하이테크 401' },
  ],
  '5': [
    { day: '월', startPeriod: 11, endPeriod: 12, location: '정보통신관 301' },
    { day: '수', startPeriod: 11, endPeriod: 12, location: '정보통신관 301' },
  ],
  '6': [
    { day: '월', startPeriod: 5, endPeriod: 6, location: '정보전산원 101' },
    { day: '수', startPeriod: 5, endPeriod: 6, location: '정보전산원 101' },
  ],
  '7': [
    { day: '월', startPeriod: 2, endPeriod: 3, location: '6호관 201' },
    { day: '수', startPeriod: 2, endPeriod: 3, location: '6호관 201' },
  ],
  '8': [
    { day: '화', startPeriod: 2, endPeriod: 3, location: '4호관 402' },
    { day: '목', startPeriod: 2, endPeriod: 3, location: '4호관 402' },
  ],
  '9': [
    { day: '화', startPeriod: 6, endPeriod: 7, location: '2호관 204' },
    { day: '목', startPeriod: 6, endPeriod: 7, location: '2호관 204' },
  ],
  '101': [
    { day: '월', startPeriod: 1, endPeriod: 2, location: '하이테크 103' },
    { day: '수', startPeriod: 1, endPeriod: 2, location: '하이테크 103' },
  ],
  '201': [{ day: '화', startPeriod: 1, endPeriod: 2, location: '인문관 208' }],
  '202': [{ day: '금', startPeriod: 2, endPeriod: 4, location: '인문관 110' }],
  '203': [{ day: '수', startPeriod: 4, endPeriod: 5, location: '5호관 102' }],
  '204': [{ day: '목', startPeriod: 11, endPeriod: 12, location: '법학관 204' }],
  '205': [{ day: '금', startPeriod: 5, endPeriod: 6, location: '서호관 118' }],
  '206': [{ day: '금', startPeriod: 6, endPeriod: 8, location: '60주년기념관 209' }],
  '301': [{ day: '화', startPeriod: 7, endPeriod: 8, location: '인문관 203' }],
  '302': [{ day: '금', startPeriod: 12, endPeriod: 14, location: '60주년기념관 318' }],
  '303': [
    { day: '월', startPeriod: 3, endPeriod: 4, location: '정보전산원 404' },
    { day: '수', startPeriod: 3, endPeriod: 4, location: '정보전산원 404' },
  ],
  '304': [{ day: '화', startPeriod: 10, endPeriod: 12, location: '하이테크 209' }],
  '305': [{ day: '목', startPeriod: 5, endPeriod: 7, location: '5호관 410' }],
  '306': [
    { day: '월', startPeriod: 13, endPeriod: 14, location: '서호관 307' },
    { day: '수', startPeriod: 13, endPeriod: 14, location: '서호관 307' },
  ],
};

export const TIMETABLE_STARTER_CART_IDS = [
  '101',
  '1',
  '8',
  '3',
  '4',
  '5',
  '201',
  '202',
  '203',
  '204',
  '205',
  '206',
  '303',
  '304',
  '305',
  '306',
];

export const TIMETABLE_STARTER_SELECTED_IDS = ['101', '201', '303', '3', '202', '205', '4'];
