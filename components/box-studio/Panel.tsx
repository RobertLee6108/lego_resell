"use client";
import * as Slider from "@radix-ui/react-slider";
import {
  ChevronDown,
  Download,
  FlipHorizontal,
  FlipVertical,
  Folder,
  FolderOpen,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ingestImage,
  isDirectoryPickerSupported,
  pickDirectory,
  verifyDirectoryPermission,
} from "@/components/box-studio/images";
import { deleteProject, listProjects, saveProject, type SavedProject } from "@/components/box-studio/storage";
import { readPersisted, useStudio, type CameraName, type ExportFormat } from "@/components/box-studio/store";
import {
  FACE_META,
  clamp,
  type Anchor9,
  type AnchorZ,
  type FaceId,
  type FitMode,
  type ProjectionMode,
} from "@/components/box-studio/types";

/** 9방향 2D 기준점(앵커) 목록 및 한국어 레이블/설명 */
const ANCHORS_9: { id: Anchor9; label: string; desc: string }[] = [
  { id: "top-left", label: "상단 좌측", desc: "상단 좌측 모서리" },
  { id: "top-center", label: "상단 중앙", desc: "윗면 중앙" },
  { id: "top-right", label: "상단 우측", desc: "상단 우측 모서리" },
  { id: "middle-left", label: "중단 좌측", desc: "좌측면 중앙" },
  { id: "middle-center", label: "중단 중앙", desc: "상자 정중앙 (기본)" },
  { id: "middle-right", label: "중단 우측", desc: "우측면 중앙" },
  { id: "bottom-left", label: "하단 좌측", desc: "하단 좌측 모서리" },
  { id: "bottom-center", label: "하단 중앙", desc: "바닥면 중앙" },
  { id: "bottom-right", label: "하단 우측", desc: "하단 우측 모서리" },
];

/** 박스 전개도(Net) 그리드 맵 (4행 3열 매핑) */
const NET: Array<FaceId | null> = [
  null,
  "top",
  null,
  null,
  "left",
  "front",
  "right",
  "back",
  null,
  "bottom",
  null,
  null,
];

/**
 * 숫자 입력 필드 컴포넌트
 * 수치 직접 입력 인풋 및 선택적 Radix 슬라이더를 렌더링합니다.
 */
function Field({
  label,
  value,
  onChange,
  unit = "mm",
  min = 10,
  max = 2000,
  step = 1,
  showSlider = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  showSlider?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(String(value));

  useEffect(() => {
    if (!focused) {
      setText(String(value));
    }
  }, [value, focused]);

  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums font-medium text-fg">
          {value} {unit}
        </span>
      </span>
      <input
        className="h-11 rounded-sm border border-border bg-surface px-3 text-sm tabular-nums outline-none transition-colors focus:border-fg"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={focused ? text : value}
        onFocus={() => {
          setFocused(true);
          setText(String(value));
        }}
        onChange={(event) => {
          setText(event.target.value);
          const next = Number(event.target.value);
          if (event.target.value !== "" && Number.isFinite(next) && next >= min && next <= max) onChange(next);
        }}
        onBlur={() => {
          setFocused(false);
          const next = clamp(Number(text || value), min, max);
          onChange(next);
          setText(String(next));
        }}
      />
      {showSlider && (
        <Slider.Root
          className="relative flex h-11 touch-none items-center"
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([next]) => onChange(next ?? value)}
          aria-label={label}
        >
          <Slider.Track className="relative h-1 w-full rounded-full bg-surface-2">
            <Slider.Range className="absolute h-full rounded-full bg-fg" />
          </Slider.Track>
          <Slider.Thumb className="block size-5 rounded-full border border-border bg-fg" />
        </Slider.Root>
      )}
    </label>
  );
}

/**
 * 조명 및 이미지 세부 속성 조절용 슬라이더 컴포넌트
 */
function SliderControl({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
  onReset,
}: {
  label: string;
  value: number;
  displayValue?: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <div className="flex items-center gap-2">
          <span className="tabular-nums font-medium text-fg">{displayValue ?? value}</span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-muted hover:text-fg underline transition-colors cursor-pointer"
            >
              초기화
            </button>
          )}
        </div>
      </div>
      <Slider.Root
        className="relative flex h-8 touch-none items-center"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(next ?? value)}
        aria-label={label}
      >
        <Slider.Track className="relative h-1 w-full rounded-full bg-surface-2">
          <Slider.Range className="absolute h-full rounded-full bg-fg" />
        </Slider.Track>
        <Slider.Thumb className="block size-4 rounded-full border border-border bg-fg cursor-pointer transition-transform hover:scale-110" />
      </Slider.Root>
    </div>
  );
}

