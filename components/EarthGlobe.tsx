"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { categoryMeta } from "@/lib/eventMeta";
import type { CrisisEvent } from "@/types/events";
import type { TerrainFeature, TerrainKind } from "@/types/terrain";

type EarthGlobeProps = {
  events: CrisisEvent[];
  terrainFeatures: TerrainFeature[];
  selectedEvent?: CrisisEvent;
  onSelectEvent: (event: CrisisEvent) => void;
};

type MarkerPosition = {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  scale: number;
};

type ZoomRenderLevel = "global" | "regional" | "local";

type SurfaceFocus = {
  latitude: number;
  longitude: number;
};

type ZoomRenderState = SurfaceFocus & {
  level: ZoomRenderLevel;
  tileKey: string;
  distance: number;
};

const globeRadius = 1.8;
const texturePath = "/earth/land_ocean_ice_2048.jpg";

export function EarthGlobe({
  events,
  terrainFeatures,
  selectedEvent,
  onSelectEvent
}: EarthGlobeProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const earthGroupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number | null>(null);
  const eventsRef = useRef(events);
  const initialSelectedEventRef = useRef(selectedEvent);
  const targetQuaternionRef = useRef<THREE.Quaternion | null>(null);
  const targetCameraDistanceRef = useRef<number | null>(null);
  const detailLayerRef = useRef<THREE.Group | null>(null);
  const renderedTileKeyRef = useRef("");
  const wheelFocusRef = useRef<SurfaceFocus | null>(null);
  const autoRotateTimerRef = useRef<number | null>(null);
  const [markerPositions, setMarkerPositions] = useState<MarkerPosition[]>([]);
  const [zoomRenderState, setZoomRenderState] = useState<ZoomRenderState>({
    latitude: 0,
    longitude: 0,
    level: "global",
    tileKey: "global",
    distance: 5.1
  });
  const selectedEventId = selectedEvent?.id;

  const eventById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const focusEvent = useCallback((event: CrisisEvent) => {
    const earthGroup = earthGroupRef.current;
    const controls = controlsRef.current;

    if (!earthGroup || !controls) {
      return;
    }

    targetQuaternionRef.current = getFocusQuaternion(event);
    targetCameraDistanceRef.current = 2.16;
    wheelFocusRef.current = {
      latitude: event.latitude,
      longitude: event.longitude
    };
    controls.autoRotate = false;

    if (autoRotateTimerRef.current) {
      window.clearTimeout(autoRotateTimerRef.current);
    }

    autoRotateTimerRef.current = window.setTimeout(() => {
      if (
        controlsRef.current &&
        cameraRef.current &&
        cameraRef.current.position.length() > 3.1
      ) {
        controlsRef.current.autoRotate = true;
      }
    }, 4500);
  }, []);

  const updateZoomRenderState = useCallback((nextState: ZoomRenderState) => {
    setZoomRenderState((previous) => {
      if (
        previous.tileKey === nextState.tileKey &&
        Math.abs(previous.distance - nextState.distance) < 0.04
      ) {
        return previous;
      }

      return nextState;
    });
  }, []);

  const updateZoomDetailLayer = useCallback(
    (
      camera: THREE.PerspectiveCamera,
      earthGroup: THREE.Group,
      earth: THREE.Mesh,
      detailLayer: THREE.Group
    ) => {
      const distance = camera.position.length();
      const level = getZoomRenderLevel(distance);
      const centerFocus =
        wheelFocusRef.current ??
        getSurfaceFocusFromCenter(camera, earth);

      if (distance > 2.78 || level === "global" || !centerFocus) {
        if (renderedTileKeyRef.current !== "global") {
          disposeChildren(detailLayer);
          detailLayer.clear();
          renderedTileKeyRef.current = "global";
        }

        if (controlsRef.current && distance > 3.1) {
          controlsRef.current.autoRotate = true;
        }

        updateZoomRenderState({
          latitude: centerFocus?.latitude ?? 0,
          longitude: centerFocus?.longitude ?? 0,
          level: "global",
          tileKey: "global",
          distance
        });
        return;
      }

      if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }

      const tileKey = getDetailTileKey(centerFocus, level);

      if (renderedTileKeyRef.current !== tileKey) {
        disposeChildren(detailLayer);
        detailLayer.clear();
        detailLayer.add(createZoomDetailTile(centerFocus, level));
        renderedTileKeyRef.current = tileKey;
      }

      updateZoomRenderState({
        ...centerFocus,
        level,
        tileKey,
        distance
      });

      earthGroup.updateMatrixWorld();
    },
    [updateZoomRenderState]
  );

  useEffect(() => {
    if (selectedEvent) {
      focusEvent(selectedEvent);
    }
  }, [focusEvent, selectedEvent]);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    const mountElement = mount;

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mountElement.clientWidth, mountElement.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountElement.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      42,
      mountElement.clientWidth / mountElement.clientHeight,
      0.01,
      100
    );
    camera.position.set(0, 0.18, 5.1);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.87;
    controls.maxDistance = 6.2;
    controls.rotateSpeed = 0.42;
    controls.zoomSpeed = 0.58;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.18;
    controlsRef.current = controls;

    controls.addEventListener("start", () => {
      controls.autoRotate = false;

      if (autoRotateTimerRef.current) {
        window.clearTimeout(autoRotateTimerRef.current);
      }

      autoRotateTimerRef.current = window.setTimeout(() => {
        if (camera.position.length() > 3.1) {
          controls.autoRotate = true;
        }
      }, 5000);
    });

    renderer.domElement.addEventListener(
      "wheel",
      (event) => {
        const surfaceFocus = getSurfaceFocusFromPointer(
          event,
          renderer.domElement,
          camera,
          earth
        );

        if (surfaceFocus) {
          wheelFocusRef.current = surfaceFocus;
        }

        controls.autoRotate = false;
      },
      { passive: true }
    );
    renderer.domElement.addEventListener("pointerdown", () => {
      wheelFocusRef.current = null;
      targetCameraDistanceRef.current = null;
    });

    scene.add(new THREE.AmbientLight(0x95b8ff, 1.7));

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.2);
    sunLight.position.set(4, 2, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x5de1ff, 1.1);
    rimLight.position.set(-5, 1.5, -3);
    scene.add(rimLight);

    const earthGroup = new THREE.Group();
    earthGroup.rotation.y = -0.78;
    earthGroupRef.current = earthGroup;
    scene.add(earthGroup);

    const texture = new THREE.TextureLoader().load(texturePath);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(globeRadius, 96, 96),
      new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 18,
        specular: new THREE.Color(0x355f7f)
      })
    );
    earthGroup.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(globeRadius * 1.018, 96, 96),
      new THREE.MeshBasicMaterial({
        color: 0x77ddff,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
        depthWrite: false
      })
    );
    earthGroup.add(atmosphere);
    const terrainLayer = createTerrainLayer(terrainFeatures);
    earthGroup.add(terrainLayer);

    const detailLayer = new THREE.Group();
    detailLayer.name = "mock-zoom-detail-layer";
    detailLayerRef.current = detailLayer;
    earthGroup.add(detailLayer);

    scene.add(createStarField());

    const initialSelectedEvent = initialSelectedEventRef.current;

    if (initialSelectedEvent) {
      targetQuaternionRef.current = getFocusQuaternion(initialSelectedEvent);
      targetCameraDistanceRef.current = 2.16;
      wheelFocusRef.current = {
        latitude: initialSelectedEvent.latitude,
        longitude: initialSelectedEvent.longitude
      };
      controls.autoRotate = false;
    }

    function resize() {
      const width = mountElement.clientWidth;
      const height = mountElement.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }

    function animate() {
      const targetQuaternion = targetQuaternionRef.current;
      const targetCameraDistance = targetCameraDistanceRef.current;

      if (targetQuaternion) {
        earthGroup.quaternion.slerp(targetQuaternion, 0.045);

        if (earthGroup.quaternion.angleTo(targetQuaternion) < 0.002) {
          earthGroup.quaternion.copy(targetQuaternion);
          targetQuaternionRef.current = null;
        }
      }

      if (targetCameraDistance) {
        const direction = camera.position.clone().normalize();
        const nextPosition = direction.multiplyScalar(targetCameraDistance);
        camera.position.lerp(nextPosition, 0.08);

        if (Math.abs(camera.position.length() - targetCameraDistance) < 0.012) {
          targetCameraDistanceRef.current = null;
        }
      }

      controls.update();
      terrainLayer.visible = camera.position.length() > 2.24;
      updateZoomDetailLayer(camera, earthGroup, earth, detailLayer);
      renderer.render(scene, camera);
      setMarkerPositions(
        getMarkerPositions(mountElement, camera, earthGroup, eventsRef.current)
      );
      frameRef.current = window.requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize);
    resize();
    animate();

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (autoRotateTimerRef.current) {
        window.clearTimeout(autoRotateTimerRef.current);
      }

      window.removeEventListener("resize", resize);
      controls.dispose();
      texture.dispose();
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
      cameraRef.current = null;
      controlsRef.current = null;
      earthGroupRef.current = null;
      detailLayerRef.current = null;
    };
  }, [terrainFeatures, updateZoomDetailLayer]);

  function zoom(delta: number) {
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!camera || !controls) {
      return;
    }

    const direction = camera.position.clone().normalize();
    const nextDistance = THREE.MathUtils.clamp(
      camera.position.length() + delta,
      controls.minDistance,
      controls.maxDistance
    );
    camera.position.copy(direction.multiplyScalar(nextDistance));
    targetCameraDistanceRef.current = null;
    controls.autoRotate = false;
    controls.update();
  }

  function resetView() {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const earthGroup = earthGroupRef.current;

    if (!camera || !controls || !earthGroup) {
      return;
    }

    targetQuaternionRef.current = null;
    targetCameraDistanceRef.current = null;
    wheelFocusRef.current = null;
    renderedTileKeyRef.current = "";
    if (detailLayerRef.current) {
      disposeChildren(detailLayerRef.current);
      detailLayerRef.current.clear();
    }
    setZoomRenderState({
      latitude: 0,
      longitude: 0,
      level: "global",
      tileKey: "global",
      distance: 5.1
    });
    earthGroup.rotation.set(0, -0.78, 0);
    camera.position.set(0, 0.18, 5.1);
    controls.target.set(0, 0, 0);
    controls.autoRotate = true;
    controls.update();
  }

  return (
    <div className="absolute inset-0 bg-[#02040a]" data-testid="earth-globe">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="earth-vignette pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-24 z-20 hidden -translate-x-1/2 rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-center text-xs text-slate-300 shadow-xl backdrop-blur-md md:block">
        <span className="block font-semibold uppercase tracking-[0.14em] text-cyan-300">
          {zoomRenderLabel(zoomRenderState.level)}
        </span>
        <span className="mt-1 block text-[11px] text-slate-400">
          {formatCoordinate(zoomRenderState.latitude, "lat")} ·{" "}
          {formatCoordinate(zoomRenderState.longitude, "lon")}
        </span>
      </div>
      <div className="pointer-events-none absolute inset-0">
        {markerPositions.map((marker) => {
          const event = eventById.get(marker.id);

          if (!event) {
            return null;
          }

          const meta = categoryMeta[event.category];
          const selected = event.id === selectedEventId;

          return (
            <button
              key={event.id}
              type="button"
              title={`${event.title} · ${event.locationName}`}
              className={`earth-event-marker pointer-events-auto ${
                selected ? "earth-event-marker-active" : ""
              }`}
              style={{
                "--marker-color": meta.markerColor,
                left: `${marker.x}px`,
                top: `${marker.y}px`,
                opacity: marker.visible ? 1 : 0,
                transform: `translate(-50%, -50%) scale(${marker.scale})`
              } as CSSProperties}
              onClick={() => onSelectEvent(event)}
            >
              <span className="earth-event-marker-core" />
              <span className="sr-only">{event.title}</span>
            </button>
          );
        })}
      </div>

      <div className="pointer-events-auto absolute right-3 top-24 z-20 flex flex-col gap-2 sm:right-4">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-slate-950/80 text-lg text-white shadow-xl backdrop-blur-md transition hover:border-cyan-300"
          title="Zoom in"
          onClick={() => zoom(-0.45)}
        >
          +
        </button>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-slate-950/80 text-lg text-white shadow-xl backdrop-blur-md transition hover:border-cyan-300"
          title="Zoom out"
          onClick={() => zoom(0.45)}
        >
          -
        </button>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-slate-950/80 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition hover:border-cyan-300"
          title="Reset view"
          onClick={resetView}
        >
          0
        </button>
      </div>
    </div>
  );
}

