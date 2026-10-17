import { eulerToZXY } from "@/components/box-studio/rotation";

/**
 * 박스의 6개 면 렌더링 순서 상수 (Three.js 재질 매핑 순서)
 * 0: 오른쪽(right), 1: 왼쪽(left), 2: 윗면(top), 3: 밑면(bottom), 4: 앞면(front), 5: 뒷면(back)
 */
export const FACE_ORDER = ["right", "left", "top", "bottom", "front", "back"] as const;

/** 박스 각 면의 식별자 타입 */
export type FaceId = (typeof FACE_ORDER)[number];

/** 면 이미지 텍스처 맞춤 모드 ('cover': 꽉 채우기, 'contain': 비율 유지 맞춤, 'stretch': 늘리기) */
export type FitMode = "cover" | "contain" | "stretch";

/** 각 면별 개별 상태 속성 */
export type FaceState = {
  /** 면 배경 색상 (HEX) */
  color: string;
  /** 업로드된 이미지 데이터 URL (없으면 null) */
  image: string | null;
  /** 이미지 맞춤 방식 */
  fit: FitMode;
  /** 이미지 회전 각도 (0, 90, 180, 270도) */
  rotation: 0 | 90 | 180 | 270;
  /** 좌우 반전 여부 */
  flipH: boolean;
  /** 상하 반전 여부 */
  flipV: boolean;
  /** 이미지 밝기 (0% ~ 200%, 기본 100%) */
  brightness: number;
  /** 이미지 대비 (0% ~ 200%, 기본 100%) */
  contrast: number;
  /** 이미지 채도 (0% ~ 200%, 기본 100%) */
  saturation: number;
  /** 이미지 색조 회전 각도 (-180 ~ 180도, 기본 0도) */
  hue: number;
  /** 이미지 불투명도 (0% ~ 100%, 기본 100%) */
  opacity: number;
  /** 이미지 흑백 효과 적용 여부 */
  grayscale: boolean;
  /** 이미지 색상 반전 효과 적용 여부 */
  invert: boolean;
};

/** 9방향 2D 기준점 (앵커) */
export type Anchor9 =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** Z축(깊이) 기준점 */
export type AnchorZ = "front" | "center" | "back";

/** 카메라 투영 방식 ('perspective': 원근 투영, 'orthographic': 직교 투영) */
export type ProjectionMode = "perspective" | "orthographic";

/** 로컬 저장소 및 상태에 영속화되는 박스 스튜디오 전체 설정 데이터 */
export type Persisted = {
  /** 가로 너비 (mm 단위 기준) */
  width: number;
  /** 세로 깊이 (mm 단위 기준) */
  depth: number;
  /** 높이 (mm 단위 기준) */
  height: number;
  /** 6면 일괄 적용 여부 */
  uniform: boolean;
  /** 각 면별 상태 매핑 */
  faces: Record<FaceId, FaceState>;
  /** 현재 선택된 면 식별자 */
  selected: FaceId;
  /** 조명 활성화 여부 */
  lights: boolean;
  /** 디렉셔널 라이트 색상 (HEX) */
  lightColor: string;
  /** 디렉셔널 라이트 강도 (0 ~ 5) */
  lightIntensity: number;
  /** 전체 밝기 (0.1 ~ 3.0) */
  overallBrightness: number;
  /** 디렉셔널 라이트 수평 각도 (-180 ~ 180도) */
  lightAngle: number;
  /** 바닥 그림자 활성화 여부 */
  shadow: boolean;
  /** 자동 회전 활성화 여부 */
  autoRotate: boolean;
  /** 뷰포트 배경 색상 (또는 'transparent') */
  background: string;
  /** 박스 모서리 둥글기(라운드) 반경 */
  radius: number;
  /** 박스 외곽선(엣지) 색상 */
  edgeColor: string;
  /** 박스 외곽선 두께 */
  edgeWidth: number;
  /** 박스 외곽선 투명도 사용 여부 */
  edgeTransparent: boolean;
  /** 박스 외곽선 불투명도 (0 ~ 1) */
  edgeOpacity: number;
  /** 모델 X축 수동 회전 각도 (-180 ~ 180) */
  modelRotX: number;
  /** 모델 Y축 수동 회전 각도 (-180 ~ 180) */
  modelRotY: number;
  /** 모델 Z축 수동 회전 각도 (-180 ~ 180) */
  modelRotZ: number;
  /** 회전 각도의 오일러 적용 순서 (Unity 방식 ZXY, 구버전 데이터는 없음 → XYZ로 간주) */
  rotOrder: "ZXY";
  /** 카메라 줌 비율 (25% ~ 400%) */
  zoom: number;
  /** 회전 중심점 (XY 앵커) */
  anchor: Anchor9;
  /** 회전 중심점 (Z 앵커) */
  anchorZ: AnchorZ;
  /** 카메라 투영 방식 ('perspective': 원근 투영, 'orthographic': 직교 투영) */
  projection: ProjectionMode;
};

