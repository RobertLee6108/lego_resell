import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { downloadDataUrl, ingestImage, saveImageFile } from "@/components/box-studio/images";
import { paintFace } from "@/components/box-studio/paint";
import { readPersisted, useStudio, type CameraName } from "@/components/box-studio/store";
import { DEFAULT_SHIFT_SNAP, normalizeAngle, UNITY_EULER_ORDER } from "@/components/box-studio/rotation";
import {
  clamp,
  FACE_ORDER,
  faceAspect,
  type Anchor9,
  type AnchorZ,
  type FaceId,
  type Persisted,
  type ProjectionMode,
} from "@/components/box-studio/types";

/** 사용자의 OS 애니메이션 줄이기(prefers-reduced-motion) 설정 감지 */
const REDUCE_MOTION =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * 앵커 설정(9방향 앵커 및 Z 깊이 앵커)에 따른 회전 중심 오프셋 좌표를 계산합니다.
 * @param anchor 9방향 앵커
 * @param anchorZ 깊이 방향 앵커
 * @param sx 가로 스케일
 * @param sz 깊이 스케일
 * @param sy 세로(높이) 스케일
 */
function getAnchorOffsets(anchor: Anchor9, anchorZ: AnchorZ, sx: number, sz: number, sy: number) {
  let normX = 0;
  if (anchor.endsWith("-left")) normX = -0.5;
  else if (anchor.endsWith("-right")) normX = 0.5;

  let normY = 0;
  if (anchor.startsWith("top-")) normY = 0.5;
  else if (anchor.startsWith("bottom-")) normY = -0.5;

  let normZ = 0;
  if (anchorZ === "front") normZ = 0.5;
  else if (anchorZ === "back") normZ = -0.5;

  return {
    px: sx * normX,
    py: sy * normY,
    pz: sz * normZ,
  };
}

/**
 * 지오메트리에 6개 면(Right, Left, Top, Bottom, Front, Back)에 대응하는 머티리얼 그룹을 분할 설정합니다.
 * RoundedBoxGeometry 사용 시 인덱스 그룹이 없으면 재질이 정상 매핑되지 않는 문제를 방지합니다.
 */
function ensureSixGroups(geometry: THREE.BufferGeometry) {
  if (geometry.groups.length === 6) return;
  const count = geometry.index ? geometry.index.count : geometry.getAttribute("position").count;
  const per = Math.floor(count / 6);
  geometry.clearGroups();
  for (let i = 0; i < 6; i += 1) {
    const start = i * per;
    const size = i === 5 ? count - start : per;
    geometry.addGroup(start, size, i);
  }
}

/**
 * 지정된 카메라 뷰 프리셋에 따른 3D 공간상의 카메라 위치 벡터를 계산합니다.
 * @param name 카메라 프리셋 이름 ('iso', 'front', 'top')
 * @param width 박스 너비(mm)
 * @param depth 박스 깊이(mm)
 * @param height 박스 높이(mm)
 */
function presetPosition(name: CameraName, width: number, depth: number, height: number) {
  const sx = width / 100;
  const sy = height / 100;
  const sz = depth / 100;
  const max = Math.max(sx, sy, sz, 0.4);
  if (name === "front") return new THREE.Vector3(0, max * 0.95, max * 2.55);
  if (name === "top") return new THREE.Vector3(0, max * 3.05, max * 0.16);
  return new THREE.Vector3(max * 1.7, max * 1.15, max * 1.9);
}

/**
 * Three.js 기반 3D 박스 뷰포트 클래스
 * 렌더러, 씬, 카메라, 조명, 모서리 외곽선 렌더링, 텍스처 캔버스 생성 및 인터랙션을 담당합니다.
 */