function latLngToVector3(latitude: number, longitude: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - latitude);
  const theta = THREE.MathUtils.degToRad(longitude + 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function vector3ToLatLng(vector: THREE.Vector3): SurfaceFocus {
  const normalized = vector.clone().normalize();
  const latitude = THREE.MathUtils.radToDeg(Math.asin(normalized.y));
  const theta = Math.atan2(normalized.z, -normalized.x);
  const longitude = normalizeLongitude(THREE.MathUtils.radToDeg(theta) - 180);

  return { latitude, longitude };
}

function getSurfaceFocusFromCenter(
  camera: THREE.PerspectiveCamera,
  earth: THREE.Mesh
): SurfaceFocus | null {
  return getSurfaceFocusFromNdc(0, 0, camera, earth);
}

function getSurfaceFocusFromPointer(
  event: WheelEvent,
  element: HTMLElement,
  camera: THREE.PerspectiveCamera,
  earth: THREE.Mesh
): SurfaceFocus | null {
  const rect = element.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

  return getSurfaceFocusFromNdc(x, y, camera, earth);
}

function getSurfaceFocusFromNdc(
  x: number,
  y: number,
  camera: THREE.PerspectiveCamera,
  earth: THREE.Mesh
): SurfaceFocus | null {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  const hit = raycaster.intersectObject(earth, false)[0];

  if (!hit) {
    return null;
  }

  return vector3ToLatLng(earth.worldToLocal(hit.point.clone()));
}

function getZoomRenderLevel(distance: number): ZoomRenderLevel {
  if (distance <= 2.2) {
    return "local";
  }

  if (distance <= 2.78) {
    return "regional";
  }

  return "global";
}

function getDetailTileKey(focus: SurfaceFocus, level: ZoomRenderLevel) {
  const cellSize = level === "local" ? 0.55 : 1.6;
  const latCell = Math.round(focus.latitude / cellSize);
  const lonCell = Math.round(focus.longitude / cellSize);

  return `${level}:${latCell}:${lonCell}`;
}

function createZoomDetailTile(focus: SurfaceFocus, level: ZoomRenderLevel) {
  const group = new THREE.Group();
  group.name = `rendered-detail-${getDetailTileKey(focus, level)}`;
  const local = level === "local";
  const extent = local ? 0.34 : 1.35;
  const seed = hashString(group.name);
  const random = createSeededRandom(seed);

  group.add(
    createSurfacePolyline(
      createTileBoundary(focus, extent),
      0x67e8f9,
      local ? 0.0014 : 0.0032,
      0.72,
      0.078
    )
  );

  for (let index = 0; index < (local ? 10 : 5); index += 1) {
    const offset = -extent * 0.72 + index * ((extent * 1.44) / (local ? 9 : 4));
    const coordinates = Array.from({ length: 7 }, (_, pointIndex) => {
      const step = -extent + pointIndex * ((extent * 2) / 6);
      const bend = Math.sin(pointIndex * 1.6 + seed * 0.001 + index) * extent * 0.08;

      return {
        latitude: clampLatitude(focus.latitude + offset + bend),
        longitude: normalizeLongitude(focus.longitude + step)
      };
    });

    group.add(
      createSurfacePolyline(
        coordinates,
        0xf8e8b0,
        local ? 0.0009 : 0.002,
        0.52,
        0.073
      )
    );
  }

  for (let index = 0; index < (local ? 4 : 2); index += 1) {
    const startLat = focus.latitude + (random() - 0.5) * extent * 1.6;
    const startLon = focus.longitude - extent * (0.72 + random() * 0.28);
    const coordinates = Array.from({ length: 6 }, (_, pointIndex) => ({
      latitude: clampLatitude(
        startLat + Math.sin(pointIndex * 1.25 + random()) * extent * 0.12
      ),
      longitude: normalizeLongitude(startLon + pointIndex * ((extent * 1.55) / 5))
    }));

    group.add(
      createSurfacePolyline(
        coordinates,
        0x38d9ff,
        local ? 0.0016 : 0.0032,
        0.76,
        0.082
      )
    );
  }

  for (let index = 0; index < (local ? 30 : 14); index += 1) {
    const latitude = clampLatitude(focus.latitude + (random() - 0.5) * extent * 1.65);
    const longitude = normalizeLongitude(focus.longitude + (random() - 0.5) * extent * 1.65);
    const radius = local ? 0.0035 + random() * 0.0055 : 0.011 + random() * 0.012;

    group.add(createDetailForestDot(latitude, longitude, radius, random() > 0.42));
  }

  for (let index = 0; index < (local ? 10 : 5); index += 1) {
    const latitude = clampLatitude(focus.latitude + (random() - 0.5) * extent * 1.2);
    const longitude = normalizeLongitude(focus.longitude + (random() - 0.5) * extent * 1.2);

    group.add(createDetailPeak(latitude, longitude, random() > 0.72 ? "cliff" : "ridge"));
  }

  return group;
}

function createTileBoundary(focus: SurfaceFocus, extent: number) {
  return [
    {
      latitude: clampLatitude(focus.latitude - extent),
      longitude: normalizeLongitude(focus.longitude - extent)
    },
    {
      latitude: clampLatitude(focus.latitude - extent),
      longitude: normalizeLongitude(focus.longitude + extent)
    },
    {
      latitude: clampLatitude(focus.latitude + extent),
      longitude: normalizeLongitude(focus.longitude + extent)
    },
    {
      latitude: clampLatitude(focus.latitude + extent),
      longitude: normalizeLongitude(focus.longitude - extent)
    },
    {
      latitude: clampLatitude(focus.latitude - extent),
      longitude: normalizeLongitude(focus.longitude - extent)
    }
  ];
}

function createSurfacePolyline(
  coordinates: SurfaceFocus[],
  color: number,
  radius: number,
  opacity: number,
  altitude: number
) {
  const points = coordinates.map((coordinate) =>
    latLngToVector3(coordinate.latitude, coordinate.longitude, globeRadius + altitude)
  );
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, Math.max(points.length * 12, 36), radius, 6, false);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false
  });

  return new THREE.Mesh(geometry, material);
}

