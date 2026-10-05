# 구글 캘린더 스타일 개편 Implementation Plan

> **For agentic workers:** superpowers:executing-plans (inline). 이 계획은 `2026-10-05-daily-garden.md`의 UI 부분(Task 6~10)을 대체한다.

**Goal:** 월/주/일 뷰, 미니 달력, 드래그 일정 편집, 할 일·가계부 패널을 갖춘 구글 캘린더 스타일 앱.
**Spec:** `docs/superpowers/specs/2026-10-05-daily-garden-design.md`
**Tech Stack:** Vite, React, TypeScript, Astryx(neutral), Vitest

## Global Constraints
- 반복/종일/캘린더 색상/알림 없음. 일정 겹침 허용.
- 터치에서는 드래그 비활성(탭으로 생성/수정). 마우스·펜만 드래그.
- 색은 Astryx 토큰(`var(--color-*)`)만 사용, 하드코딩 hex 금지.
- 커밋 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus
- 겹침 배치: 맞닿는 일정(9-10, 10-11)은 별도 묶음, 연쇄 겹침은 한 묶음 → Task 1 테스트
- 드래그 경계: 0시 위, 23:59 아래로 끌어도 범위 안, 최소 15분 → Task 1 테스트
- 주 경계: 월/연 넘어가는 주, weekStartsOn → Task 1 테스트
- 기존 저장 데이터가 겹침 금지 시절 데이터여도 정상 표시 → 화면 확인
- 패널의 날짜가 뷰 이동과 항상 일치 → 화면 확인

## Tasks
1. **timegrid 로직 + 스토어 규칙 변경** (TDD): `lib/timegrid.ts`, 겹침 허용으로 `dataStore.ts`/테스트 수정, 불필요해진 `lib/summary.ts` 삭제
2. **할 일·가계부를 date prop 기반 패널로 정리**, `EventDialog`(날짜 수정 포함)
3. **TimeGrid(주/일)**: 열/헤더/현재 시각선/생성·이동·리사이즈
4. **MonthView**: 칸당 3개 + "+n개"
5. **App 셸**: 상단 바, 미니 달력 사이드바, 오른쪽 패널(좁은 화면은 BottomSheet)
6. **확인**: tsc, 테스트, 빌드, 폰/PC 폭 스크린샷