export class BoxViewport {
  /** WebGL 렌더러 */
  private readonly renderer: THREE.WebGLRenderer;
  /** Three.js 씬 */
  private readonly scene = new THREE.Scene();
  /** 원근 카메라 */
  private readonly perspectiveCamera: THREE.PerspectiveCamera;
  /** 직교 카메라 */
  private readonly orthographicCamera: THREE.OrthographicCamera;
  /** 현재 활성화된 카메라 */
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  /** 오빗 컨트롤러 (패닝 및 관성 처리) */
  private readonly controls: OrbitControls;
  /** Unity Rotate 도구식 회전 기즈모 (축별 링 드래그) */
  private readonly transform: TransformControls;
  /** Shift 키 눌림 여부 (눌러있는 동안 기즈모 스냅 적용) */
  private shiftHeld = false;
  /** 박스 6개 면에 매핑되는 개별 PBR 표준 재질 배열 */
  private readonly materials: THREE.MeshStandardMaterial[];
  /** 박스 및 외곽선을 포함하는 3D 그룹 (회전 및 기준점 오프셋 적용 대상) */
  private readonly boxGroup = new THREE.Group();
  /** 박스 메쉬 */
  private readonly mesh: THREE.Mesh;
  /** 박스 외곽선 세그먼트 (LineSegments2, 두께 조절 가능) */
  private readonly edges: LineSegments2;
  /** 바닥 그림자 수신용 투명 평면 */
  private readonly ground: THREE.Mesh;
  /** 환경광 */
  private readonly ambient: THREE.AmbientLight;
  /** 반구광 (상단/하단 조명) */
  private readonly hemi: THREE.HemisphereLight;
  /** 주 광원 (그림자 생성 직사광) */
  private readonly key: THREE.DirectionalLight;
  /** 보조 보강광 */
  private readonly fill: THREE.DirectionalLight;
  /** 6면 텍스처를 동적으로 생성하기 위한 오프스크린 캔버스 배열 */
  private readonly canvases: HTMLCanvasElement[];
  /** 6면 텍스처 인스턴스 배열 */
  private readonly textures: Array<THREE.CanvasTexture | null>;
  /** 로드된 6면 원본 이미지 엘리먼트 배열 */
  private readonly images: Array<HTMLImageElement | null> = [null, null, null, null, null, null];
  /** 현재 면별 적용된 이미지 URL (변경 감지용) */
  private readonly imageSrc: Array<string | null> = [null, null, null, null, null, null];
  /** 비동기 이미지 로드 레이스 컨디션 방지용 토큰 */
  private readonly imageToken = [0, 0, 0, 0, 0, 0];
  /** 텍스처 리페인팅 최적화용 캐시 스탬프 */
  private readonly texStamp = ["", "", "", "", "", ""];
  /** 면 클릭 피킹용 레이캐스터 */
  private readonly raycaster = new THREE.Raycaster();
  /** 정규화된 마우스/터치 포인터 좌표 */
  private readonly pointer = new THREE.Vector2();
  /** 카메라 시점 전환 애니메이션 시작 좌표 */
  private readonly flyFrom = new THREE.Vector3();
  /** 카메라 시점 전환 애니메이션 목표 좌표 */
  private readonly flyTo = new THREE.Vector3();
  /** 카메라 시점 이동 보간 계수 (0: 시작, 1: 완료) */
  private fly = 1;
  /** 렌더 루프 requestAnimationFrame ID */
  private raf = 0;
  /** 동기화 스케줄링 플래그 */
  private scheduled = false;
  /** 이전 지오메트리 캐시 키 (크기, 라운드 반경) */
  private lastGeom = "";
  /** 이전 내보내기 요청 카운터 */
  private lastExport = 0;
  /** 이전 카메라 프리셋 변경 틱 */
  private lastCamera = 0;
  /** 이전 포지션 리셋 틱 */
  private lastResetTick = 0;
  /** Zustand 스토어 구독 해제 함수 */
  private unsub: () => void = () => {};
  /** 마우스 드래그 회전 상태 */
  private drag: { x: number; y: number; active: boolean; moved: boolean } = { x: 0, y: 0, active: false, moved: false };
  /** 모바일 터치 핀치 줌 거리 */
  private touchDist = 0;
  /** 뷰포트 크기 변화 감지 옵저버 */
  private observer: ResizeObserver;

  constructor(private readonly host: HTMLElement) {
    const initialState = useStudio.getState();

    // WebGL 렌더러 초기화
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    const canvas = this.renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.touchAction = "none";
    canvas.setAttribute("aria-label", "3D 박스. 드래그하여 회전합니다.");
    this.host.appendChild(canvas);

    // 카메라 및 컨트롤러 설정 (원근 및 직교 카메라 준비)
    this.perspectiveCamera = new THREE.PerspectiveCamera(38, 1, 0.05, 400);
    this.orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 400);
    this.camera =
      initialState.projection === "orthographic" ? this.orthographicCamera : this.perspectiveCamera;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enableRotate = false; // 상자 직접 회전을 위해 기본 컨트롤러 회전은 비활성화
    this.controls.enableZoom = false; // 휠 줌을 수동 구현하여 감도 조절
    this.controls.enablePan = true;
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 140;
    this.controls.target.set(0, 0, 0);