function createDetailForestDot(
  latitude: number,
  longitude: number,
  radius: number,
  dense: boolean
) {
  const geometry = new THREE.CircleGeometry(radius, 12);
  const material = new THREE.MeshBasicMaterial({
    color: dense ? 0x19d875 : 0x37f59d,
    transparent: true,
    opacity: dense ? 0.62 : 0.44,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const dot = new THREE.Mesh(geometry, material);
  placeOnGlobeSurface(dot, latitude, longitude, 0.09, "z");

  return dot;
}

function createDetailPeak(latitude: number, longitude: number, kind: TerrainKind) {
  const isCliff = kind === "cliff";
  const geometry = new THREE.ConeGeometry(
    isCliff ? 0.008 : 0.006,
    isCliff ? 0.032 : 0.024,
    5
  );
  const material = new THREE.MeshStandardMaterial({
    color: isCliff ? 0xffb35d : 0xf5e3a4,
    emissive: isCliff ? 0x381700 : 0x2e2608,
    emissiveIntensity: 0.24,
    roughness: 0.82
  });
  const peak = new THREE.Mesh(geometry, material);
  placeOnGlobeSurface(peak, latitude, longitude, isCliff ? 0.046 : 0.04, "y");

  return peak;
}

function createTerrainLayer(features: TerrainFeature[]) {
  const group = new THREE.Group();
  group.name = "mock-rough-terrain-layer";

  features.forEach((feature) => {
    if (feature.kind === "forest") {
      group.add(createForestPatch(feature));
      return;
    }

    group.add(createLinearTerrain(feature));
  });

  return group;
}

function createForestPatch(feature: Extract<TerrainFeature, { kind: "forest" }>) {
  const radiusLat = degreesToSurfaceUnits(feature.radiusLatitude);
  const radiusLng =
    degreesToSurfaceUnits(feature.radiusLongitude) *
    Math.max(Math.cos(THREE.MathUtils.degToRad(feature.center.latitude)), 0.35);
  const geometry = new THREE.CircleGeometry(1, 56);
  const material = new THREE.MeshStandardMaterial({
    color: feature.density === "very-dense" ? 0x0f7a3b : 0x1f9d55,
    transparent: true,
    opacity: feature.density === "very-dense" ? 0.46 : 0.34,
    roughness: 0.95,
    metalness: 0,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = feature.name;
  mesh.scale.set(radiusLng, radiusLat, 1);
  placeOnGlobeSurface(
    mesh,
    feature.center.latitude,
    feature.center.longitude,
    0.024,
    "z"
  );
  mesh.rotateZ(THREE.MathUtils.degToRad(feature.rotation));

  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(createCirclePoints(64)),
    new THREE.LineBasicMaterial({
      color: 0x63f6a6,
      transparent: true,
      opacity: 0.38
    })
  );
  ring.scale.set(radiusLng * 1.04, radiusLat * 1.04, 1);
  placeOnGlobeSurface(
    ring,
    feature.center.latitude,
    feature.center.longitude,
    0.027,
    "z"
  );
  ring.rotateZ(THREE.MathUtils.degToRad(feature.rotation));

  const patch = new THREE.Group();
  patch.add(mesh, ring);

  return patch;
}

function createLinearTerrain(
  feature: Extract<TerrainFeature, { kind: "river" | "ridge" | "cliff" | "highland" }>
) {
  const group = new THREE.Group();
  const color = terrainColor(feature.kind);
  const radius = terrainTubeRadius(feature.kind, feature.intensity);
  const altitude = feature.kind === "river" ? 0.032 : 0.052;
  const points = feature.coordinates.map((coordinate) =>
    latLngToVector3(coordinate.latitude, coordinate.longitude, globeRadius + altitude)
  );
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(
    curve,
    Math.max(points.length * 16, 72),
    radius,
    8,
    false
  );
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: feature.kind === "river" ? 0.86 : 0.78,
    depthWrite: false
  });

  const tube = new THREE.Mesh(geometry, material);
  tube.name = feature.name;
  group.add(tube);

  if (feature.kind !== "river") {
    feature.coordinates.forEach((coordinate, index) => {
      if (index % 2 === 1 && feature.coordinates.length > 3) {
        return;
      }

      group.add(createTerrainPeak(coordinate.latitude, coordinate.longitude, feature.kind));
    });
  }

  return group;
}

function createCirclePoints(segments: number) {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;

    return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
  });
}