/**
 * 접이식 아코디언 섹션 컴포넌트
 */
function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  action,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center justify-between py-2 text-left transition-colors hover:text-fg/80"
          aria-expanded={isOpen}
        >
          <span className="text-sm font-medium">{title}</span>
          <ChevronDown
            className={`size-4 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {isOpen && <div className="flex flex-col gap-4 pt-2">{children}</div>}
    </section>
  );
}

/**
 * 세그먼트 버튼(버튼 그룹) 컴포넌트
 */
function Segmented<T extends string | number | boolean>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const cols =
    options.length === 2
      ? "grid-cols-2"
      : options.length === 3
      ? "grid-cols-3"
      : options.length === 4
      ? "grid-cols-4"
      : options.length === 6
      ? "grid-cols-3"
      : "grid-cols-2";

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className={`grid ${cols} gap-1 rounded-lg bg-surface p-1`}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`h-9 rounded-md text-sm font-medium transition-all ${
                selected ? "bg-fg text-bg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 불리언 토글 세그먼트 버튼 컴포넌트
 */
function ToggleSegment({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
  options: [{ value: false; label: string }, { value: true; label: string }] | { value: boolean; label: string }[];
}) {
  return (
    <Segmented<boolean>
      label={label}
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}

/**
 * 선택된 면에 업로드한 이미지 파일을 적용하는 비동기 함수
 */
async function applyFile(id: FaceId, file: File) {
  try {
    const url = await ingestImage(file);
    useStudio.getState().setImage(id, url);
  } catch {
    useStudio.getState().flash("이미지를 열 수 없습니다");
  }
}

/**
 * 스튜디오 우측 편집 제어 사이드 패널 컴포넌트
 * 치수 규격, 변형/앵커, 면별 재질/이미지 편집, 조명/배경 스타일, 고해상도 내보내기 및 프로젝트 저장/불러오기 기능을 제공합니다.
 */
export function Panel() {
  const state = useStudio();
  /** 숨겨진 파일 인풋 참조 (이미지 업로드용) */
  const fileRef = useRef<HTMLInputElement>(null);
  /** 치수 수치 슬라이더 표시 여부 */
  const [showSlider, setShowSlider] = useState(false);
  /** 변형(회전/줌) 슬라이더 표시 여부 */
  const [showTransformSlider, setShowTransformSlider] = useState(false);
  /** 아코디언 섹션별 열림/닫힘 상태 */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dimensions: true,
    transform: true,
    net: true,
    face: true,
    scene: true,
    export: true,
    storage: true,
  });

  /** 아코디언 섹션 토글 핸들러 */
  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /** 이미지 내보내기 배율 상태 (1x, 2x, 4x) */
  const [scale, setScale] = useState<1 | 2 | 4>(2);
  /** 이미지 내보내기 파일 포맷 (png, jpg) */
  const [format, setFormat] = useState<ExportFormat>("png");
  /** 저장할 프로젝트 이름 */
  const [projectName, setProjectName] = useState("내 박스");
  /** 저장된 프로젝트 목록 */
  const [projects, setProjects] = useState<SavedProject[]>([]);
  /** 현재 선택된 면의 상태 객체 */
  const face = state.faces[state.selected];
  /** 현재 선택된 면의 메타데이터(라벨/힌트) */
  const meta = FACE_META[state.selected];
  /** 모서리 라운드 최대 허용값 계산 */
  const radiusMax = Math.max(0, Math.floor(Math.min(state.width, state.depth, state.height) / 2));
  /** 직전 단색 배경 색상 캐시 (투명 전환 후 복귀용) */
  const lastSolid = useRef(state.background === "transparent" ? "#141413" : state.background);
  if (state.background !== "transparent") lastSolid.current = state.background;

  /** 저장된 프로젝트 목록 새로고침 */
  const refresh = () => {
    void listProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 pb-10">
      {/* 1. 치수 및 종횡비 설정 섹션 */}
      <CollapsibleSection
        title="치수"
        isOpen={openSections.dimensions}
        onToggle={() => toggleSection("dimensions")}
        action={
          <button
            type="button"
            className="h-9 px-2 text-xs text-muted hover:text-fg transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              state.reset();
              state.flash("치수를 처음 상태로 되돌렸습니다");
            }}
          >
            초기화
          </button>
        }
      >
        <Segmented<"absolute" | "aspect">
          label="치수 모드"
          value={state.sizeMode}
          onChange={state.setSizeMode}
          options={[
            { value: "absolute", label: "Absolute Size (절대 크기)" },
            { value: "aspect", label: "Aspect Ratio (비율)" },
          ]}
        />

        {state.sizeMode === "absolute" ? (
          <>
            <Field label="가로 · 좌우" value={state.width} onChange={(value) => state.setSize("width", value)} showSlider={showSlider} />
            <Field label="세로 · 앞뒤" value={state.depth} onChange={(value) => state.setSize("depth", value)} showSlider={showSlider} />
            <Field label="높이" value={state.height} onChange={(value) => state.setSize("height", value)} showSlider={showSlider} />
            <ToggleSegment
              label="치수 슬라이더 조절"
              value={showSlider}
              onChange={setShowSlider}
              options={[
                { value: false, label: "숨김" },
                { value: true, label: "표시" },
              ]}
            />
            <ToggleSegment
              label="세 변 크기 모드"
              value={state.uniform}
              onChange={state.setUniform}
              options={[
                { value: false, label: "개별 크기" },
                { value: true, label: "정육면체 (동일)" },
              ]}
            />
          </>
        ) : (
          <div className="flex flex-col gap-4 rounded-md border border-border/60 bg-surface/40 p-3">
            <Segmented<"front" | "top" | "right">
              label="기준면 선택"
              value={state.aspectFace}
              onChange={state.setAspectFace}
              options={[
                { value: "front", label: "앞면 (W×H)" },
                { value: "top", label: "윗면 (W×D)" },
                { value: "right", label: "옆면 (D×H)" },
              ]}
            />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">비율 프리셋</span>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface p-1">
                {[
                  { label: "1:1", w: 1, h: 1 },
                  { label: "4:3", w: 4, h: 3 },
                  { label: "16:9", w: 16, h: 9 },
                  { label: "3:2", w: 3, h: 2 },
                  { label: "2:1", w: 2, h: 1 },
                  { label: "1:2", w: 1, h: 2 },
                ].map((p) => {
                  const isSel = state.aspectRatioPreset === p.label;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => state.applyAspectRatioPreset(p.w, p.h, p.label)}
                      className={`h-9 rounded-md text-sm font-medium transition-all ${
                        isSel ? "bg-fg text-bg shadow-sm" : "text-muted hover:text-fg"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">직접 비율 입력 (가로 : 세로)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="h-10 flex-1 rounded-sm border border-border bg-surface px-3 text-sm tabular-nums outline-none focus:border-fg"
                  value={state.aspectRatioW}
                  onChange={(e) => state.setAspectRatioCustom(Number(e.target.value) || 1, state.aspectRatioH)}
                  placeholder="W 비율"
                />
                <span className="text-muted font-bold">:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="h-10 flex-1 rounded-sm border border-border bg-surface px-3 text-sm tabular-nums outline-none focus:border-fg"
                  value={state.aspectRatioH}
                  onChange={(e) => state.setAspectRatioCustom(state.aspectRatioW, Number(e.target.value) || 1)}
                  placeholder="H 비율"
                />
              </div>
              <span className="text-xs text-muted">
                현재 기준면: {state.aspectFace === "front" ? `가로 ${state.width}mm × 높이 ${state.height}mm` : state.aspectFace === "top" ? `가로 ${state.width}mm × 세로 ${state.depth}mm` : `세로 ${state.depth}mm × 높이 ${state.height}mm`}
              </span>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-3">
              <span className="text-xs font-medium text-muted">기준면 기준 치수 조절</span>
              {state.aspectFace === "front" && (
                <>
                  <Field label="기준면 가로 (W)" value={state.width} onChange={(val) => {
                    const nextH = clamp(Math.round((val * state.aspectRatioH) / state.aspectRatioW), 10, 2000);
                    state.setSize("width", val);
                    state.setSize("height", nextH);
                  }} showSlider={showSlider} />
                  <Field label="박스 깊이 (D)" value={state.depth} onChange={(val) => state.setSize("depth", val)} showSlider={showSlider} />
                </>
              )}
              {state.aspectFace === "top" && (
                <>
                  <Field label="기준면 가로 (W)" value={state.width} onChange={(val) => {
                    const nextD = clamp(Math.round((val * state.aspectRatioH) / state.aspectRatioW), 10, 2000);
                    state.setSize("width", val);
                    state.setSize("depth", nextD);
                  }} showSlider={showSlider} />
                  <Field label="박스 높이 (H)" value={state.height} onChange={(val) => state.setSize("height", val)} showSlider={showSlider} />
                </>
              )}
              {state.aspectFace === "right" && (
                <>
                  <Field label="기준면 세로 (D)" value={state.depth} onChange={(val) => {
                    const nextH = clamp(Math.round((val * state.aspectRatioH) / state.aspectRatioW), 10, 2000);
                    state.setSize("depth", val);
                    state.setSize("height", nextH);
                  }} showSlider={showSlider} />
                  <Field label="박스 가로 (W)" value={state.width} onChange={(val) => state.setSize("width", val)} showSlider={showSlider} />
                </>
              )}
              <ToggleSegment
                label="치수 슬라이더 조절"
                value={showSlider}
                onChange={setShowSlider}
                options={[
                  { value: false, label: "숨김" },
                  { value: true, label: "표시" },
                ]}
              />
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* 2. 회전, 줌 및 앵커(기준점) 설정 섹션 */}
      <CollapsibleSection
        title="회전 및 줌"
        isOpen={openSections.transform}
        onToggle={() => toggleSection("transform")}
        action={
          <button
            type="button"
            className="flex items-center gap-1 h-9 px-2 text-xs text-muted hover:text-fg transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              state.resetBoxPosition();
              state.flash("상자 포지션과 회전을 초기화했습니다");
            }}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            포지션 초기화
          </button>
        }
      >
        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface text-sm font-medium hover:bg-surface-2 transition-colors"
          onClick={() => {
            state.resetBoxPosition();
            state.flash("상자 포지션과 회전을 초기화했습니다");
          }}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          상자 포지션 및 회전 초기화
        </button>

        <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-surface/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">회전축 앵커 (Pivot Point)</span>
            <span className="text-xs font-medium text-fg">
              {ANCHORS_9.find((a) => a.id === state.anchor)?.label ?? "중단 중앙"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-surface p-1.5">
            {ANCHORS_9.map((item) => {
              const selected = state.anchor === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    state.setAnchor(item.id);
                    state.flash(`회전축을 ${item.label}(으)로 변경했습니다`);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 rounded-md py-2 px-1 text-xs transition-all ${
                    selected
                      ? "bg-fg text-bg font-semibold shadow-sm"
                      : "text-muted hover:text-fg hover:bg-surface-2"
                  }`}
                  title={item.desc}
                >
                  <div
                    className={`size-2 rounded-full transition-transform ${
                      selected ? "bg-bg scale-125" : "bg-muted/70"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <Segmented<AnchorZ>
            label="앞뒤 깊이 기준"
            value={state.anchorZ}
            onChange={(z) => {
              state.setAnchorZ(z);
              state.flash(`깊이 기준을 ${z === "front" ? "앞면" : z === "back" ? "뒷면" : "중앙"}(으)로 변경했습니다`);
            }}
            options={[
              { value: "front", label: "앞면" },
              { value: "center", label: "중앙 (기본)" },
              { value: "back", label: "뒷면" },
            ]}
          />
        </div>

        <ToggleSegment
          label="회전 기즈모 (E)"
          value={state.rotateGizmo}
          onChange={state.setRotateGizmo}
          options={[
            { value: false, label: "끄기" },
            { value: true, label: "켜기" },
          ]}
        />
        {state.rotateGizmo && (
          <>
            <Segmented<"local" | "world">
              label="기즈모 좌표계"
              value={state.rotateSpace}
              onChange={state.setRotateSpace}
              options={[
                { value: "local", label: "Local" },
                { value: "world", label: "Global" },
              ]}
            />
            <Segmented<number>
              label="회전 스냅 (Shift = 15° 임시 스냅)"
              value={state.rotateSnap}
              onChange={state.setRotateSnap}
              options={[
                { value: 0, label: "끔" },
                { value: 5, label: "5°" },
                { value: 15, label: "15°" },
                { value: 45, label: "45°" },
              ]}
            />
          </>
        )}

        <Field
          label="가로 회전 (좌우 · Y축)"
          value={state.modelRotY}
          onChange={(val) => state.setModelRotation("y", val)}
          unit="°"
          min={-180}
          max={180}
          step={1}
          showSlider={showTransformSlider}
        />
        <Field
          label="세로 회전 (앞뒤 · X축)"
          value={state.modelRotX}
          onChange={(val) => state.setModelRotation("x", val)}
          unit="°"
          min={-180}
          max={180}
          step={1}
          showSlider={showTransformSlider}
        />
        <Field
          label="기울기 회전 (Z축)"
          value={state.modelRotZ}
          onChange={(val) => state.setModelRotation("z", val)}
          unit="°"
          min={-180}
          max={180}
          step={1}
          showSlider={showTransformSlider}
        />
        <Field
          label="핀치줌 (확대 · 축소)"
          value={state.zoom}
          onChange={state.setZoom}
          unit="%"
          min={25}
          max={300}
          step={5}
          showSlider={showTransformSlider}
        />
        <ToggleSegment
          label="회전·줌 슬라이더 조절"
          value={showTransformSlider}
          onChange={setShowTransformSlider}
          options={[
            { value: false, label: "숨김" },
            { value: true, label: "표시" },
          ]}
        />
      </CollapsibleSection>

      {/* 3. 박스 6개 면 선택 (전개도 레이아웃) 섹션 */}
      <CollapsibleSection
        title="면"
        isOpen={openSections.net}
        onToggle={() => toggleSection("net")}
      >
        <div className="grid grid-cols-4 gap-2">
          {NET.map((id, index) =>
            id ? (
              <button
                key={id}
                type="button"
                aria-pressed={state.selected === id}
                onClick={() => state.select(id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const file = event.dataTransfer.files[0];
                  if (file) void applyFile(id, file);
                }}
                className="flex flex-col gap-1"
              >
                <span
                  className={`block h-12 rounded-sm border bg-cover bg-center ${state.selected === id ? "border-fg" : "border-border"}`}
                  style={{
                    backgroundColor: state.faces[id].color,
                    backgroundImage: state.faces[id].image ? `url("${state.faces[id].image}")` : undefined,
                  }}
                />
                <span className="text-xs text-muted">{FACE_META[id].label}</span>
              </button>
            ) : (
              <span key={`gap-${index}`} />
            ),
          )}
        </div>
      </CollapsibleSection>

      {/* 4. 선택된 면의 색상, 이미지, 맞춤(fit), 회전 및 반전 설정 섹션 */}
      <CollapsibleSection
        title={`${meta.label}면`}
        isOpen={openSections.face}
        onToggle={() => toggleSection("face")}
      >
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>면 색</span>
          <input
            type="color"
            aria-label="면 색"
            value={face.color}
            onChange={(event) => state.patchFace(state.selected, { color: event.target.value })}
            className="h-11 w-14 rounded-sm border border-border bg-surface p-1"
          />
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void applyFile(state.selected, file);
          }}
        />
        <button type="button" className="h-11 rounded-sm border border-border bg-surface text-sm" onClick={() => fileRef.current?.click()}>
          이미지 넣기
        </button>
        {face.image ? (
          <button
            type="button"
            className="h-11 rounded-sm text-sm text-muted"
            onClick={() => state.setImage(state.selected, null)}
          >
            이미지 지우기
          </button>
        ) : (
          <p className="text-xs text-subtle">끌어다 놓거나 붙여넣으면 이 면에 들어갑니다.</p>
        )}
        <Segmented<FitMode>
          label="맞춤"
          value={face.fit}
          onChange={(fit) => state.patchFace(state.selected, { fit })}
          options={[
            { value: "cover", label: "채우기" },
            { value: "contain", label: "맞추기" },
            { value: "stretch", label: "늘리기" },
          ]}
        />
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-1 rounded-sm border border-border text-sm"
            onClick={() => state.rotateFace(state.selected)}
          >
            <RotateCw className="size-4" aria-hidden="true" />
            {face.rotation}°
          </button>
          <button
            type="button"
            aria-pressed={face.flipH}
            className={`inline-flex h-11 items-center justify-center gap-1 rounded-sm border text-sm ${face.flipH ? "border-fg" : "border-border"}`}
            onClick={() => state.patchFace(state.selected, { flipH: !face.flipH })}
          >
            <FlipHorizontal className="size-4" aria-hidden="true" />
            좌우
          </button>
          <button
            type="button"
            aria-pressed={face.flipV}
            className={`inline-flex h-11 items-center justify-center gap-1 rounded-sm border text-sm ${face.flipV ? "border-fg" : "border-border"}`}
            onClick={() => state.patchFace(state.selected, { flipV: !face.flipV })}
          >
            <FlipVertical className="size-4" aria-hidden="true" />
            상하
          </button>
        </div>

        {/* 이미지 편집 및 보정 컨트롤 */}
        {face.image && (
          <div className="flex flex-col gap-3.5 rounded-lg border border-border/80 bg-surface/60 p-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-semibold text-fg">이미지 보정 및 편집</span>
              <button
                type="button"
                onClick={() => state.resetFaceAdjustments(state.selected)}
                className="flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors cursor-pointer"
                title="이미지 보정 효과 초기화"
              >
                <RotateCcw className="size-3" />
                <span>효과 초기화</span>
              </button>
            </div>

            <SliderControl
              label="밝기"
              value={face.brightness ?? 100}
              displayValue={`${face.brightness ?? 100}%`}
              min={0}
              max={200}
              step={1}
              onChange={(brightness) => state.patchFace(state.selected, { brightness })}
              onReset={() => state.patchFace(state.selected, { brightness: 100 })}
            />

            <SliderControl
              label="대비"
              value={face.contrast ?? 100}
              displayValue={`${face.contrast ?? 100}%`}
              min={0}
              max={200}
              step={1}
              onChange={(contrast) => state.patchFace(state.selected, { contrast })}
              onReset={() => state.patchFace(state.selected, { contrast: 100 })}
            />

            <SliderControl
              label="채도"
              value={face.saturation ?? 100}
              displayValue={`${face.saturation ?? 100}%`}
              min={0}
              max={200}
              step={1}
              onChange={(saturation) => state.patchFace(state.selected, { saturation })}
              onReset={() => state.patchFace(state.selected, { saturation: 100 })}
            />

            <SliderControl
              label="색조 회전"
              value={face.hue ?? 0}
              displayValue={`${face.hue ?? 0}°`}
              min={-180}
              max={180}
              step={1}
              onChange={(hue) => state.patchFace(state.selected, { hue })}
              onReset={() => state.patchFace(state.selected, { hue: 0 })}
            />

            <SliderControl
              label="불투명도"
              value={face.opacity ?? 100}
              displayValue={`${face.opacity ?? 100}%`}
              min={0}
              max={100}
              step={1}
              onChange={(opacity) => state.patchFace(state.selected, { opacity })}
              onReset={() => state.patchFace(state.selected, { opacity: 100 })}
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                aria-pressed={face.grayscale}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border text-xs font-medium transition-colors cursor-pointer ${
                  face.grayscale ? "border-fg bg-fg text-bg" : "border-border bg-surface text-fg hover:border-fg/60"
                }`}
                onClick={() => state.patchFace(state.selected, { grayscale: !face.grayscale })}
              >
                흑백 모드
              </button>
              <button
                type="button"
                aria-pressed={face.invert}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border text-xs font-medium transition-colors cursor-pointer ${
                  face.invert ? "border-fg bg-fg text-bg" : "border-border bg-surface text-fg hover:border-fg/60"
                }`}
                onClick={() => state.patchFace(state.selected, { invert: !face.invert })}
              >
                색상 반전
              </button>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* 5. 3D 장면 및 스타일(조명, 그림자, 자동 회전, 배경색, 모서리 라운드, 외곽선, 카메라 시점) 섹션 */}
      <CollapsibleSection
        title="장면"
        isOpen={openSections.scene}
        onToggle={() => toggleSection("scene")}
      >
        <ToggleSegment
          label="조명 효과 (디렉셔널 라이트)"
          value={state.lights}
          onChange={state.setLights}
          options={[
            { value: true, label: "조명 켬" },
            { value: false, label: "조명 끔" },
          ]}
        />
        {state.lights && (
          <div className="flex flex-col gap-3.5 rounded-lg border border-border/80 bg-surface/60 p-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-semibold text-fg">디렉션 라이트 및 밝기 설정</span>
              <button
                type="button"
                onClick={() => {
                  state.setLightColor("#ffffff");
                  state.setLightIntensity(2.5);
                  state.setOverallBrightness(1.0);
                  state.setLightAngle(45);
                }}
                className="flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors cursor-pointer"
                title="조명 설정 기본값으로 복원"
              >
                <RotateCcw className="size-3" />
                <span>조명 초기화</span>
              </button>
            </div>

            <label className="flex min-h-10 items-center justify-between gap-3 text-sm">
              <span className="text-xs text-muted">조명 색상 (디렉션 라이트)</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted uppercase">{state.lightColor}</span>
                <input
                  type="color"
                  aria-label="디렉셔널 라이트 색상"
                  value={state.lightColor}
                  onChange={(event) => state.setLightColor(event.target.value)}
                  className="h-9 w-12 rounded-sm border border-border bg-surface p-1 cursor-pointer"
                />
              </div>
            </label>

            <SliderControl
              label="디렉션 라이트 강도"
              value={state.lightIntensity}
              displayValue={`${state.lightIntensity.toFixed(1)}배`}
              min={0}
              max={5}
              step={0.1}
              onChange={state.setLightIntensity}
              onReset={() => state.setLightIntensity(2.5)}
            />

            <SliderControl
              label="전체 밝기 (전역 밝기 모드)"
              value={Math.round(state.overallBrightness * 100)}
              displayValue={`${Math.round(state.overallBrightness * 100)}%`}
              min={10}
              max={300}
              step={5}
              onChange={(val) => state.setOverallBrightness(val / 100)}
              onReset={() => state.setOverallBrightness(1.0)}
            />

            <SliderControl
              label="조명 방향 각도"
              value={state.lightAngle}
              displayValue={`${state.lightAngle}°`}
              min={-180}
              max={180}
              step={5}
              onChange={state.setLightAngle}
              onReset={() => state.setLightAngle(45)}
            />
          </div>
        )}
        <ToggleSegment
          label="그림자"
          value={state.shadow}
          onChange={state.setShadow}
          options={[
            { value: true, label: "그림자 켬" },
            { value: false, label: "그림자 끔" },
          ]}
        />
        <ToggleSegment
          label="자동 회전"
          value={state.autoRotate}
          onChange={state.setAutoRotate}
          options={[
            { value: false, label: "회전 끔" },
            { value: true, label: "회전 켬" },
          ]}
        />
        <ToggleSegment
          label="배경 모드"
          value={state.background === "transparent"}
          onChange={(transparent) => state.setBackground(transparent ? "transparent" : lastSolid.current)}
          options={[
            { value: false, label: "색상 배경" },
            { value: true, label: "투명 배경" },
          ]}
        />
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>배경색</span>
          <input
            type="color"
            aria-label="배경색"
            value={state.background === "transparent" ? lastSolid.current : state.background}
            onChange={(event) => state.setBackground(event.target.value)}
            className="h-11 w-14 rounded-sm border border-border bg-surface p-1"
          />
        </label>
        <ToggleSegment
          label="외곽선 모드"
          value={state.edgeTransparent}
          onChange={state.setEdgeTransparent}
          options={[
            { value: false, label: "외곽선 표시" },
            { value: true, label: "외곽선 숨김" },
          ]}
        />
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>외곽선 색</span>
          <input
            type="color"
            aria-label="외곽선 색"
            value={state.edgeColor}
            onChange={(event) => state.setEdgeColor(event.target.value)}
            className="h-11 w-14 rounded-sm border border-border bg-surface p-1"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="flex items-center justify-between">
            <span>외곽선 두께</span>
            <span className="tabular-nums text-muted">{state.edgeWidth} px</span>
          </span>
          <Slider.Root
            className="relative flex h-11 touch-none items-center"
            min={0.5}
            max={10}
            step={0.5}
            value={[state.edgeWidth]}
            onValueChange={([next]) => state.setEdgeWidth(next ?? 1.5)}
            aria-label="외곽선 두께"
          >
            <Slider.Track className="relative h-1 w-full rounded-full bg-surface-2">
              <Slider.Range className="absolute h-full rounded-full bg-fg" />
            </Slider.Track>
            <Slider.Thumb className="block size-5 rounded-full border border-border bg-fg" />
          </Slider.Root>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="flex items-center justify-between">
            <span>외곽선 불투명도</span>
            <span className="tabular-nums text-muted">{Math.round(state.edgeOpacity * 100)}%</span>
          </span>
          <Slider.Root
            className="relative flex h-11 touch-none items-center"
            min={0}
            max={100}
            step={5}
            value={[Math.round(state.edgeOpacity * 100)]}
            onValueChange={([next]) => state.setEdgeOpacity((next ?? 100) / 100)}
            aria-label="외곽선 불투명도"
          >
            <Slider.Track className="relative h-1 w-full rounded-full bg-surface-2">
              <Slider.Range className="absolute h-full rounded-full bg-fg" />
            </Slider.Track>
            <Slider.Thumb className="block size-5 rounded-full border border-border bg-fg" />
          </Slider.Root>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="flex items-center justify-between">
            <span>모서리 둥글기</span>
            <span className="tabular-nums text-muted">{Math.min(state.radius, radiusMax)} mm</span>
          </span>
          <Slider.Root
            className="relative flex h-11 touch-none items-center"
            min={0}
            max={radiusMax}
            step={1}
            value={[Math.min(state.radius, radiusMax)]}
            onValueChange={([next]) => state.setRadius(next ?? 0)}
            aria-label="모서리 둥글기"
          >
            <Slider.Track className="relative h-1 w-full rounded-full bg-surface-2">
              <Slider.Range className="absolute h-full rounded-full bg-fg" />
            </Slider.Track>
            <Slider.Thumb className="block size-5 rounded-full border border-border bg-fg" />
          </Slider.Root>
        </label>

        <div className="border-t border-border pt-4 space-y-4">
          <Segmented<ProjectionMode>
            label="투영 모드"
            value={state.projection}
            onChange={(next) => {
              state.setProjection(next);
              state.flash(
                next === "orthographic"
                  ? "직교 투영(Orthographic) 모드로 전환했습니다"
                  : "원근 투영(Perspective) 모드로 전환했습니다",
              );
            }}
            options={[
              { value: "perspective", label: "원근 투영" },
              { value: "orthographic", label: "직교 투영" },
            ]}
          />

          <Segmented<CameraName>
            label="카메라 시점"
            value={state.cameraPreset}
            onChange={state.focusCamera}
            options={[
              { value: "front", label: "정면" },
              { value: "iso", label: "45°" },
              { value: "top", label: "윗면" },
            ]}
          />
        </div>
      </CollapsibleSection>

      {/* 6. 고해상도 이미지(PNG/JPG) 내보내기 섹션 */}
      <CollapsibleSection
        title="내보내기"
        isOpen={openSections.export}
        onToggle={() => toggleSection("export")}
      >
        <Segmented<1 | 2 | 4>
          label="해상도"
          value={scale}
          onChange={setScale}
          options={[
            { value: 1, label: "1x" },
            { value: 2, label: "2x" },
            { value: 4, label: "4x" },
          ]}
        />
        <Segmented<ExportFormat>
          label="형식"
          value={format}
          onChange={setFormat}
          options={[
            { value: "png", label: "PNG" },
            { value: "jpg", label: "JPG" },
          ]}
        />

        {/* 저장 경로(폴더) 설정 */}
        <div className="flex flex-col gap-1.5 text-xs">
          <span className="font-medium text-muted">저장 경로</span>
          <div className="flex items-center justify-between gap-2 rounded-sm border border-border bg-surface-1 p-2">
            <div className="flex items-center gap-2 min-w-0">
              <Folder className="size-4 shrink-0 text-muted" aria-hidden="true" />
              <span
                className="truncate text-xs text-fg"
                title={state.exportDirName ?? "브라우저 기본 다운로드 폴더"}
              >
                {state.exportDirName ? state.exportDirName : "기본 다운로드 폴더"}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  if (!isDirectoryPickerSupported()) {
                    state.flash("이 브라우저는 폴더 지정을 지원하지 않아 기본 다운로드 폴더에 저장됩니다");
                    return;
                  }
                  try {
                    const handle = await pickDirectory();
                    if (handle) {
                      state.setExportDirectory(handle);
                      state.flash(`[${handle.name}] 폴더가 저장 경로로 지정되었습니다`);
                    }
                  } catch (err) {
                    console.error(err);
                    state.flash("폴더를 선택하지 않았습니다");
                  }
                }}
                className="flex items-center gap-1 rounded-sm bg-surface-2 px-2.5 py-1 text-xs text-fg hover:bg-surface-3 transition-colors cursor-pointer border border-border"
                title="저장할 폴더 선택"
              >
                <FolderOpen className="size-3.5" aria-hidden="true" />
                <span>{state.exportDirName ? "변경" : "폴더 선택"}</span>
              </button>
              {state.exportDirName && (
                <button
                  type="button"
                  onClick={() => {
                    state.clearExportDirectory();
                    state.flash("기본 다운로드 폴더로 변경했습니다");
                  }}
                  className="rounded-sm p-1 text-muted hover:text-fg transition-colors cursor-pointer"
                  title="기본 다운로드 폴더로 초기화"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-fg text-sm font-medium text-bg cursor-pointer"
          onClick={async () => {
            if (state.exportDirHandle) {
              const hasPerm = await verifyDirectoryPermission(state.exportDirHandle);
              if (!hasPerm) {
                state.clearExportDirectory();
                state.flash("폴더 접근 권한이 없어 기본 다운로드로 저장합니다");
              }
            }
            state.requestExport(scale, format);
          }}
        >
          <Download className="size-4" aria-hidden="true" />
          이미지로 저장
        </button>
      </CollapsibleSection>

      {/* 7. 프로젝트 저장 및 불러오기 (IndexedDB 보관함) 섹션 */}
      <CollapsibleSection
        title="보관"
        isOpen={openSections.storage}
        onToggle={() => toggleSection("storage")}
      >
        <label className="flex flex-col gap-2 text-sm">
          <span>이름</span>
          <input
            className="h-11 rounded-sm border border-border bg-surface px-3 outline-none"
            value={projectName}
            maxLength={40}
            onChange={(event) => setProjectName(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="h-11 rounded-sm border border-border bg-surface text-sm"
          onClick={() => {
            void saveProject(projectName, readPersisted())
              .then(() => {
                refresh();
                state.flash("보관함에 저장했습니다");
              })
              .catch(() => state.flash("저장하지 못했습니다"));
          }}
        >
          이 박스 저장
        </button>
        {projects.length === 0 ? (
          <p className="text-xs text-subtle">저장된 박스가 없습니다. 치수와 이미지는 이 브라우저에 자동으로 남습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((project) => (
              <li key={project.id} className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-sm border border-border px-3 text-left text-sm"
                  onClick={() => {
                    state.replace(project.data);
                    state.flash(`${project.name} 불러왔습니다`);
                  }}
                >
                  <span className="truncate">{project.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-subtle">
                    {new Intl.DateTimeFormat("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(project.savedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${project.name} 삭제`}
                  className="inline-flex size-11 items-center justify-center rounded-sm border border-border text-muted"
                  onClick={() => {
                    void deleteProject(project.id).then(refresh).catch(() => state.flash("삭제하지 못했습니다"));
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>
    </div>
  );
}
