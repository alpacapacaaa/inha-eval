export type TimetableDay = '월' | '화' | '수' | '목' | '금';

export type TimetableSlot = {
  day: TimetableDay;
  startPeriod: number;
  endPeriod: number;
  location: string;
};

export const TIMETABLE_DAYS: TimetableDay[] = ['월', '화', '수', '목', '금'];

const PERIOD_START_HOUR = 9;
const PERIOD_MINUTE_STEP = 30;

const padTime = (value: number) => String(value).padStart(2, '0');

export const getPeriodStartMinutes = (period: number) =>
  PERIOD_START_HOUR * 60 + (period - 1) * PERIOD_MINUTE_STEP;

export const formatMinutesAsTime = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${padTime(hours)}:${padTime(minutes)}`;
};

export const formatPeriodTime = (period: number) =>
  formatMinutesAsTime(getPeriodStartMinutes(period));

export const formatPeriodRange = (startPeriod: number, endPeriod: number) => {
  const start = getPeriodStartMinutes(startPeriod);
  const end = getPeriodStartMinutes(endPeriod) + PERIOD_MINUTE_STEP;
  return `${formatMinutesAsTime(start)}-${formatMinutesAsTime(end)}`;
};

export const PERIODS = Array.from({ length: 28 }, (_, index) => {
  const period = index + 1;
  return { period, label: `${period}교시`, time: formatPeriodTime(period) };
});

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