function createTerrainPeak(latitude: number, longitude: number, kind: TerrainKind) {
  const isCliff = kind === "cliff";
  const geometry = new THREE.ConeGeometry(
    isCliff ? 0.026 : 0.022,
    isCliff ? 0.11 : 0.085,
    5
  );
  const material = new THREE.MeshStandardMaterial({
    color: isCliff ? 0xffa947 : 0xf8e8b0,
    emissive: isCliff ? 0x4d1f00 : 0x3a2f0b,
    emissiveIntensity: 0.28,
    roughness: 0.8
  });
  const peak = new THREE.Mesh(geometry, material);
  placeOnGlobeSurface(peak, latitude, longitude, isCliff ? 0.075 : 0.064, "y");

  return peak;
}

function placeOnGlobeSurface(
  object: THREE.Object3D,
  latitude: number,
  longitude: number,
  altitude: number,
  axis: "y" | "z"
) {
  const normal = latLngToVector3(latitude, longitude, 1).normalize();
  const from = axis === "y" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);

  object.position.copy(normal.clone().multiplyScalar(globeRadius + altitude));
  object.quaternion.setFromUnitVectors(from, normal);
}

function degreesToSurfaceUnits(degrees: number) {
  return globeRadius * THREE.MathUtils.degToRad(degrees);
}

