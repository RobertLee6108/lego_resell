"use client";
import { BoxViewport } from "@/components/box-studio/scene";
import { useStudio } from "@/components/box-studio/store";
import { FACE_META } from "@/components/box-studio/types";
import { Box, Globe, Rotate3d, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { ROTATE_SNAP_OPTIONS } from "@/components/box-studio/rotation";

/** 타이핑 중인 입력 요소인지 확인 (단축키 오작동 방지) */
function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * 3D 뷰포트 컴포넌트
 * Three.js 씬을 마운트하고 캔버스 오버레이(현재 선택 면, 박스 치수, 조작 안내, 포지션 초기화 버튼)를 렌더링합니다.
 */
export function Viewport() {
  /** 3D 캔버스가 부착될 DOM 엘리먼트 참조 */
  const hostRef = useRef<HTMLDivElement>(null);

  // 스튜디오 전역 상태 구독
  const transparent = useStudio((state) => state.background === "transparent");
  const selected = useStudio((state) => state.selected);
  const width = useStudio((state) => state.width);
  const depth = useStudio((state) => state.depth);
  const height = useStudio((state) => state.height);
  const projection = useStudio((state) => state.projection);
  const setProjection = useStudio((state) => state.setProjection);
  const resetBoxPosition = useStudio((state) => state.resetBoxPosition);
  const flash = useStudio((state) => state.flash);
  const rotateGizmo = useStudio((state) => state.rotateGizmo);
  const rotateSpace = useStudio((state) => state.rotateSpace);
  const rotateSnap = useStudio((state) => state.rotateSnap);
  const setRotateGizmo = useStudio((state) => state.setRotateGizmo);
  const setRotateSpace = useStudio((state) => state.setRotateSpace);
  const setRotateSnap = useStudio((state) => state.setRotateSnap);

  /** E 키로 회전 기즈모(Unity Rotate 도구) 토글 */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "e") return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (isTypingTarget(event.target)) return;
      const next = !useStudio.getState().rotateGizmo;
      useStudio.getState().setRotateGizmo(next);
      useStudio.getState().flash(next ? "회전 기즈모를 켰습니다 (E)" : "회전 기즈모를 껐습니다 (E)");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /**
   * 컴포넌트 마운트 시 Three.js 뷰포트 인스턴스를 생성하고,
   * 언마운트 시 리소스를 정리(dispose)합니다.
   */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new BoxViewport(host);
    return () => view.dispose();
  }, []);

  return (
    <div className="absolute inset-0">
      {/* 3D 렌더러 호스트 컨테이너 (투명 배경일 경우 체커보드 패턴 적용) */}
      <div ref={hostRef} className={transparent ? "checker absolute inset-0" : "absolute inset-0 bg-stage"} />

      {/* 좌상단: 현재 선택된 면 표시 */}
      <p className="pointer-events-none absolute top-3 left-3 rounded-sm bg-bg/80 px-2 py-1 text-xs text-fg">
        {FACE_META[selected].label}면
      </p>

      {/* 우상단: 상자 규격(가로 x 세로 x 높이 mm) 표시 */}
      <p className="pointer-events-none absolute top-3 right-3 rounded-sm bg-bg/80 px-2 py-1 text-xs tabular-nums text-muted">
        {width} × {depth} × {height} mm
      </p>

      {/* 하단 바: 조작 도움말 및 퀵 버튼들 */}
      <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <p className="hidden md:block text-xs text-muted truncate">
          {rotateGizmo ? "링 드래그 회전 · Shift 스냅 · E 끄기" : "드래그 회전 · 휠/핀치 확대 · 우클릭 이동 · E 기즈모"}
        </p>
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 ml-auto">
          {rotateGizmo && (
            <>
              <button
                type="button"
                onClick={() => setRotateSpace(rotateSpace === "local" ? "world" : "local")}
                className="flex items-center gap-1.5 rounded-sm bg-bg/90 px-2.5 py-1.5 text-xs text-fg hover:bg-bg transition-colors border border-border shadow-xs backdrop-blur-xs cursor-pointer"
                title="기즈모 좌표계 전환 (Local / Global)"
              >
                <Globe className="size-3.5" aria-hidden="true" />
                <span>{rotateSpace === "local" ? "Local" : "Global"}</span>
              </button>
              <label className="flex items-center gap-1.5 rounded-sm bg-bg/90 px-2.5 py-1.5 text-xs text-fg border border-border shadow-xs backdrop-blur-xs">
                <span>스냅</span>
                <select
                  value={rotateSnap}
                  onChange={(event) => setRotateSnap(Number(event.target.value))}
                  className="bg-transparent text-xs outline-none cursor-pointer"
                  aria-label="회전 스냅 각도"
                >
                  {ROTATE_SNAP_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-bg text-fg">
                      {option === 0 ? "끔" : `${option}°`}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <button
            type="button"
            aria-pressed={rotateGizmo}
            onClick={() => setRotateGizmo(!rotateGizmo)}
            className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs transition-colors border border-border shadow-xs backdrop-blur-xs cursor-pointer ${
              rotateGizmo ? "bg-fg text-bg" : "bg-bg/90 text-fg hover:bg-bg"
            }`}
            title="회전 기즈모 (Unity Rotate 도구) · 단축키 E"
          >
            <Rotate3d className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">회전 기즈모</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const next = projection === "orthographic" ? "perspective" : "orthographic";
              setProjection(next);
              flash(
                next === "orthographic"
                  ? "직교 투영(Orthographic) 모드로 전환했습니다"
                  : "원근 투영(Perspective) 모드로 전환했습니다",
              );
            }}
            className="flex items-center gap-1.5 rounded-sm bg-bg/90 px-2.5 py-1.5 text-xs text-fg hover:bg-bg transition-colors border border-border shadow-xs backdrop-blur-xs cursor-pointer"
            title="원근 투영과 직교 투영 모드 전환"
          >
            <Box className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{projection === "orthographic" ? "직교투영" : "원근투영"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              resetBoxPosition();
              flash("상자 포지션을 초기화했습니다");
            }}
            className="flex items-center gap-1.5 rounded-sm bg-bg/90 px-2.5 py-1.5 text-xs text-fg hover:bg-bg transition-colors border border-border shadow-xs backdrop-blur-xs cursor-pointer"
            title="상자 포지션 및 회전/줌 초기화"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">포지션 초기화</span>
          </button>
        </div>
      </div>
    </div>
  );
}