    // 조명 구성 (환경광, 반구광, 메인 직사광, 필라이트)
    this.ambient = new THREE.AmbientLight("#fff6ee", 0.34);
    this.hemi = new THREE.HemisphereLight("#fff8f1", "#3a3834", 0.42);
    this.key = new THREE.DirectionalLight("#fff7f0", 2.5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.00035;
    this.key.shadow.normalBias = 0.025;
    this.fill = new THREE.DirectionalLight("#d5e0ee", 0.65);
    this.scene.add(this.ambient, this.hemi, this.key, this.fill, this.key.target);

    // 6면 재질 및 메쉬 생성
    this.materials = FACE_ORDER.map(
      () =>
        new THREE.MeshStandardMaterial({
          roughness: 0.86,
          metalness: 0.02,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        }),
    );
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // 외곽선 지오메트리 및 재질 생성
    const initialEdgesGeom = new THREE.EdgesGeometry(this.mesh.geometry);
    const lineGeom = new LineSegmentsGeometry().fromEdgesGeometry(initialEdgesGeom);
    initialEdgesGeom.dispose();
    const lineMat = new LineMaterial({
      color: 0xd9d3c7,
      linewidth: 1.5,
      transparent: true,
      opacity: 1,
    });
    this.edges = new LineSegments2(lineGeom, lineMat);

    // 바닥 그림자 수신용 플레인
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ opacity: 0.4, transparent: true }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;

    this.boxGroup.add(this.mesh, this.edges);
    this.scene.add(this.boxGroup, this.ground);

    // Unity와 동일한 오일러 순서(ZXY) 사용
    this.boxGroup.rotation.order = UNITY_EULER_ORDER;

    // 회전 기즈모: 캔버스 포인터 핸들러보다 먼저 등록되어야 하므로 이벤트 리스너 등록 전에 생성
    this.transform = new TransformControls(this.camera, canvas);
    this.transform.setMode("rotate");
    this.transform.setSize(0.9);
    this.scene.add(this.transform.getHelper());
    this.transform.addEventListener("dragging-changed", (event) => {
      this.controls.enabled = !event.value;
    });
    this.transform.addEventListener("objectChange", this.onGizmoChange);
    window.addEventListener("keydown", this.onShiftKey);
    window.addEventListener("keyup", this.onShiftKey);
    window.addEventListener("blur", this.onWindowBlur);

    // 텍스처용 오프스크린 캔버스 초기화
    this.canvases = FACE_ORDER.map(() => document.createElement("canvas"));
    this.textures = FACE_ORDER.map(() => null);