function terrainColor(kind: TerrainKind) {
  if (kind === "river") {
    return 0x38d9ff;
  }

  if (kind === "cliff") {
    return 0xffa24a;
  }

  if (kind === "highland") {
    return 0xdad7c9;
  }

  return 0xffe59f;
}

function terrainTubeRadius(kind: TerrainKind, intensity: 1 | 2 | 3) {
  const base = kind === "river" ? 0.009 : 0.0065;

  return base + intensity * 0.0035;
}

function normalizeLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function clampLatitude(latitude: number) {
  return THREE.MathUtils.clamp(latitude, -84, 84);
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let state = seed;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function zoomRenderLabel(level: ZoomRenderLevel) {
  if (level === "local") {
    return "Lokaldetails nachgeladen";
  }

  if (level === "regional") {
    return "Region nachgeladen";
  }

  return "Globalansicht";
}

function formatCoordinate(value: number, axis: "lat" | "lon") {
  const direction =
    axis === "lat"
      ? value >= 0
        ? "N"
        : "S"
      : value >= 0
        ? "E"
        : "W";

  return `${Math.abs(value).toFixed(2)}°${direction}`;
}

function disposeChildren(group: THREE.Group) {
  group.traverse((object) => {
    if (object === group) {
      return;
    }

    const disposable = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };

    disposable.geometry?.dispose();

    if (Array.isArray(disposable.material)) {
      disposable.material.forEach((material) => material.dispose());
    } else {
      disposable.material?.dispose();
    }
  });
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    const disposable = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };

    disposable.geometry?.dispose();

    if (Array.isArray(disposable.material)) {
      disposable.material.forEach((material) => material.dispose());
    } else {
      disposable.material?.dispose();
    }
  });
}