/** 면별 UI 표시 이름 및 설명 힌트 메타데이터 */
export const FACE_META: Record<FaceId, { label: string; hint: string }> = {
  front: { label: "앞", hint: "정면" },
  back: { label: "뒤", hint: "뒷면" },
  left: { label: "왼쪽", hint: "좌측" },
  right: { label: "오른쪽", hint: "우측" },
  top: { label: "위", hint: "윗면" },
  bottom: { label: "아래", hint: "밑면" },
};

/** 면별 초기 기본 배경 색상 */
const FACE_COLORS: Record<FaceId, string> = {
  front: "#efeae2",
  back: "#d5cfc4",
  left: "#c9c1b4",
  right: "#b7aea0",
  top: "#f7f4ee",
  bottom: "#8f877c",
};

/**
 * 특정 면의 기본 상태 객체를 반환합니다.
 * @param id 면 식별자
 */
export function defaultFace(id: FaceId): FaceState {
  return {
    color: FACE_COLORS[id],
    image: null,
    fit: "cover",
    rotation: 0,
    flipH: false,
    flipV: false,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    opacity: 100,
    grayscale: false,
    invert: false,
  };
}

/**
 * 박스 스튜디오의 전체 기본 설정 객체를 생성하여 반환합니다.
 */
export function defaultPersisted(): Persisted {
  return {
    width: 240,
    depth: 160,
    height: 90,
    uniform: false,
    faces: {
      front: defaultFace("front"),
      back: defaultFace("back"),
      left: defaultFace("left"),
      right: defaultFace("right"),
      top: defaultFace("top"),
      bottom: defaultFace("bottom"),
    },
    selected: "front",
    lights: true,
    lightColor: "#ffffff",
    lightIntensity: 2.5,
    overallBrightness: 1.0,
    lightAngle: 45,
    shadow: true,
    autoRotate: false,
    background: "#141413",
    radius: 0,
    edgeColor: "#d9d3c7",
    edgeWidth: 1.5,
    edgeTransparent: false,
    edgeOpacity: 1,
    modelRotX: 0,
    modelRotY: 0,
    modelRotZ: 0,
    rotOrder: "ZXY",
    zoom: 100,
    anchor: "middle-center",
    anchorZ: "center",
    projection: "perspective",
  };
}

/**
 * 숫자를 지정된 최소/최대 범위 내로 제한(클램핑)합니다.
 * @param n 대상 숫자
 * @param min 최솟값
 * @param max 최댓값
 */
export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * 치수(가로/세로/높이) 입력값을 검증하고 10 ~ 2000 사이로 보정합니다.
 * @param value 입력값
 * @param fallback 기본값
 */
function dim(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, 10, 2000);
}

/**
 * 특정 면의 가로세로 비율(Aspect Ratio)을 계산합니다.
 * @param id 면 식별자
 * @param width 박스 너비
 * @param depth 박스 깊이
 * @param height 박스 높이
 */
export function faceAspect(id: FaceId, width: number, depth: number, height: number): number {
  if (id === "front" || id === "back") return width / height;
  if (id === "left" || id === "right") return depth / height;
  return width / depth;
}

/**
 * 값이 유효한 FaceId인지 판별하는 타입 가드 함수입니다.
 */
function isFaceId(value: unknown): value is FaceId {
  return FACE_ORDER.includes(value as FaceId);
}

/**
 * 로컬 저장소 등 외부에서 불러온 데이터의 유효성을 검증하고 안전한 Persisted 객체로 변환합니다.
 * 잘못된 형식이나 누락된 값은 기본값으로 대체됩니다.
 * @param input 검증할 미정제 데이터
 */