    // 이벤트 리스너 등록
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("touchstart", this.onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", this.onTouchMove, { passive: false });
    canvas.addEventListener("touchend", this.onTouchEnd);
    canvas.addEventListener("dragover", this.onDragOver);
    canvas.addEventListener("drop", this.onDrop);

    // 초기 상태 적용 및 렌더링 루프 시작
    const state = useStudio.getState();
    this.placeCamera(state.cameraPreset, state, true);
    this.apply(state);
    this.resize();
    this.unsub = useStudio.subscribe(() => this.schedule());
    void document.fonts.ready.then(() => this.schedule());
    this.animate();

    // 부모 컨테이너 크기 변화 관찰
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.host);
  }

  /**
   * 뷰포트 인스턴스 파기 및 Three.js 메모리 리소스 정리
   */
  dispose() {
    cancelAnimationFrame(this.raf);
    this.unsub();
    this.observer.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointercancel", this.onPointerUp);
    canvas.removeEventListener("wheel", this.onWheel);
    canvas.removeEventListener("touchstart", this.onTouchStart);
    canvas.removeEventListener("touchmove", this.onTouchMove);
    canvas.removeEventListener("touchend", this.onTouchEnd);
    canvas.removeEventListener("dragover", this.onDragOver);
    canvas.removeEventListener("drop", this.onDrop);
    this.controls.dispose();
    window.removeEventListener("keydown", this.onShiftKey);
    window.removeEventListener("keyup", this.onShiftKey);
    window.removeEventListener("blur", this.onWindowBlur);
    this.transform.detach();
    this.scene.remove(this.transform.getHelper());
    this.transform.dispose();
    this.mesh.geometry.dispose();
    this.edges.geometry.dispose();
    this.ground.geometry.dispose();
    (this.ground.material as THREE.Material).dispose();
    (this.edges.material as THREE.Material).dispose();
    for (const material of this.materials) {
      material.map?.dispose();
      material.dispose();
    }
    this.renderer.dispose();
    canvas.remove();
  }

  /** 다음 애니메이션 프레임에 상태 동기화 예약 */
  private schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.apply(useStudio.getState());
    });
  }

  /** 뷰포트 종횡비에 따른 원근/직교 카메라 투영 매트릭스 업데이트 */
  private updateProjection(aspect: number) {
    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    const state = readPersisted();
    const sx = state.width / 100;
    const sy = state.height / 100;
    const sz = state.depth / 100;
    const max = Math.max(sx, sy, sz, 0.4);
    const dist = max * 2.85;
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(19));
    const halfW = halfH * aspect;
    this.orthographicCamera.left = -halfW;
    this.orthographicCamera.right = halfW;
    this.orthographicCamera.top = halfH;
    this.orthographicCamera.bottom = -halfH;
    this.orthographicCamera.updateProjectionMatrix();
  }

  /** 원근/직교 투영 모드 전환 */
  private switchProjection(mode: ProjectionMode) {
    const nextCamera =
      mode === "orthographic" ? this.orthographicCamera : this.perspectiveCamera;
    if (this.camera === nextCamera) return;

    nextCamera.position.copy(this.camera.position);
    nextCamera.quaternion.copy(this.camera.quaternion);
    nextCamera.zoom = this.camera.zoom;

    this.camera = nextCamera;
    this.controls.object = this.camera;
    this.transform.camera = this.camera;

    const cssW = this.host.clientWidth;
    const cssH = this.host.clientHeight;
    const aspect = cssW > 0 && cssH > 0 ? cssW / cssH : 1;
    this.updateProjection(aspect);
    this.controls.update();
  }

  /** 뷰포트 크기 변경에 따른 카메라 종횡비 및 렌더러 해상도 업데이트 */
  private resize() {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (width < 2 || height < 2) return;
    this.updateProjection(width / height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    const edgeMaterial = this.edges.material as LineMaterial;
    if (edgeMaterial.resolution) {
      edgeMaterial.resolution.set(width, height);
    }
  }

  /**
   * 스튜디오 전역 상태를 Three.js 씬 요소들에 반영
   */
  private apply(state: ReturnType<typeof useStudio.getState>) {
    const persisted = readPersisted();
    if (persisted.projection) {
      this.switchProjection(persisted.projection);
    }
    this.syncGeometry(persisted);
    this.syncImages(persisted);
    this.paint(persisted);
    this.syncLights(persisted);

    // 외곽선 스타일(색상, 두께, 투명도) 적용
    const edgeMaterial = this.edges.material as LineMaterial;
    edgeMaterial.color.set(persisted.edgeColor);
    edgeMaterial.linewidth = persisted.edgeWidth;
    edgeMaterial.transparent = true;
    const isTrans = persisted.edgeTransparent || persisted.edgeOpacity <= 0 || persisted.edgeWidth <= 0;
    edgeMaterial.opacity = persisted.edgeTransparent ? 0 : persisted.edgeOpacity;
    this.edges.visible = !isTrans;

    const cssW = this.host.clientWidth;
    const cssH = this.host.clientHeight;
    if (cssW > 0 && cssH > 0 && edgeMaterial.resolution) {
      edgeMaterial.resolution.set(cssW, cssH);
    }

    // 앵커 오프셋 적용 (회전 중심점 이동)
    const sx = persisted.width / 100;
    const sy = persisted.height / 100;
    const sz = persisted.depth / 100;
    const { px, py, pz } = getAnchorOffsets(persisted.anchor, persisted.anchorZ, sx, sz, sy);
    this.mesh.position.set(-px, -py, -pz);
    this.edges.position.set(-px, -py, -pz);
    this.ground.position.y = -py - sy / 2 - 0.002;

    // 상자 모델 수동 회전 각도 적용 (Unity식 ZXY 순서)
    this.boxGroup.rotation.order = UNITY_EULER_ORDER;
    this.boxGroup.rotation.set(
      THREE.MathUtils.degToRad(persisted.modelRotX),
      THREE.MathUtils.degToRad(persisted.modelRotY),
      THREE.MathUtils.degToRad(persisted.modelRotZ),
      UNITY_EULER_ORDER,
    );

    // 회전 기즈모 표시/좌표계/스냅 동기화
    this.syncGizmo(state.rotateGizmo, state.rotateSpace, state.rotateSnap);

    // 카메라 줌 비율 적용
    const targetZoom = THREE.MathUtils.clamp((persisted.zoom || 100) / 100, 0.25, 4);
    if (Math.abs(this.camera.zoom - targetZoom) > 0.001) {
      this.camera.zoom = targetZoom;
      this.camera.updateProjectionMatrix();
    }

    // 포지션 초기화 요청 처리
    if (state.positionResetTick !== this.lastResetTick) {
      this.lastResetTick = state.positionResetTick;
      this.controls.target.set(0, 0, 0);
      this.controls.update();
      this.placeCamera("front", persisted, true);
      this.boxGroup.position.set(0, 0, 0);
      this.boxGroup.rotation.set(0, 0, 0);
      this.camera.zoom = 1;
      this.camera.updateProjectionMatrix();
    } else if (state.cameraTick !== this.lastCamera) {
      this.lastCamera = state.cameraTick;
      this.placeCamera(state.cameraPreset, persisted, false);
    }

    // 자동 회전 활성화 설정
    this.controls.autoRotate = persisted.autoRotate && this.fly >= 1 && !REDUCE_MOTION;

    // 고해상도 이미지 내보내기 요청 처리
    if (state.exportRequest && state.exportRequest.n !== this.lastExport) {
      this.lastExport = state.exportRequest.n;
      this.capture(state.exportRequest.scale, state.exportRequest.format, persisted);
    }
  }

  /**
   * 박스 치수 및 모서리 둥글기(라운드)에 따라 3D 지오메트리를 재생성하여 동기화
   */
  private syncGeometry(state: Persisted) {
    const key = `${state.width}|${state.depth}|${state.height}|${state.radius}`;
    if (key === this.lastGeom) return;
    this.lastGeom = key;

    const sx = state.width / 100;
    const sy = state.height / 100;
    const sz = state.depth / 100;
    const minSide = Math.min(sx, sy, sz);
    const radius = Math.min(state.radius / 100, minSide * 0.45);

    // 라운드가 0에 가까우면 기본 BoxGeometry, 그 외에는 RoundedBoxGeometry 사용
    const next =
      radius < 0.004
        ? new THREE.BoxGeometry(sx, sy, sz)
        : new RoundedBoxGeometry(sx, sy, sz, 3, radius);
    ensureSixGroups(next);

    this.mesh.geometry.dispose();
    this.edges.geometry.dispose();
    this.mesh.geometry = next;

    // 외곽선 지오메트리 갱신
    const nextEdges = new THREE.EdgesGeometry(next, radius < 0.004 ? 1 : 28);
    this.edges.geometry = new LineSegmentsGeometry().fromEdgesGeometry(nextEdges);
    nextEdges.dispose();

    // 바닥 플레인 위치 및 그림자 카메라 볼륨 조정
    this.ground.position.y = -sy / 2 - 0.002;
    const max = Math.max(sx, sy, sz, 0.4);
    this.key.position.set(max * -1.35, max * 2.5, max * 1.15);
    this.key.target.position.set(0, 0, 0);
    this.fill.position.set(-max * 1.5, max * 0.55, -max * 0.4);

    const shadow = this.key.shadow.camera;
    shadow.left = -max * 1.6;
    shadow.right = max * 1.6;
    shadow.top = max * 1.6;
    shadow.bottom = -max * 1.6;
    shadow.near = 0.1;
    shadow.far = max * 8;
    shadow.updateProjectionMatrix();

    const cssW = this.host.clientWidth;
    const cssH = this.host.clientHeight;
    if (cssW > 1 && cssH > 1) {
      this.updateProjection(cssW / cssH);
    }
  }

  /**
   * 각 면의 이미지 Data URL이 변경되었을 때 HTMLImageElement를 비동기 로드하여 캐시
   */
  private syncImages(state: Persisted) {
    FACE_ORDER.forEach((id, index) => {
      const src = state.faces[id].image;
      if (src === this.imageSrc[index]) return;
      this.imageSrc[index] = src;
      this.images[index] = null;
      const token = ++this.imageToken[index];
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        if (this.imageToken[index] !== token) return;
        this.images[index] = img;
        this.paint(readPersisted());
      };
      img.src = src;
    });
  }

  /**
   * 6개 면의 텍스처를 캔버스에 다시 그리고 머티리얼에 매핑 (선택된 면은 발광 하이라이트 표시)
   */
  private paint(state: Persisted) {
    const selected = useStudio.getState().selected;
    FACE_ORDER.forEach((id, index) => {
      const face = state.faces[id];
      const image = this.images[index];
      const aspect = faceAspect(id, state.width, state.depth, state.height);
      const stamp = `${this.imageToken[index]}:${image ? 1 : 0}:${face.fit}:${face.rotation}:${face.flipH ? 1 : 0}:${face.flipV ? 1 : 0}:${face.color}:${aspect}:${face.brightness ?? 100}:${face.contrast ?? 100}:${face.saturation ?? 100}:${face.hue ?? 0}:${face.opacity ?? 100}:${face.invert ? 1 : 0}:${face.grayscale ? 1 : 0}`;
      const material = this.materials[index];

      // 속성이 변경되었을 때만 텍스처 다시 그리기
      if (stamp !== this.texStamp[index] || !this.textures[index]) {
        this.texStamp[index] = stamp;
        const canvas = this.canvases[index];
        paintFace(canvas, id, face, image, aspect);
        const prev = this.textures[index];
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        this.textures[index] = texture;
        material.map = texture;
        material.needsUpdate = true;
        prev?.dispose();
      }

      // 현재 선택된 면 살짝 밝게 강조 (발광 효과)
      material.emissive.set(id === selected ? "#4a433a" : "#000000");
      material.emissiveIntensity = id === selected ? 0.22 : 0;
    });
  }

  /**
   * 조명 및 배경 색상/투명도 동기화
   * 디렉셔널 라이트(주 광원) 중심의 조명 시스템 및 전체 밝기 모드 적용
   */
  private syncLights(state: Persisted) {
    const on = state.lights;
    const sx = state.width / 100;
    const sy = state.height / 100;
    const sz = state.depth / 100;
    const max = Math.max(sx, sy, sz, 0.4);

    // 디렉셔널 라이트 위치 (lightAngle 각도에 따라 상자 주위를 회전)
    const rad = THREE.MathUtils.degToRad(state.lightAngle ?? 45);
    const dist = max * 2.5;
    this.key.position.set(Math.sin(rad) * dist, max * 2.4, Math.cos(rad) * dist);
    this.key.target.position.set(0, 0, 0);

    // 반대편 보조광 위치
    this.fill.position.set(-Math.sin(rad) * dist * 0.8, max * 0.8, -Math.cos(rad) * dist * 0.8);

    // 디렉셔널 라이트 색상 및 강도 설정
    this.key.color.set(state.lightColor || "#ffffff");
    this.key.intensity = on ? (state.lightIntensity ?? 2.5) : 0;

    // 전체 밝기(overallBrightness) 배율 적용
    const brightness = state.overallBrightness ?? 1.0;
    this.renderer.toneMapping = on ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    this.renderer.toneMappingExposure = on ? 1.05 * brightness : 1.0 * brightness;

    // 환경광(Ambient): 전체 밝기에 따라 씬 전역의 기본 밝기를 조절
    this.ambient.intensity = on ? 0.35 * brightness : 1.15 * brightness;

    // 보조광(Fill): 메인 디렉셔널 라이트와 균형을 이루며 전체 밝기와 연동
    const fillRatio = (state.lightIntensity ?? 2.5) / 2.5;
    this.fill.intensity = on ? 0.45 * fillRatio * brightness : 0;

    // 반구광(Hemi): 상하 은은한 톤 유지
    this.hemi.intensity = on ? 0.25 * brightness : 0;

    // 그림자 설정
    this.key.castShadow = on && state.shadow;
    this.mesh.castShadow = on && state.shadow;
    this.ground.visible = on && state.shadow;

    // 투명 배경 처리
    if (state.background === "transparent") {
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0);
    } else {
      this.scene.background = new THREE.Color(state.background);
      this.renderer.setClearColor(state.background, 1);
    }
  }

  /**
   * 카메라 위치를 프리셋 좌표로 부드럽게 이동 (또는 즉시 전환)
   */
  private placeCamera(name: CameraName, state: Persisted, immediate: boolean) {
    const next = presetPosition(name, state.width, state.depth, state.height);
    if (immediate || REDUCE_MOTION) {
      this.camera.position.copy(next);
      this.controls.target.set(0, 0, 0);
      this.fly = 1;
      this.controls.update();
      return;
    }
    this.flyFrom.copy(this.camera.position);
    this.flyTo.copy(next);
    this.fly = 0;
  }

  /**
   * 메인 렌더링 애니메이션 루프
   */
  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    // 카메라 부드러운 이동(Fly) 애니메이션 보간
    if (this.fly < 1) {
      this.fly = Math.min(1, this.fly + 0.055);
      const k = 1 - (1 - this.fly) ** 3;
      this.camera.position.lerpVectors(this.flyFrom, this.flyTo, k);
      this.controls.target.set(0, 0, 0);
      this.controls.enableDamping = false;
    } else {
      this.controls.enableDamping = !REDUCE_MOTION;
    }
    const spinning = useStudio.getState().autoRotate && this.fly >= 1 && !REDUCE_MOTION;
    this.controls.autoRotate = spinning;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * 회전 기즈모 표시 여부, 좌표계(Local/Global), 스냅 각도를 스토어 상태에 맞게 동기화
   */
  private syncGizmo(on: boolean, space: "local" | "world", snap: number) {
    if (on) {
      if (this.transform.object !== this.boxGroup) this.transform.attach(this.boxGroup);
    } else if (this.transform.object) {
      this.transform.detach();
    }
    this.transform.setSpace(space);
    this.applyGizmoSnap(snap);
  }

  /** 설정 스냅 각도(또는 Shift 누름 시 기본 스냅)를 기즈모에 반영 */
  private applyGizmoSnap(snap: number) {
    const step = snap > 0 ? snap : this.shiftHeld ? DEFAULT_SHIFT_SNAP : 0;
    this.transform.setRotationSnap(step > 0 ? THREE.MathUtils.degToRad(step) : null);
  }

  /** 기즈모 드래그 중 모델 회전값을 스토어(오일러 각도)에 반영 */
  private onGizmoChange = () => {
    const rot = this.boxGroup.rotation;
    const toDeg = (rad: number) => Math.round(normalizeAngle(THREE.MathUtils.radToDeg(rad)) * 100) / 100 || 0;
    useStudio.setState({
      modelRotX: toDeg(rot.x),
      modelRotY: toDeg(rot.y),
      modelRotZ: toDeg(rot.z),
    });
  };

  /** Shift 키 눌림/떼짐 감지 (눌러있는 동안 회전 스냅) */
  private onShiftKey = (event: KeyboardEvent) => {
    if (event.key !== "Shift") return;
    const held = event.type === "keydown";
    if (held === this.shiftHeld) return;
    this.shiftHeld = held;
    this.applyGizmoSnap(useStudio.getState().rotateSnap);
  };

  /** 창 포커스 상실 시 Shift 상태 초기화 */
  private onWindowBlur = () => {
    if (!this.shiftHeld) return;
    this.shiftHeld = false;
    this.applyGizmoSnap(useStudio.getState().rotateSnap);
  };

  /**
   * 화면 좌표(X, Y)에서 레이캐스팅을 통해 클릭된 박스 면을 감지
   */
  private pickFace(clientX: number, clientY: number): FaceId | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.mesh, false)[0];
    const index = hit?.face?.materialIndex;
    if (index == null || index < 0 || index > 5) return null;
    return FACE_ORDER[index];
  }

  /** 마우스 좌클릭 / 터치 시작 이벤트 핸들러 */
  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    // 회전 기즈모 핸들 위에서 시작한 드래그는 기즈모가 처리합니다
    if (this.transform.object && (this.transform.dragging || this.transform.axis)) return;
    this.drag = { x: event.clientX, y: event.clientY, active: true, moved: false };
    this.fly = 1;
    try {
      (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
    } catch {}
  };

  /** 마우스 드래그를 통한 모델 수동 회전 각도 조절 */
  private onPointerMove = (event: PointerEvent) => {
    if (!this.drag.active) return;
    const dx = event.clientX - this.drag.x;
    const dy = event.clientY - this.drag.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.drag.moved = true;
    }
    this.drag.x = event.clientX;
    this.drag.y = event.clientY;

    // 기즈모가 켜져 있을 때는 빈 공간 드래그로 모델을 회전하지 않음 (Unity Rotate 도구와 동일)
    if (useStudio.getState().rotateGizmo) return;

    const curY = useStudio.getState().modelRotY;
    const curX = useStudio.getState().modelRotX;
    let nextY = Math.round(curY + dx * 0.5);
    if (nextY > 180) nextY -= 360;
    if (nextY < -180) nextY += 360;
    const nextX = clamp(Math.round(curX + dy * 0.5), -90, 90);
    useStudio.getState().setModelRotation("y", nextY);
    useStudio.getState().setModelRotation("x", nextX);
  };

  /** 드래그 종료 및 클릭 시 면 선택 처리 */
  private onPointerUp = (event: PointerEvent) => {
    if (!this.drag.active || event.button !== 0) return;
    try {
      (event.target as HTMLElement)?.releasePointerCapture?.(event.pointerId);
    } catch {}
    const wasMoved = this.drag.moved;
    this.drag.active = false;
    this.drag.moved = false;
    // 단순 클릭이었을 경우 해당 면 선택
    if (!wasMoved) {
      const face = this.pickFace(event.clientX, event.clientY);
      if (face) useStudio.getState().select(face);
    }
  };

  /** 마우스 휠을 통한 줌 배율 조절 */
  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const delta = -event.deltaY * 0.08;
    const curZoom = useStudio.getState().zoom;
    const nextZoom = clamp(Math.round(curZoom + delta), 25, 300);
    useStudio.getState().setZoom(nextZoom);
  };

  /** 모바일 터치 시작 (두 손가락 핀치 줌 감지) */
  private onTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      this.touchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    }
  };

  /** 모바일 두 손가락 핀치 줌 이동 처리 */
  private onTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 2 && this.touchDist > 0) {
      event.preventDefault();
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / this.touchDist;
      this.touchDist = dist;
      const curZoom = useStudio.getState().zoom;
      const nextZoom = clamp(Math.round(curZoom * ratio), 25, 300);
      useStudio.getState().setZoom(nextZoom);
    }
  };

  /** 터치 제스처 종료 */
  private onTouchEnd = () => {
    this.touchDist = 0;
  };

  /** 드래그오버 시 드롭 효과 복사로 지정 */
  private onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };

  /** 이미지 파일 드래그앤드롭 시 해당 마우스 위치의 면에 이미지 적용 */
  private onDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const face = this.pickFace(event.clientX, event.clientY) ?? useStudio.getState().selected;
    void ingestImage(file)
      .then((url) => useStudio.getState().setImage(face, url))
      .catch(() => useStudio.getState().flash("이미지를 열 수 없습니다"));
  };

  /**
   * 고해상도 이미지 파일(PNG/JPG) 캡처 및 다운로드
   * @param scale 해상도 배율 (1x, 2x, 4x)
   * @param format 파일 포맷 ('png' 또는 'jpg')
   * @param state 현재 박스 설정 상태
   */
  private capture(scale: 1 | 2 | 4, format: "png" | "jpg", state: Persisted) {
    const cssW = this.host.clientWidth;
    const cssH = this.host.clientHeight;
    if (cssW < 2 || cssH < 2) return;

    // 최대 4096px 해상도 제한
    let exportW = Math.round(cssW * scale);
    let exportH = Math.round(cssH * scale);
    const limit = Math.min(1, 4096 / Math.max(exportW, exportH));
    exportW = Math.max(2, Math.round(exportW * limit));
    exportH = Math.max(2, Math.round(exportH * limit));

    const prevBackground = this.scene.background;
    const helper = this.transform.getHelper();
    const helperWas = helper.visible;
    helper.visible = false;
    const groundWas = this.ground.visible;
    const emissive = this.materials.map((material) => material.emissiveIntensity);
    const transparentPng = format === "png" && state.background === "transparent";

    // 캡처 중 선택 면 발광 효과 제거
    this.materials.forEach((material) => {
      material.emissiveIntensity = 0;
    });

    // 투명 PNG 또는 캡처용 배경 설정
    if (transparentPng) {
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0);
      this.ground.visible = false;
    } else if (state.background === "transparent") {
      this.scene.background = new THREE.Color("#141413");
      this.renderer.setClearColor("#141413", 1);
    }

    // 캡처 해상도로 렌더러 임시 리사이징 및 투영 업데이트
    this.updateProjection(exportW / exportH);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(exportW, exportH, false);
    const edgeMaterial = this.edges.material as LineMaterial;
    if (edgeMaterial.resolution) {
      edgeMaterial.resolution.set(exportW, exportH);
    }

    // 캡처 렌더링
    this.renderer.render(this.scene, this.camera);
    if (edgeMaterial.resolution) {
      edgeMaterial.resolution.set(cssW, cssH);
    }

    // 이미지 Data URL 생성 및 파일 저장 실행 (선택된 폴더 또는 기본 다운로드)
    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    const url = this.renderer.domElement.toDataURL(mime, 0.92);
    const name = `box-${state.width}x${state.depth}x${state.height}.${format === "jpg" ? "jpg" : "png"}`;
    const dirHandle = useStudio.getState().exportDirHandle;
    const dirName = useStudio.getState().exportDirName;

    void saveImageFile(url, name, dirHandle)
      .then((savedToDir) => {
        if (savedToDir && dirName) {
          useStudio.getState().flash(`[${dirName}] 폴더에 이미지를 저장했습니다`);
        } else {
          useStudio.getState().flash("이미지를 저장했습니다");
        }
      })
      .catch(() => {
        downloadDataUrl(url, name);
        useStudio.getState().flash("이미지를 저장했습니다");
      });

    // 원래 뷰포트 상태로 복원
    this.materials.forEach((material, index) => {
      material.emissiveIntensity = emissive[index] ?? 0;
    });
    this.scene.background = prevBackground;
    helper.visible = helperWas;
    this.ground.visible = groundWas;
    if (state.background === "transparent") this.renderer.setClearColor(0x000000, 0);
    else this.renderer.setClearColor(state.background, 1);
    this.resize();
  }
}
