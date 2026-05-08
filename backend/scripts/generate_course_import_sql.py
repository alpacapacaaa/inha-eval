#!/usr/bin/env python3
"""
Generate a one-off SQL import script for the current `courses` and `course_slots` table schema.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


GED_AREA_MAP = {
    '1': '핵심교양-1.인간, 가치, 공존',
    '2': '핵심교양-2.역사, 사상, 문화',
    '3': '핵심교양-3.문학, 예술, 상징',
    '4': '핵심교양-4.사회, 제도, 세계',
    '5': '핵심교양-5.자연, 생명, 환경',
    '6': '핵심교양-6.수리, 정보, 기술',
}

GEE_AREA_MAP = {
    '1': '일반교양-1.인문 · 예술',
    '2': '일반교양-2. 사회 · 자연',
    '3': '일반교양-3.소통 · 실천',
    '4': '일반교양-4.창의 · 도전',
    '5': '일반교양-5.실용 · 진로',
    '6': '일반교양-6.생활 · 건강',
    '7': '일반교양-7.SW·AI',
}


def map_general_area(course_id: str) -> str:
    prefix = course_id.split('-')[0]
    if len(prefix) >= 4:
        code_type = prefix[:3]
        area_num = prefix[3]
        if code_type == 'GED':
            return GED_AREA_MAP.get(area_num, '')
        if code_type == 'GEE':
            return GEE_AREA_MAP.get(area_num, '')
    return ''


@dataclass(frozen=True)
class CourseRow:
    name: str
    professor: str
    department: str
    category: str
    type: str
    credits: int
    section: str
    semester: str
    general_area: str = ''
    evaluation_type: str = ''
    rating: float = 0.0
    review_count: int = 0


@dataclass
class CourseSlotRow:
    course_index: int
    day: str
    start_period: int
    end_period: int
    location: str


def normalize_department(raw: str) -> str:
    raw = (raw or "").strip()
    if " / " in raw:
        return raw.split(" / ", 1)[0].strip()
    return raw


def normalize_category(raw_type: str) -> str:
    raw_type = (raw_type or "").strip()
    return "전공" if raw_type.startswith("전공") else "교양"


def normalize_credits(raw_credit: str) -> int:
    raw_credit = (raw_credit or "0").strip()
    return int(float(raw_credit))


def normalize_section(raw_id: str) -> str:
    raw_id = (raw_id or "").strip()
    if "-" not in raw_id:
        return "001"
    suffix = raw_id.rsplit("-", 1)[-1].strip()
    return suffix or "001"


def parse_time_location(time_location: str, course_index: int) -> list[CourseSlotRow]:
    """
    예시:
      "월4,5,6,수4,5,6(5동102)"              → 월 4~6교시, 수 4~6교시, 강의실 5동102
      "셀0(웹강의) /화9,10,11,12(60주년-229)" → 웹강의 슬롯 + 화 9~12교시
      "셀0(웹강의)"                           → 웹강의 슬롯만
    """
    slots = []

    parts = [p.strip() for p in time_location.split("/")]

    for part in parts:
        location_match = re.search(r'\(([^)]+)\)$', part)
        location = location_match.group(1).strip() if location_match else ""

        # 웹강의는 location에 "셀0(웹강의)"로 저장
        if location == "웹강의" or part.startswith("셀"):
            slots.append(CourseSlotRow(
                course_index=course_index,
                day="웹강의",
                start_period=0,
                end_period=0,
                location="셀0(웹강의)",
            ))
            continue

        schedule_str = re.sub(r'\([^)]*\)', '', part).strip()

        day_pattern = re.compile(r'([월화수목금토일])(\d[\d,]*)')
        matches = day_pattern.findall(schedule_str)

        for day, periods_str in matches:
            periods = [int(p) for p in periods_str.split(",") if p.strip().isdigit()]
            if not periods:
                continue
            slots.append(CourseSlotRow(
                course_index=course_index,
                day=day,
                start_period=min(periods),
                end_period=max(periods),
                location=location,
            ))

    return slots


def map_row(item: dict, semester: str) -> CourseRow:
    course_id = (item.get("id") or "").strip()
    return CourseRow(
        name=(item.get("name") or "").strip(),
        professor=(item.get("professor") or "").strip(),
        department=normalize_department(item.get("dept") or ""),
        category=normalize_category(item.get("type") or ""),
        type=(item.get("type") or "").strip(),
        credits=normalize_credits(item.get("credit") or "0"),
        section=normalize_section(course_id),
        semester=semester,
        general_area=map_general_area(course_id),
        evaluation_type=(item.get("evaluation_type") or "").strip(),
    )


def dedupe_rows(rows: Iterable[CourseRow]) -> list[CourseRow]:
    seen: set[CourseRow] = set()
    deduped: list[CourseRow] = []
    for row in rows:
        if not row.name or not row.professor or not row.department:
            continue
        if row in seen:
            continue
        seen.add(row)
        deduped.append(row)
    return deduped


def sql_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "''")


def row_to_sql_tuple(row: CourseRow) -> str:
    general_area_val = f"'{sql_escape(row.general_area)}'" if row.general_area else "NULL"
    evaluation_type_val = f"'{sql_escape(row.evaluation_type)}'" if row.evaluation_type else "NULL"
    return (
        f"('{sql_escape(row.name)}', "
        f"'{sql_escape(row.professor)}', "
        f"'{sql_escape(row.department)}', "
        f"'{sql_escape(row.category)}', "
        f"'{sql_escape(row.type)}', "
        f"{row.credits}, "
        f"'{sql_escape(row.section)}', "
        f"'{sql_escape(row.semester)}', "
        f"{general_area_val}, "
        f"{evaluation_type_val}, "
        f"{row.rating:.1f}, "
        f"{row.review_count})"
    )


def build_sql(rows: list[CourseRow], slots_by_index: dict[int, list[CourseSlotRow]], source_path: Path, semester: str) -> str:
    lines = [
        "-- Generated by backend/scripts/generate_course_import_sql.py",
        f"-- Source: {source_path}",
        f"-- Semester: {semester}",
        f"-- Row count after dedupe: {len(rows)}",
        "SET NAMES utf8mb4;",
        "START TRANSACTION;",
        "DELETE FROM course_slots;",
        "DELETE FROM courses;",
        "ALTER TABLE courses AUTO_INCREMENT = 1;",
        "ALTER TABLE course_slots AUTO_INCREMENT = 1;",
    ]

    batch_size = 500

    for start in range(0, len(rows), batch_size):
        batch = rows[start: start + batch_size]
        values = ",\n  ".join(row_to_sql_tuple(row) for row in batch)
        lines.append(
            "INSERT INTO courses "
            "(name, professor, department, category, type, credits, section, semester, general_area, evaluation_type, rating, review_count)\n"
            "VALUES\n"
            f"  {values};"
        )

    all_slots = []
    for idx, slot_list in slots_by_index.items():
        course_id = idx + 1  # AUTO_INCREMENT=1 리셋 기준 1-based
        for slot in slot_list:
            all_slots.append(
                f"({course_id}, "
                f"'{sql_escape(slot.day)}', "
                f"{slot.start_period}, "
                f"{slot.end_period}, "
                f"'{sql_escape(slot.location)}')"
            )

    if all_slots:
        for start in range(0, len(all_slots), batch_size):
            batch = all_slots[start: start + batch_size]
            values = ",\n  ".join(batch)
            lines.append(
                "INSERT INTO course_slots (course_id, day, start_period, end_period, location)\n"
                "VALUES\n"
                f"  {values};"
            )

    lines.extend(["COMMIT;", ""])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate SQL to import crawler course JSON into the current courses table."
    )
    parser.add_argument(
        "--source",
        default="crawler/data/courses.json",
        help="Path to crawler JSON file (default: crawler/data/courses.json)",
    )
    parser.add_argument(
        "--semester",
        required=True,
        help='Semester label to store in DB, e.g. "26-1"',
    )
    parser.add_argument(
        "--output",
        default="backend/sql/import_courses.sql",
        help="Output SQL path (default: backend/sql/import_courses.sql)",
    )
    args = parser.parse_args()

    source_path = Path(args.source)
    output_path = Path(args.output)

    with source_path.open(encoding="utf-8") as f:
        raw_data = json.load(f)

    mapped_rows = [map_row(item, args.semester) for item in raw_data]
    rows = dedupe_rows(mapped_rows)

    row_to_index = {row: idx for idx, row in enumerate(rows)}

    slots_by_index: dict[int, list[CourseSlotRow]] = {}
    for item in raw_data:
        row = map_row(item, args.semester)
        if row not in row_to_index:
            continue
        idx = row_to_index[row]
        if idx in slots_by_index:
            continue
        time_location = (item.get("time_location") or "").strip()
        slots_by_index[idx] = parse_time_location(time_location, idx) if time_location else []

    sql = build_sql(rows, slots_by_index, source_path, args.semester)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(sql, encoding="utf-8")

    total_slots = sum(len(v) for v in slots_by_index.values())
    print(f"Generated SQL: {output_path}")
    print(f"Input rows: {len(raw_data)}")
    print(f"Imported rows after dedupe: {len(rows)}")
    print(f"Total course_slots: {total_slots}")


if __name__ == "__main__":
    main()