export function sanitizePersisted(input: unknown): Persisted {
  const base = defaultPersisted();
  if (!input || typeof input !== "object") return base;
  const data = input as Partial<Persisted>;
  const faces = { ...base.faces };
  if (data.faces && typeof data.faces === "object") {
    for (const id of FACE_ORDER) {
      const raw = data.faces[id];
      if (!raw) continue;
      const fit: FitMode =
        raw.fit === "contain" || raw.fit === "stretch" || raw.fit === "cover" ? raw.fit : "cover";
      const rotation: FaceState["rotation"] =
        raw.rotation === 90 || raw.rotation === 180 || raw.rotation === 270 ? raw.rotation : 0;
      const brightness = Number.isFinite(Number(raw.brightness))
        ? clamp(Number(raw.brightness), 0, 200)
        : 100;
      const contrast = Number.isFinite(Number(raw.contrast))
        ? clamp(Number(raw.contrast), 0, 200)
        : 100;
      const saturation = Number.isFinite(Number(raw.saturation))
        ? clamp(Number(raw.saturation), 0, 200)
        : 100;
      const hue = Number.isFinite(Number(raw.hue))
        ? clamp(Number(raw.hue), -180, 180)
        : 0;
      const opacity = Number.isFinite(Number(raw.opacity))
        ? clamp(Number(raw.opacity), 0, 100)
        : 100;
      faces[id] = {
        color:
          typeof raw.color === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.color)
            ? raw.color
            : base.faces[id].color,
        image: typeof raw.image === "string" && raw.image.startsWith("data:image/") ? raw.image : null,
        fit,
        rotation,
        flipH: Boolean(raw.flipH),
        flipV: Boolean(raw.flipV),
        brightness,
        contrast,
        saturation,
        hue,
        opacity,
        grayscale: Boolean(raw.grayscale),
        invert: Boolean(raw.invert),
      };
    }
  }
  const background =
    data.background === "transparent" ||
    (typeof data.background === "string" && /^#[0-9a-fA-F]{6}$/.test(data.background))
      ? data.background
      : base.background;
  const projection: ProjectionMode =
    data.projection === "orthographic" ? "orthographic" : "perspective";
  // 회전값 검증 및 구버전(XYZ 순서) → Unity 방식(ZXY 순서) 마이그레이션
  const rawRot = {
    x: Number.isFinite(Number(data.modelRotX)) ? clamp(Number(data.modelRotX), -180, 180) : 0,
    y: Number.isFinite(Number(data.modelRotY)) ? clamp(Number(data.modelRotY), -180, 180) : 0,
    z: Number.isFinite(Number(data.modelRotZ)) ? clamp(Number(data.modelRotZ), -180, 180) : 0,
  };
  const rot = (data as { rotOrder?: string }).rotOrder === "ZXY" ? rawRot : eulerToZXY(rawRot.x, rawRot.y, rawRot.z, "XYZ");
  return {
    width: dim(data.width, base.width),
    depth: dim(data.depth, base.depth),
    height: dim(data.height, base.height),
    uniform: Boolean(data.uniform),
    faces,
    selected: isFaceId(data.selected) ? data.selected : "front",
    lights: data.lights !== false,
    lightColor:
      typeof data.lightColor === "string" && /^#[0-9a-fA-F]{6}$/.test(data.lightColor)
        ? data.lightColor
        : base.lightColor,
    lightIntensity: Number.isFinite(Number(data.lightIntensity))
      ? clamp(Number(data.lightIntensity), 0, 5)
      : base.lightIntensity,
    overallBrightness: Number.isFinite(Number(data.overallBrightness))
      ? clamp(Number(data.overallBrightness), 0.1, 3)
      : base.overallBrightness,
    lightAngle: Number.isFinite(Number(data.lightAngle))
      ? clamp(Number(data.lightAngle), -180, 180)
      : base.lightAngle,
    shadow: data.shadow !== false,
    autoRotate: Boolean(data.autoRotate),
    background,
    radius: Number.isFinite(Number(data.radius)) ? clamp(Number(data.radius), 0, 400) : 0,
    edgeColor:
      typeof data.edgeColor === "string" && /^#[0-9a-fA-F]{6}$/.test(data.edgeColor)
        ? data.edgeColor
        : base.edgeColor,
    edgeWidth: Number.isFinite(Number(data.edgeWidth)) ? clamp(Number(data.edgeWidth), 0.5, 10) : base.edgeWidth,
    edgeTransparent: Boolean(data.edgeTransparent),
    edgeOpacity: Number.isFinite(Number(data.edgeOpacity)) ? clamp(Number(data.edgeOpacity), 0, 1) : base.edgeOpacity,
    modelRotX: rot.x,
    modelRotY: rot.y,
    modelRotZ: rot.z,
    rotOrder: "ZXY",
    zoom: Number.isFinite(Number(data.zoom)) ? clamp(Number(data.zoom), 25, 400) : 100,
    anchor: (data.anchor as Anchor9) || "middle-center",
    anchorZ: (data.anchorZ as AnchorZ) || "center",
    projection,
  };
}
