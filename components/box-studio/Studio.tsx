"use client";
import { useEffect } from "react";
import { ingestImage } from "@/components/box-studio/images";
import { Panel } from "@/components/box-studio/Panel";
import { loadDraft, loadExportDir, saveDraft } from "@/components/box-studio/storage";
import { readPersisted, useStudio } from "@/components/box-studio/store";
import { Viewport } from "@/components/box-studio/Viewport";

/** 자동 저장을 위한 디바운스 타이머 핸들 */
let draftTimer = 0;
/** 자동 저장 실패 경고 표시 여부 (중복 알림 방지용) */
let draftWarned = false;

/**
 * 박스 스튜디오 최상위 메인 컴포넌트
 * 자동 저장, 클립보드 붙여넣기, 작업 복원 수명주기를 관리하고 3D 뷰포트와 조작 패널을 배치합니다.
 */
export function Studio() {
  const status = useStudio((state) => state.status);
  const width = useStudio((state) => state.width);
  const depth = useStudio((state) => state.depth);
  const height = useStudio((state) => state.height);

  useEffect(() => {
    let alive = true;
    let booted = false;

    // 상태 변경 구독: 변경 시 700ms 디바운스로 로컬 저장소에 자동 저장
    const unsub = useStudio.subscribe(() => {
      if (!booted) return;
      window.clearTimeout(draftTimer);
      draftTimer = window.setTimeout(() => {
        void saveDraft(readPersisted()).catch(() => {
          if (draftWarned) return;
          draftWarned = true;
          useStudio.getState().flash("자동 저장에 실패했습니다");
        });
      }, 700);
    });

    /** 클립보드 이미지 붙여넣기 이벤트 핸들러 (Ctrl+V로 현재 선택된 면에 이미지 적용) */
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target;
      // 인풋 필드나 텍스트에어리어에서의 붙여넣기는 무시
      if (target instanceof HTMLElement && target.closest("input, textarea")) return;
      const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
      if (!file) return;
      event.preventDefault();
      void ingestImage(file)
        .then((url) => useStudio.getState().setImage(useStudio.getState().selected, url))
        .catch(() => useStudio.getState().flash("이미지를 열 수 없습니다"));
    };

    /** 브라우저 기본 드래그앤드롭 파일 열림 동작 방지 */
    const blockDrag = (event: DragEvent) => event.preventDefault();
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", blockDrag);
    window.addEventListener("drop", blockDrag);

    // 저장된 이전 작업 초안(Draft) 및 저장 폴더 불러오기
    void Promise.all([
      loadDraft().then((draft) => {
        if (!alive || !draft) return;
        useStudio.getState().replace(draft);
        useStudio.getState().flash("이전 작업을 복원했습니다");
      }),
      loadExportDir().then((handle) => {
        if (!alive || !handle) return;
        useStudio.getState().setExportDirectory(handle);
      }),
    ])
      .catch(() => {
        if (alive) useStudio.getState().flash("저장된 작업을 열지 못했습니다");
      })
      .finally(() => {
        booted = alive;
      });

    // 정리(Clean-up): 이벤트 리스너 제거 및 구독 해제
    return () => {
      alive = false;
      booted = false;
      unsub();
      window.clearTimeout(draftTimer);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", blockDrag);
      window.removeEventListener("drop", blockDrag);
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-bg text-fg">
      {/* 상단 헤더: 타이틀, 박스 규격 정보, 상태 메시지 표시 */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <h1 className="text-base font-semibold tracking-tight">박스 스튜디오</h1>
        <p className="hidden tabular-nums text-sm text-muted sm:block">
          {width} × {depth} × {height} mm
        </p>
        <p className="min-w-0 truncate text-right text-xs text-muted" role="status">
          {status}
        </p>
      </header>

      {/* 본문 영역: 3D 뷰포트(좌측) 및 설정 제어 패널(우측) */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 3D 뷰포트 영역 */}
        <section className="relative min-h-[46vh] flex-1 lg:min-h-0">
          <Viewport />
        </section>
        {/* 설정 및 편집 사이드 패널 */}
        <aside className="min-h-0 w-full overflow-y-auto border-t border-border lg:w-96 lg:shrink-0 lg:border-t-0 lg:border-l">
          <Panel />
        </aside>
      </div>
    </div>
  );
}
