import { Euler, MathUtils, Quaternion } from "three";

/** Unity 에디터와 동일한 오일러 회전 적용 순서 (Z → X → Y) */
export const UNITY_EULER_ORDER = "ZXY" as const;

/** 회전 스냅 선택지 (0 = 끔) */
export const ROTATE_SNAP_OPTIONS = [0, 5, 15, 45, 90] as const;

/** 스냅이 꺼져 있을 때 Shift 드래그에 적용되는 기본 스냅 각도 */
export const DEFAULT_SHIFT_SNAP = 15;

/**
 * 각도를 -180 ~ 180 범위로 정규화합니다.
 * @param deg 입력 각도(도)
 */
export function normalizeAngle(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  const value = ((((deg + 180) % 360) + 360) % 360) - 180;
  // -180과 180은 동일한 회전이므로 180으로 통일
  return value === -180 ? 180 : value;
}

/**
 * 각도를 지정 간격으로 스냅합니다. step이 0 이하이면 원본을 반환합니다.
 */
export function snapAngle(deg: number, step: number): number {
  if (!(step > 0)) return deg;
  return Math.round(deg / step) * step;
}

/** -0 및 부동소수 오차를 제거하는 소수점 3자리 반올림 */
function round3(n: number): number {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}

/**
 * 주어진 순서의 오일러 각도(도)를 Unity 방식(ZXY 순서) 각도로 변환합니다.
 * 회전 자세는 동일하며 표현만 달라집니다. (기존 저장 데이터는 XYZ 순서)
 */
export function eulerToZXY(
  x: number,
  y: number,
  z: number,
  fromOrder: "XYZ" | "ZXY" = "XYZ",
): { x: number; y: number; z: number } {
  const quat = new Quaternion().setFromEuler(
    new Euler(MathUtils.degToRad(x), MathUtils.degToRad(y), MathUtils.degToRad(z), fromOrder),
  );
  const result = new Euler().setFromQuaternion(quat, UNITY_EULER_ORDER);
  return {
    x: round3(MathUtils.radToDeg(result.x)),
    y: round3(MathUtils.radToDeg(result.y)),
    z: round3(MathUtils.radToDeg(result.z)),
  };
}
