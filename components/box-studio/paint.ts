import { FACE_META, type FaceId, type FaceState } from "@/components/box-studio/types";

/** 텍스처 캔버스의 최대 해상도 변 길이(px) */
const MAX_EDGE = 1024;

/**
 * 3D 박스 면에 매핑될 2D 캔버스 텍스처를 그립니다.
 * 배경색, 이미지 텍스처, 맞춤(fit) 모드, 회전 및 반전 변환을 적용합니다.
 * 이미지가 없을 때는 면 이름 라벨을 중앙에 표시합니다.
 *
 * @param canvas 대상 HTMLCanvasElement
 * @param id 면 식별자 ('front', 'back', 'left', 'right', 'top', 'bottom')
 * @param face 해당 면의 설정 상태 (색상, fit, 회전, 반전 등)
 * @param image 로드된 HTMLImageElement (없으면 null)
 * @param aspect 면의 가로세로 비율 (width / height)
 */
export function paintFace(
  canvas: HTMLCanvasElement,
  id: FaceId,
  face: FaceState,
  image: HTMLImageElement | null,
  aspect: number,
) {
  // 안전한 가로세로 비율 계산
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  let width: number;
  let height: number;

  // 비율에 따라 최대 해상도(MAX_EDGE)를 기준으로 캔버스 크기 결정
  if (safeAspect >= 1) {
    width = MAX_EDGE;
    height = Math.max(2, Math.round(MAX_EDGE / safeAspect));
  } else {
    height = MAX_EDGE;
    width = Math.max(2, Math.round(MAX_EDGE * safeAspect));
  }

  // 캔버스 크기 재설정
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  // 변환 초기화 및 배경색 칠하기
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = face.color;
  ctx.fillRect(0, 0, width, height);

  // 이미지가 등록되지 않은 경우: 면 이름 라벨(앞, 뒤, 위 등) 텍스트 렌더링
  if (!image) {
    const label = FACE_META[id].label;
    ctx.fillStyle = "rgba(28, 26, 23, 0.55)";
    ctx.font = `600 ${Math.round(Math.min(width, height) * 0.18)}px "Pretendard Variable", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, width / 2, height / 2);
    return;
  }

  // 90도 또는 270도 회전 시 가로세로 프레임 교환
  const swap = face.rotation === 90 || face.rotation === 270;
  const frameW = swap ? height : width;
  const frameH = swap ? width : height;
  let drawW = frameW;
  let drawH = frameH;

  // 이미지 fit 모드별 크기 스케일 계산 (stretch는 프레임에 맞춰 늘림)
  if (face.fit !== "stretch") {
    const scale =
      face.fit === "contain"
        ? Math.min(frameW / image.width, frameH / image.height)
        : Math.max(frameW / image.width, frameH / image.height);
    drawW = image.width * scale;
    drawH = image.height * scale;
  }

  // 이미지 편집/보정 필터 (밝기, 대비, 채도, 색조 회전, 불투명도, 흑백, 반전)
  const filters: string[] = [];
  if (typeof face.brightness === "number" && face.brightness !== 100) {
    filters.push(`brightness(${face.brightness}%)`);
  }
  if (typeof face.contrast === "number" && face.contrast !== 100) {
    filters.push(`contrast(${face.contrast}%)`);
  }
  if (typeof face.saturation === "number" && face.saturation !== 100) {
    filters.push(`saturate(${face.saturation}%)`);
  }
  if (typeof face.hue === "number" && face.hue !== 0) {
    filters.push(`hue-rotate(${face.hue}deg)`);
  }
  if (typeof face.opacity === "number" && face.opacity !== 100) {
    filters.push(`opacity(${face.opacity}%)`);
  }
  if (face.grayscale) {
    filters.push("grayscale(100%)");
  }
  if (face.invert) {
    filters.push("invert(100%)");
  }

  // 캔버스 중심 기준 회전 및 반전 적용 후 이미지 그리기
  ctx.save();
  if (filters.length > 0) {
    ctx.filter = filters.join(" ");
  }
  ctx.translate(width / 2, height / 2);
  ctx.rotate((face.rotation * Math.PI) / 180);
  ctx.scale(face.flipH ? -1 : 1, face.flipV ? -1 : 1);
  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}
