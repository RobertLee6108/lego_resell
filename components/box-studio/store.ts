import { create } from "zustand";
import {
  clamp,
  defaultPersisted,
  type Anchor9,
  type AnchorZ,
  type FaceId,
  type FaceState,
  type Persisted,
  type ProjectionMode,
} from "@/components/box-studio/types";
import { saveExportDir } from "@/components/box-studio/storage";
import { normalizeAngle } from "@/components/box-studio/rotation";

/** 회전 기즈모 기준 좌표계 ('local': 모델 자신의 축, 'world': 월드 축) */
export type RotateSpace = "local" | "world";

/** 카메라 시점 프리셋 ('iso': 등각 시점, 'front': 정면 시점, 'top': 윗면 시점) */
export type CameraName = "iso" | "front" | "top";

/** 이미지 내보내기 파일 포맷 */
export type ExportFormat = "png" | "jpg";

/** 이미지 내보내기 요청 명세 */
type ExportRequest = {
  /** 해상도 스케일 배율 (1x, 2x, 4x) */
  scale: 1 | 2 | 4;
  /** 파일 형식 */
  format: ExportFormat;
  /** 요청 트리거 식별 번호 (요청마다 증가) */
  n: number;
};

/** 박스 스튜디오 전체 전역 상태 및 액션 인터페이스 */
type StudioState = Persisted & {
  /** 상단 바 등에 노출되는 일시적 안내/알림 메시지 */
  status: string;
  /** 이미지 내보내기 요청 상태 (요청 시 객체, 완료 시 null) */
  exportRequest: ExportRequest | null;
  /** 현재 카메라 시점 프리셋 */
  cameraPreset: CameraName;
  /** 카메라 변경 감지용 카운터 틱 */
  cameraTick: number;

  /** 사용자가 선택한 이미지 내보내기 폴더 핸들 (File System Access API) */
  exportDirHandle: FileSystemDirectoryHandle | null;
  /** 사용자가 선택한 폴더 이름 */
  exportDirName: string | null;
  /** 저장 폴더 설정 액션 */
  setExportDirectory: (handle: FileSystemDirectoryHandle | null) => void;
  /** 저장 폴더 초기화 액션 */
  clearExportDirectory: () => void;

  /** 카메라 투영 방식 ('perspective': 원근 투영, 'orthographic': 직교 투영) 변경 액션 */
  setProjection: (mode: ProjectionMode) => void;

  /** 가로/세로/높이 크기 변경 액션 */
  setSize: (key: "width" | "depth" | "height", value: number) => void;
  /** 정육면체(균등 크기) 모드 켜기/끄기 */
  setUniform: (on: boolean) => void;
  /** 활성 편집 면 선택 */
  select: (id: FaceId) => void;
  /** 특정 면의 속성 부분 업데이트 */
  patchFace: (id: FaceId, patch: Partial<FaceState>) => void;
  /** 특정 면에 이미지 텍스처 적용 */
  setImage: (id: FaceId, image: string | null) => void;
  /** 특정 면의 이미지 90도 회전 */
  rotateFace: (id: FaceId) => void;
  /** 조명 ON/OFF */
  setLights: (on: boolean) => void;
  /** 디렉셔널 라이트 색상 변경 */
  setLightColor: (color: string) => void;
  /** 디렉셔널 라이트 강도 변경 */
  setLightIntensity: (intensity: number) => void;
  /** 전체 밝기 변경 */
  setOverallBrightness: (brightness: number) => void;
  /** 디렉셔널 라이트 각도 변경 */
  setLightAngle: (angle: number) => void;
  /** 특정 면의 이미지 보정/편집 초기화 */
  resetFaceAdjustments: (id: FaceId) => void;
  /** 바닥 그림자 ON/OFF */
  setShadow: (on: boolean) => void;
  /** 자동 회전 ON/OFF */
  setAutoRotate: (on: boolean) => void;
  /** 배경 색상 변경 */
  setBackground: (background: string) => void;
  /** 모서리 라운드 반경 설정 */
  setRadius: (radius: number) => void;
  /** 외곽선 색상 설정 */
  setEdgeColor: (edgeColor: string) => void;
  /** 외곽선 두께 설정 */
  setEdgeWidth: (edgeWidth: number) => void;
  /** 외곽선 투명도 토글 */
  setEdgeTransparent: (edgeTransparent: boolean) => void;
  /** 외곽선 불투명도 조절 */
  setEdgeOpacity: (edgeOpacity: number) => void;
  /** 모델 개별 축(x, y, z) 회전 설정 */
  setModelRotation: (axis: "x" | "y" | "z", value: number) => void;
  /** 회전 기즈모(Unity Rotate 도구) 표시 여부 */
  rotateGizmo: boolean;
  /** 회전 기즈모 좌표계 (Local / Global) */
  rotateSpace: RotateSpace;
  /** 회전 기즈모 스냅 각도 (0 = 끔) */
  rotateSnap: number;
  /** 회전 기즈모 표시 설정 */
  setRotateGizmo: (on: boolean) => void;
  /** 회전 기즈모 좌표계 설정 */
  setRotateSpace: (space: RotateSpace) => void;
  /** 회전 기즈모 스냅 각도 설정 */
  setRotateSnap: (snap: number) => void;
  /** 카메라 줌 비율 설정 */
  setZoom: (zoom: number) => void;
  /** 모델 변형(회전, 줌, 앵커) 초기화 */
  resetModelTransform: () => void;

  /** 9방향 기준점 (앵커) */
  anchor: Anchor9;
  /** 깊이 방향 기준점 (Z 앵커) */
  anchorZ: AnchorZ;
  /** 9방향 기준점 설정 */
  setAnchor: (anchor: Anchor9) => void;
  /** 깊이 기준점 설정 */
  setAnchorZ: (anchorZ: AnchorZ) => void;

  /** 크기 입력 모드 ('absolute': mm 직접 입력, 'aspect': 비율 기준 입력) */
  sizeMode: "absolute" | "aspect";
  /** 크기 입력 모드 전환 */
  setSizeMode: (mode: "absolute" | "aspect") => void;

  /** 종횡비 적용 기준 면 ('front', 'top', 'right') */
  aspectFace: "front" | "top" | "right";
  /** 종횡비 기준 면 설정 */
  setAspectFace: (face: "front" | "top" | "right") => void;

  /** 현재 선택된 종횡비 프리셋 이름 (예: '1:1', '16:9', 'custom' 등) */
  aspectRatioPreset: string;
  /** 종횡비 가로 비율값 */
  aspectRatioW: number;
  /** 종횡비 세로 비율값 */
  aspectRatioH: number;
  /** 커스텀 종횡비 적용 */
  setAspectRatioCustom: (w: number, h: number) => void;
  /** 프리셋 기반 종횡비 적용 */
  applyAspectRatioPreset: (wRatio: number, hRatio: number, presetName: string) => void;

  /** 상자 포지션 초기화 감지용 틱 */
  positionResetTick: number;
  /** 상자 회전, 줌, 앵커, 카메라를 기본 위치로 초기화 */
  resetBoxPosition: () => void;

  /** 카메라 프리셋 시점으로 즉시 이동 */
  focusCamera: (name: CameraName) => void;
  /** 렌더링 캔버스 이미지 내보내기 요청 */
  requestExport: (scale: 1 | 2 | 4, format: ExportFormat) => void;
  /** 저장된 설정값으로 전체 상태 덮어쓰기 */
  replace: (data: Persisted) => void;
  /** 전체 설정을 기본값으로 초기화 */
  reset: () => void;
  /** 하단/상단에 일시적으로 토스트 메시지 띄우기 (2.4초 후 자동 소멸) */
  flash: (message: string) => void;
};