function getFocusQuaternion(event: CrisisEvent) {
  const localPosition = latLngToVector3(
    event.latitude,
    event.longitude,
    globeRadius
  ).normalize();
  const front = new THREE.Vector3(0, 0, 1);

  return new THREE.Quaternion().setFromUnitVectors(localPosition, front);
}

function getMarkerPositions(
  mount: HTMLDivElement,
  camera: THREE.PerspectiveCamera,
  earthGroup: THREE.Group,
  events: CrisisEvent[]
): MarkerPosition[] {
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  const cameraPosition = new THREE.Vector3();
  const earthCenter = new THREE.Vector3();

  camera.getWorldPosition(cameraPosition);
  earthGroup.getWorldPosition(earthCenter);

  return events.map((event) => {
    const worldPosition = latLngToVector3(
      event.latitude,
      event.longitude,
      globeRadius * 1.025
    ).applyMatrix4(earthGroup.matrixWorld);
    const normal = worldPosition.clone().sub(earthCenter).normalize();
    const cameraDirection = cameraPosition.clone().sub(worldPosition).normalize();
    const projected = worldPosition.clone().project(camera);
    const inFrame =
      projected.z > -1 &&
      projected.z < 1 &&
      projected.x > -1.15 &&
      projected.x < 1.15 &&
      projected.y > -1.15 &&
      projected.y < 1.15;
    const visible = normal.dot(cameraDirection) > 0.06 && inFrame;
    const distance = cameraPosition.distanceTo(worldPosition);

    return {
      id: event.id,
      x: Math.round((projected.x * 0.5 + 0.5) * width),
      y: Math.round((-projected.y * 0.5 + 0.5) * height),
      visible,
      scale: THREE.MathUtils.clamp(1.34 - distance * 0.12, 0.72, 1.05)
    };
  });
}

function createStarField() {
  const count = 1300;
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const radius = THREE.MathUtils.randFloat(26, 46);
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xb8d7ff,
      size: 0.045,
      transparent: true,
      opacity: 0.72,
      sizeAttenuation: true
    })
  );
}
