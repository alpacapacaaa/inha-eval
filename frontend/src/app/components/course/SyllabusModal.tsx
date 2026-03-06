import React, { useState } from 'react';
import { X, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Course } from '../../types/types';

interface SyllabusModalProps {
    course: Course;
    onClose: () => void;
}

export function SyllabusModal({ course, onClose }: SyllabusModalProps) {
    const [expandedWeeks, setExpandedWeeks] = useState<number[]>([]);

    const toggleWeek = (week: number) => {
        setExpandedWeeks(prev =>
            prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden outline-none">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shadow-inner border border-indigo-100/50">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-[17px] font-black text-slate-900 tracking-tight leading-tight">25학년도 1학기 강의계획서</h2>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">{course.name} · {course.professor} 교수님</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="p-5 sm:p-6 overflow-y-auto w-full space-y-6 no-scrollbar">

                    {/* 강의 기본 정보 */}
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                            <span className="text-[11px] font-extrabold text-slate-400 w-20 shrink-0">강의진행방식</span>
                            <p className="text-[12px] font-medium text-slate-700 leading-relaxed">
                                이론 강의(70%)와 실습(30%)을 병행하며, 매주 배운 내용을 기반으로 미니 프로젝트를 수행합니다.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                            <span className="text-[11px] font-extrabold text-slate-400 w-20 shrink-0">수업방법</span>
                            <p className="text-[12px] font-medium text-slate-700 leading-relaxed">
                                대면 강의 원칙. 필요시 일부 특강은 Zoom을 통한 비대면 화상 강의로 진행될 수 있습니다.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                            <span className="text-[11px] font-extrabold text-red-400/80 w-20 shrink-0">수강시유의사항</span>
                            <p className="text-[12px] font-medium text-slate-700 leading-relaxed">
                                지각 3회는 결석 1회로 간주하며, 전체 수업의 1/4 이상 결석 시 성적과 무관하게 F(낙제) 처리됩니다. 기한 내 과제 미제출 시 0점 부여.
                            </p>
                        </div>
                    </div>

                    {/* 성적 비율 */}
                    <div>
                        <h3 className="text-xs border-b border-slate-100 pb-2 mb-3 font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
                            평가 기준
                        </h3>
                        <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
                            <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200/50 shadow-sm">
                                <span className="block text-[10px] text-slate-500 font-extrabold tracking-wider mb-0.5">중간고사</span>
                                <span className="text-base sm:text-lg font-black text-slate-800">40%</span>
                            </div>
                            <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200/50 shadow-sm">
                                <span className="block text-[10px] text-slate-500 font-extrabold tracking-wider mb-0.5">기말고사</span>
                                <span className="text-base sm:text-lg font-black text-slate-800">40%</span>
                            </div>
                            <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200/50 shadow-sm">
                                <span className="block text-[10px] text-slate-500 font-extrabold tracking-wider mb-0.5">과제</span>
                                <span className="text-base sm:text-lg font-black text-slate-800">10%</span>
                            </div>
                            <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200/50 shadow-sm">
                                <span className="block text-[10px] text-slate-500 font-extrabold tracking-wider mb-0.5">출석</span>
                                <span className="text-base sm:text-lg font-black text-slate-800">10%</span>
                            </div>
                        </div>
                    </div>

                    {/* 주차별 강의 계획 */}
                    <div>
                        <h3 className="text-xs border-b border-slate-100 pb-2 mb-3 font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
                            주차별 학습 계획
                        </h3>
                        <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500">
                                    <tr>
                                        <th className="py-2.5 px-3 w-14 text-center font-extrabold text-[11px]">주차</th>
                                        <th className="py-2.5 px-3 font-extrabold text-[11px]">학습 내용</th>
                                        <th className="py-2.5 px-3 w-20 text-center font-extrabold text-[11px]">비고</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[
                                        { week: 1, topic: '강의 오리엔테이션 및 교과목 개요', note: '', detail: '교과목 소개, 성적 평가 방법 안내, 수강생 목적 및 학습 수준 파악' },
                                        { week: 2, topic: '제 1장: 기본 개념 및 이론 설명', note: '', detail: '핵심 개념 정의, 역사적 배경과 실무 응용 사례를 통한 기초 확립' },
                                        { week: 3, topic: '제 2장: 심화 모델 설계 (1)', note: '개인과제', detail: '모델링 기초 이론, 사례 연구를 통한 실무 실습, 첫 번째 개인 평가 과제 부여' },
                                        { week: 4, topic: '제 2장: 심화 모델 설계 (2)', note: '', detail: '데이터 수집 및 전처리 기법, 통계적 검증 방법론 및 Q&A 진행' },
                                        { week: 5, topic: '제 3장: 아키텍처 패턴 분석', note: '', detail: '소프트웨어 아키텍처(MVC, MVVM 등) 비교 분석 및 장단점 토론' },
                                        { week: 6, topic: '제 4장: 중간고사 대비 총정리', note: '', detail: '1주차~5주차 핵심 내용 요약 복습, 기출 유형 분석 및 예상 문제 풀이' },
                                        { week: 7, topic: '중간고사 (Middle Exam)', note: '대면', detail: '지정된 강의실에서 오프라인 지필고사 진행 (객관식 20문항 + 단답형 5문항)' },
                                        { week: 8, topic: '제 5장: 네트워크 인프라 기초', note: '', detail: 'TCP/IP 모델의 7계층 이해, HTTP 프로토콜 기초 및 웹 트래픽 분석 실습' },
                                        { week: 9, topic: '제 6장: 데이터베이스 심화', note: '팀편성', detail: '정규화 이론, B-Tree 인덱싱 최적화 기법, 기말 팀 프로젝트 조 편성' },
                                        { week: 10, topic: '제 7장: 종합 실습 및 방법론', note: '팀플시작', detail: '팀별 프로젝트 주제 선정 회의, MVP(최소 기능 제품) 요구사항 명세서 작성 가이드' },
                                        { week: 15, topic: '기말고사 (Final Exam)', note: '대면', detail: '1학기 전체 범위 오프라인 시험 (서술형/논술형 위주) 및 최종 팀 프로젝트 결과물 발표' },
                                    ].map((w, i) => {
                                        const isExpanded = expandedWeeks.includes(w.week);
                                        return (
                                            <React.Fragment key={i}>
                                                <tr
                                                    onClick={() => toggleWeek(w.week)}
                                                    className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${w.week === 7 || w.week === 15 ? 'bg-amber-50/40 hover:bg-amber-50/60' : ''}`}
                                                >
                                                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{w.week}주</td>
                                                    <td className={`py-2.5 px-3 font-medium flex items-center gap-1.5 ${w.week === 7 || w.week === 15 ? 'text-amber-800 font-bold' : 'text-slate-600'}`}>
                                                        {w.topic}
                                                        <span className="ml-auto text-slate-300">
                                                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center text-[10px] font-extrabold text-indigo-500">{w.note}</td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-indigo-50/30 animate-in fade-in duration-200">
                                                        <td colSpan={3} className="px-5 py-3.5 border-t border-indigo-50/50">
                                                            <div className="flex gap-2.5 items-start">
                                                                <span className="text-indigo-400 mt-0.5 shrink-0 opacity-80 text-sm font-bold">↳</span>
                                                                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                                                                    {w.detail}
                                                                </p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