/** 토스트 메시지 자동 소멸용 타이머 */
let flashTimer = 0;

/**
 * 박스 스튜디오 전역 Zustand 스토어
 */
export const useStudio = create<StudioState>((set) => ({
  ...defaultPersisted(),
  status: "",
  exportRequest: null,
  cameraPreset: "front",
  cameraTick: 0,
  exportDirHandle: null,
  exportDirName: null,

  setExportDirectory: (handle) => {
    set({ exportDirHandle: handle, exportDirName: handle?.name ?? null });
    void saveExportDir(handle);
  },
  clearExportDirectory: () => {
    set({ exportDirHandle: null, exportDirName: null });
    void saveExportDir(null);
  },

  // 투영 모드 설정
  setProjection: (mode) => set({ projection: mode }),

  // 크기 조절
  setSize: (key, value) =>
    set((state) => {
      const next = clamp(value, 10, 2000);
      if (state.uniform) return { width: next, depth: next, height: next };
      return { [key]: next };
    }),

  // 정육면체(균등 크기) 모드 토글
  setUniform: (on) =>
    set((state) =>
      on ? { uniform: true, depth: state.width, height: state.width } : { uniform: false },
    ),

  // 면 선택
  select: (id) => set({ selected: id }),

  // 면 상태 부분 패치
  patchFace: (id, patch) =>
    set((state) => ({
      faces: { ...state.faces, [id]: { ...state.faces[id], ...patch } },
    })),

  // 면 이미지 변경
  setImage: (id, image) =>
    set((state) => ({
      faces: { ...state.faces, [id]: { ...state.faces[id], image } },
      selected: id,
    })),

  // 면 이미지 90도 회전
  rotateFace: (id) =>
    set((state) => {
      const face = state.faces[id];
      const rotation = ((face.rotation + 90) % 360) as FaceState["rotation"];
      return { faces: { ...state.faces, [id]: { ...face, rotation } } };
    }),

  // 환경 및 시각 효과 설정
  setLights: (on) => set({ lights: on }),
  setLightColor: (lightColor) => set({ lightColor }),
  setLightIntensity: (lightIntensity) => set({ lightIntensity: clamp(lightIntensity, 0, 5) }),
  setOverallBrightness: (overallBrightness) => set({ overallBrightness: clamp(overallBrightness, 0.1, 3) }),
  setLightAngle: (lightAngle) => set({ lightAngle: clamp(lightAngle, -180, 180) }),
  resetFaceAdjustments: (id) =>
    set((state) => ({
      faces: {
        ...state.faces,
        [id]: {
          ...state.faces[id],
          brightness: 100,
          contrast: 100,
          saturation: 100,
          hue: 0,
          opacity: 100,
          grayscale: false,
          invert: false,
        },
      },
    })),
  setShadow: (on) => set({ shadow: on }),
  setAutoRotate: (on) => set({ autoRotate: on }),
  setBackground: (background) => set({ background }),
  setRadius: (radius) => set({ radius: clamp(radius, 0, 400) }),
  setEdgeColor: (edgeColor) => set({ edgeColor }),
  setEdgeWidth: (edgeWidth) => set({ edgeWidth: clamp(edgeWidth, 0.5, 10) }),
  setEdgeTransparent: (edgeTransparent) => set({ edgeTransparent }),
  setEdgeOpacity: (edgeOpacity) => set({ edgeOpacity: clamp(edgeOpacity, 0, 1) }),

  // 모델 변형 및 카메라 줌
  setModelRotation: (axis, value) =>
    set({
      [axis === "x" ? "modelRotX" : axis === "y" ? "modelRotY" : "modelRotZ"]: normalizeAngle(value),
    }),
  rotateGizmo: false,
  rotateSpace: "local",
  rotateSnap: 0,
  setRotateGizmo: (rotateGizmo) => set({ rotateGizmo }),
  setRotateSpace: (rotateSpace) => set({ rotateSpace }),
  setRotateSnap: (rotateSnap) => set({ rotateSnap: clamp(rotateSnap, 0, 180) }),
  setZoom: (zoom) => set({ zoom: clamp(zoom, 25, 400) }),
  resetModelTransform: () =>
    set({
      modelRotX: 0,
      modelRotY: 0,
      modelRotZ: 0,
      zoom: 100,
      anchor: "middle-center",
      anchorZ: "center",
    }),

  // 회전 축 기준점 (앵커)
  anchor: "middle-center",
  anchorZ: "center",
  setAnchor: (anchor) => set({ anchor }),
  setAnchorZ: (anchorZ) => set({ anchorZ }),

  // 치수 입력 모드 및 종횡비
  sizeMode: "absolute",
  setSizeMode: (mode) => set({ sizeMode: mode }),
  aspectFace: "front",
  setAspectFace: (face) => set({ aspectFace: face }),
  aspectRatioPreset: "1:1",
  aspectRatioW: 1,
  aspectRatioH: 1,

  // 사용자 지정 비율 계산 및 적용
  setAspectRatioCustom: (w, h) =>
    set((state) => {
      const safeW = Math.max(0.1, Number(w) || 1);
      const safeH = Math.max(0.1, Number(h) || 1);
      if (state.aspectFace === "front") {
        const nextH = clamp(Math.round((state.width * safeH) / safeW), 10, 2000);
        return { aspectRatioW: safeW, aspectRatioH: safeH, aspectRatioPreset: "custom", height: nextH };
      } else if (state.aspectFace === "top") {
        const nextD = clamp(Math.round((state.width * safeH) / safeW), 10, 2000);
        return { aspectRatioW: safeW, aspectRatioH: safeH, aspectRatioPreset: "custom", depth: nextD };
      } else {
        const nextH = clamp(Math.round((state.depth * safeH) / safeW), 10, 2000);
        return { aspectRatioW: safeW, aspectRatioH: safeH, aspectRatioPreset: "custom", height: nextH };
      }
    }),

  // 프리셋 비율 계산 및 적용
  applyAspectRatioPreset: (wRatio, hRatio, presetName) =>
    set((state) => {
      if (state.aspectFace === "front") {
        const nextH = clamp(Math.round((state.width * hRatio) / wRatio), 10, 2000);
        return { aspectRatioW: wRatio, aspectRatioH: hRatio, aspectRatioPreset: presetName, height: nextH };
      } else if (state.aspectFace === "top") {
        const nextD = clamp(Math.round((state.width * hRatio) / wRatio), 10, 2000);
        return { aspectRatioW: wRatio, aspectRatioH: hRatio, aspectRatioPreset: presetName, depth: nextD };
      } else {
        const nextH = clamp(Math.round((state.depth * hRatio) / wRatio), 10, 2000);
        return { aspectRatioW: wRatio, aspectRatioH: hRatio, aspectRatioPreset: presetName, height: nextH };
      }
    }),

  // 포지션 초기화
  positionResetTick: 0,
  resetBoxPosition: () =>
    set((state) => ({
      modelRotX: 0,
      modelRotY: 0,
      modelRotZ: 0,
      zoom: 100,
      anchor: "middle-center",
      anchorZ: "center",
      cameraPreset: "front",
      cameraTick: state.cameraTick + 1,
      positionResetTick: state.positionResetTick + 1,
    })),

  // 카메라 포커스 및 내보내기
  focusCamera: (name) => set((state) => ({ cameraPreset: name, cameraTick: state.cameraTick + 1 })),
  requestExport: (scale, format) =>
    set((state) => ({
      exportRequest: { scale, format, n: (state.exportRequest?.n ?? 0) + 1 },
    })),

  // 전체 상태 복원 및 초기화
  replace: (data) => set({ ...data }),
  reset: () => set({ ...defaultPersisted() }),

  // 토스트 메시지 출력
  flash: (message) => {
    window.clearTimeout(flashTimer);
    set({ status: message });
    flashTimer = window.setTimeout(() => set({ status: "" }), 2400);
  },
}));

/**
 * 현재 스토어 상태에서 저장/영속화 가능한 Persisted 필드만을 추출하여 반환합니다.
 */
export function readPersisted(): Persisted {
  const state = useStudio.getState();
  return {
    width: state.width,
    depth: state.depth,
    height: state.height,
    uniform: state.uniform,
    faces: state.faces,
    selected: state.selected,
    lights: state.lights,
    lightColor: state.lightColor,
    lightIntensity: state.lightIntensity,
    overallBrightness: state.overallBrightness,
    lightAngle: state.lightAngle,
    shadow: state.shadow,
    autoRotate: state.autoRotate,
    background: state.background,
    radius: state.radius,
    edgeColor: state.edgeColor,
    edgeWidth: state.edgeWidth,
    edgeTransparent: state.edgeTransparent,
    edgeOpacity: state.edgeOpacity,
    modelRotX: state.modelRotX,
    modelRotY: state.modelRotY,
    modelRotZ: state.modelRotZ,
    rotOrder: state.rotOrder,
    zoom: state.zoom,
    anchor: state.anchor,
    anchorZ: state.anchorZ,
    projection: state.projection,
  };
}
