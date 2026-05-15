"use client";

import Image from "next/image";
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
import type { ConflictOverlayData } from "@/types/conflictOverlay";
import type { CrisisEvent } from "@/types/events";

type EarthGlobeProps = {
  events: CrisisEvent[];
  conflictOverlay?: ConflictOverlayData | null;
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
  satelliteStatus: "fallback" | "loading" | "ready" | "error";
  satelliteZoom?: number;
};

type ZoomRenderPatch = SurfaceFocus & {
  level: ZoomRenderLevel;
  tileKey: string;
  distance: number;
  satelliteStatus?: ZoomRenderState["satelliteStatus"];
  satelliteZoom?: number;
};

const globeRadius = 1.8;
const satelliteTileOffset = 0.00008;
const satelliteMinDistance = globeRadius + 0.00016;
const texturePath = "/earth/land_ocean_ice_2048.jpg";
const customSatelliteTileUrlTemplate =
  process.env.NEXT_PUBLIC_SATELLITE_TILE_URL_TEMPLATE?.trim();
const satelliteTileUrlTemplate =
  customSatelliteTileUrlTemplate || "/api/satellite/{z}/{x}/{y}";

export function EarthGlobe({
  events,
  conflictOverlay,
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
  const satelliteLayerRef = useRef<THREE.Group | null>(null);
  const conflictOverlayLayerRef = useRef<THREE.Group | null>(null);
  const conflictOverlayRef = useRef(conflictOverlay);
  const tileTextureCacheRef = useRef(new Map<string, THREE.Texture>());
  const textureAnisotropyRef = useRef(1);
  const lastSatelliteLoadTimeRef = useRef(0);
  const prefetchedSatelliteKeysRef = useRef(new Set<string>());
  const renderedTileKeyRef = useRef("");
  const renderedSatelliteKeyRef = useRef("");
  const wheelFocusRef = useRef<SurfaceFocus | null>(null);
  const autoRotateTimerRef = useRef<number | null>(null);
  const [markerPositions, setMarkerPositions] = useState<MarkerPosition[]>([]);
  const [zoomRenderState, setZoomRenderState] = useState<ZoomRenderState>({
    latitude: 0,
    longitude: 0,
    level: "global",
    tileKey: "global",
    distance: 5.1,
    satelliteStatus: satelliteTileUrlTemplate ? "loading" : "fallback"
  });
  const selectedEventId = selectedEvent?.id;

  const eventById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    conflictOverlayRef.current = conflictOverlay;

    if (conflictOverlayLayerRef.current) {
      syncConflictOverlayLayer(conflictOverlayLayerRef.current, conflictOverlay);
    }
  }, [conflictOverlay]);

  const focusEvent = useCallback((event: CrisisEvent) => {
    const earthGroup = earthGroupRef.current;
    const controls = controlsRef.current;
    const camera = cameraRef.current;

    if (!earthGroup || !controls || !camera) {
      return;
    }

    targetQuaternionRef.current = getFocusQuaternion(event, camera);
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

  const updateZoomRenderState = useCallback((nextState: ZoomRenderPatch) => {
    setZoomRenderState((previous) => {
      const merged = {
        ...previous,
        ...nextState,
        satelliteStatus: nextState.satelliteStatus ?? previous.satelliteStatus,
        satelliteZoom: Object.hasOwn(nextState, "satelliteZoom")
          ? nextState.satelliteZoom
          : previous.satelliteZoom
      };

      if (
        previous.tileKey === merged.tileKey &&
        previous.satelliteStatus === merged.satelliteStatus &&
        previous.satelliteZoom === merged.satelliteZoom &&
        Math.abs(previous.distance - merged.distance) < 0.04
      ) {
        return previous;
      }

      return merged;
    });
  }, []);

  const updateSatelliteTileLayer = useCallback(
    (
      camera: THREE.PerspectiveCamera,
      earth: THREE.Mesh,
      satelliteLayer: THREE.Group
    ) => {
      const distance = camera.position.length();
      const tilePlan = getSatelliteTilePlan(camera);
      const focus =
        wheelFocusRef.current ??
        getSurfaceFocusFromCenter(camera, earth);

      if (!focus || !satelliteTileUrlTemplate || !tilePlan) {
        if (renderedSatelliteKeyRef.current !== "off") {
          disposeChildren(satelliteLayer);
          satelliteLayer.clear();
          renderedSatelliteKeyRef.current = "off";
        }

        updateZoomRenderState({
          latitude: focus?.latitude ?? 0,
          longitude: focus?.longitude ?? 0,
          level: getZoomRenderLevel(distance),
          tileKey: renderedTileKeyRef.current || "global",
          distance,
          satelliteStatus: satelliteTileUrlTemplate ? "loading" : "fallback",
          satelliteZoom: undefined
        });
        return;
      }

      const centerTile = latLngToXyzTile(
        focus.latitude,
        focus.longitude,
        tilePlan.zoom
      );
      const satelliteKey = [
        "satellite",
        tilePlan.zoom,
        centerTile.x,
        centerTile.y,
        tilePlan.radius
      ].join(":");

      if (renderedSatelliteKeyRef.current === satelliteKey) {
        return;
      }

      const now = performance.now();

      if (now - lastSatelliteLoadTimeRef.current < 700) {
        return;
      }

      lastSatelliteLoadTimeRef.current = now;
      renderedSatelliteKeyRef.current = satelliteKey;

      updateZoomRenderState({
        ...focus,
        level: getZoomRenderLevel(distance),
        tileKey: renderedTileKeyRef.current || getDetailTileKey(focus, getZoomRenderLevel(distance)),
        distance,
        satelliteStatus: "loading",
        satelliteZoom: tilePlan.zoom
      });

      loadSatelliteTileSet(
        centerTile,
        tilePlan.radius,
        tileTextureCacheRef.current,
        satelliteTileUrlTemplate,
        textureAnisotropyRef.current
      )
        .then((tileSet) => {
          if (renderedSatelliteKeyRef.current !== satelliteKey) {
            disposeChildren(tileSet);
            return;
          }

          disposeChildren(satelliteLayer);
          satelliteLayer.clear();
          satelliteLayer.add(tileSet);
          void prefetchSatelliteTileLevels(
            focus,
            tilePlan,
            prefetchedSatelliteKeysRef.current,
            tileTextureCacheRef.current,
            satelliteTileUrlTemplate,
            textureAnisotropyRef.current
          );
          updateZoomRenderState({
            ...focus,
            level: getZoomRenderLevel(camera.position.length()),
            tileKey:
              renderedTileKeyRef.current ||
              getDetailTileKey(focus, getZoomRenderLevel(camera.position.length())),
            distance: camera.position.length(),
            satelliteStatus: "ready",
            satelliteZoom: tilePlan.zoom
          });
        })
        .catch(() => {
          if (renderedSatelliteKeyRef.current !== satelliteKey) {
            return;
          }

          updateZoomRenderState({
            ...focus,
            level: getZoomRenderLevel(camera.position.length()),
            tileKey:
              renderedTileKeyRef.current ||
              getDetailTileKey(focus, getZoomRenderLevel(camera.position.length())),
            distance: camera.position.length(),
            satelliteStatus: satelliteLayer.children.length > 0 ? "ready" : "error",
            satelliteZoom: tilePlan.zoom
          });
        });
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
    const tileTextureCache = tileTextureCacheRef.current;
    const prefetchedSatelliteKeys = prefetchedSatelliteKeysRef.current;

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mountElement.clientWidth, mountElement.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    textureAnisotropyRef.current = renderer.capabilities.getMaxAnisotropy();
    mountElement.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      42,
      mountElement.clientWidth / mountElement.clientHeight,
      0.00001,
      100
    );
    camera.position.set(0, 0.18, 5.1);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = satelliteMinDistance;
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

    const satelliteLayer = new THREE.Group();
    satelliteLayer.name = "streamed-satellite-tile-layer";
    satelliteLayerRef.current = satelliteLayer;
    earthGroup.add(satelliteLayer);

    const conflictOverlayLayer = new THREE.Group();
    conflictOverlayLayer.name = "public-conflict-overlay-layer";
    conflictOverlayLayerRef.current = conflictOverlayLayer;
    syncConflictOverlayLayer(conflictOverlayLayer, conflictOverlayRef.current);
    earthGroup.add(conflictOverlayLayer);

    scene.add(createStarField());

    const initialSelectedEvent = initialSelectedEventRef.current;

    if (initialSelectedEvent) {
      targetQuaternionRef.current = getFocusQuaternion(initialSelectedEvent, camera);
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

      applyAdaptiveControlSensitivity(controls, camera.position.length());
      controls.update();
      updateSatelliteTileLayer(camera, earth, satelliteLayer);
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
      tileTextureCache.forEach((tileTexture) => tileTexture.dispose());
      tileTextureCache.clear();
      prefetchedSatelliteKeys.clear();
      renderer.dispose();
      renderer.domElement.remove();
      cameraRef.current = null;
      controlsRef.current = null;
      earthGroupRef.current = null;
      satelliteLayerRef.current = null;
      conflictOverlayLayerRef.current = null;
    };
  }, [updateSatelliteTileLayer]);

  function zoom(delta: number) {
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!camera || !controls) {
      return;
    }

    const direction = camera.position.clone().normalize();
    const distance = camera.position.length();
    const nextDistance = THREE.MathUtils.clamp(
      distance + getAdaptiveZoomDelta(delta, distance),
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
    renderedSatelliteKeyRef.current = "";
    lastSatelliteLoadTimeRef.current = 0;
    prefetchedSatelliteKeysRef.current.clear();
    if (satelliteLayerRef.current) {
      disposeChildren(satelliteLayerRef.current);
      satelliteLayerRef.current.clear();
    }
    setZoomRenderState({
      latitude: 0,
      longitude: 0,
      level: "global",
      tileKey: "global",
      distance: 5.1,
      satelliteStatus: satelliteTileUrlTemplate ? "loading" : "fallback"
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
          {zoomRenderLabel(zoomRenderState)}
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
              <span className="earth-event-marker-shell">
                {meta.assetPath ? (
                  <Image
                    src={meta.assetPath}
                    alt=""
                    width={24}
                    height={24}
                    className="earth-event-marker-icon"
                  />
                ) : (
                  <span className="earth-event-marker-symbol" aria-hidden>
                    {meta.icon}
                  </span>
                )}
              </span>
              <span className="sr-only">{event.title}</span>
            </button>
          );
        })}
      </div>

      <div className="pointer-events-auto absolute right-3 top-24 z-30 flex flex-col gap-2 sm:right-4 xl:right-[430px]">
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

type SatelliteTilePlan = {
  zoom: number;
  radius: number;
};

type LoadedSatelliteTile = {
  tile: XyzTile;
  texture: THREE.Texture;
};

function applyAdaptiveControlSensitivity(
  controls: OrbitControls,
  distance: number
) {
  const rangeProgress = THREE.MathUtils.clamp(
    (distance - satelliteMinDistance) / (controls.maxDistance - satelliteMinDistance),
    0,
    1
  );
  const easedProgress = rangeProgress * rangeProgress * (3 - 2 * rangeProgress);

  controls.rotateSpeed = THREE.MathUtils.lerp(0.018, 0.42, easedProgress);
  controls.zoomSpeed = THREE.MathUtils.lerp(0.028, 0.58, easedProgress);
  controls.dampingFactor = THREE.MathUtils.lerp(0.16, 0.08, easedProgress);
}

function getAdaptiveZoomDelta(delta: number, distance: number) {
  const direction = Math.sign(delta) || 1;
  const surfaceDistance = Math.max(distance - globeRadius, 0.00016);
  const zoomScale = THREE.MathUtils.clamp(
    Math.pow(surfaceDistance / (6.2 - globeRadius), 1.25),
    0.0018,
    1
  );

  return direction * Math.abs(delta) * zoomScale;
}

function getSatelliteTilePlan(camera: THREE.PerspectiveCamera): SatelliteTilePlan | null {
  const distance = camera.position.length();

  if (distance > 6.25) {
    return null;
  }

  const surfaceDistance = Math.max(distance - globeRadius, 0.00006);
  const halfViewportWidth =
    surfaceDistance *
    Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) *
    Math.max(camera.aspect, 1);
  const visibleDegrees = Math.max(
    0.001,
    THREE.MathUtils.radToDeg(2 * Math.atan(halfViewportWidth / globeRadius)) * 1.45
  );
  const targetTilesAcross = 4;
  const targetTileDegrees = visibleDegrees / targetTilesAcross;
  const zoom = THREE.MathUtils.clamp(
    Math.floor(Math.log2(360 / targetTileDegrees)),
    3,
    19
  );

  return { zoom, radius: 2 };
}

type XyzTile = {
  x: number;
  y: number;
  z: number;
};

function latLngToXyzTile(latitude: number, longitude: number, zoom: number): XyzTile {
  const clampedLatitude = THREE.MathUtils.clamp(latitude, -85.05112878, 85.05112878);
  const latRad = THREE.MathUtils.degToRad(clampedLatitude);
  const tileCount = 2 ** zoom;
  const x = Math.floor(((normalizeLongitude(longitude) + 180) / 360) * tileCount);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      tileCount
  );

  return {
    x: wrapTileX(x, tileCount),
    y: THREE.MathUtils.clamp(y, 0, tileCount - 1),
    z: zoom
  };
}

async function loadSatelliteTileSet(
  centerTile: XyzTile,
  radius: number,
  textureCache: Map<string, THREE.Texture>,
  urlTemplate: string,
  anisotropy: number
) {
  const group = new THREE.Group();
  group.name = `satellite-tiles-z${centerTile.z}`;
  const loadedTiles = await loadSatelliteTileTextures(
    centerTile,
    radius,
    textureCache,
    urlTemplate,
    anisotropy
  );

  if (loadedTiles.length === 0) {
    throw new Error("No satellite tiles loaded");
  }

  const meshes = loadedTiles.map(({ tile, texture }) =>
    createSatelliteTileMesh(tile, texture)
  );
  group.add(...meshes);

  return group;
}

function createSatelliteTileList(centerTile: XyzTile, radius: number) {
  const tileCount = 2 ** centerTile.z;
  const tiles: XyzTile[] = [];

  for (let yOffset = -radius; yOffset <= radius; yOffset += 1) {
    for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
      const y = centerTile.y + yOffset;

      if (y < 0 || y >= tileCount) {
        continue;
      }

      tiles.push({
        z: centerTile.z,
        x: wrapTileX(centerTile.x + xOffset, tileCount),
        y
      });
    }
  }

  return tiles;
}

async function loadSatelliteTileTextures(
  centerTile: XyzTile,
  radius: number,
  textureCache: Map<string, THREE.Texture>,
  urlTemplate: string,
  anisotropy: number
) {
  const loadedTiles = await Promise.all(
    createSatelliteTileList(centerTile, radius).map(async (tile) => {
      try {
        const texture = await loadTileTexture(
          getTileUrl(urlTemplate, tile),
          textureCache,
          anisotropy
        );

        return { tile, texture };
      } catch {
        return null;
      }
    })
  );
  const tiles: LoadedSatelliteTile[] = [];

  for (const loadedTile of loadedTiles) {
    if (loadedTile) {
      tiles.push(loadedTile);
    }
  }

  return tiles;
}

async function prefetchSatelliteTileLevels(
  focus: SurfaceFocus,
  currentPlan: SatelliteTilePlan,
  prefetchedKeys: Set<string>,
  textureCache: Map<string, THREE.Texture>,
  urlTemplate: string,
  anisotropy: number
) {
  const plans = [currentPlan.zoom + 1, currentPlan.zoom + 2]
    .filter((zoom) => zoom <= 19)
    .map((zoom, index) => ({
      centerTile: latLngToXyzTile(focus.latitude, focus.longitude, zoom),
      radius: index === 0 ? 2 : 1
    }));

  for (const plan of plans) {
    const key = `prefetch:${plan.centerTile.z}:${plan.centerTile.x}:${plan.centerTile.y}:${plan.radius}`;

    if (prefetchedKeys.has(key)) {
      continue;
    }

    prefetchedKeys.add(key);

    try {
      await loadSatelliteTileTextures(
        plan.centerTile,
        plan.radius,
        textureCache,
        urlTemplate,
        anisotropy
      );
    } catch {
      prefetchedKeys.delete(key);
    }
  }
}

async function loadTileTexture(
  url: string,
  textureCache: Map<string, THREE.Texture>,
  anisotropy: number
) {
  const cachedTexture = textureCache.get(url);

  if (cachedTexture) {
    return cachedTexture;
  }

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  const texture = await loader.loadAsync(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = anisotropy;
  textureCache.set(url, texture);

  return texture;
}

function createSatelliteTileMesh(
  tile: XyzTile,
  texture: THREE.Texture
) {
  const bounds = xyzTileBounds(tile);
  const geometry = createTilePatchGeometry(
    bounds,
    tile.z >= 12 ? 32 : 18,
    globeRadius + satelliteTileOffset
  );
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    metalness: 0,
    roughness: 0.88,
    transparent: false,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 4;

  return mesh;
}

function createTilePatchGeometry(
  bounds: { north: number; south: number; west: number; east: number },
  segments: number,
  radius: number
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= segments; row += 1) {
    const v = row / segments;
    const latitude = bounds.north + (bounds.south - bounds.north) * v;

    for (let column = 0; column <= segments; column += 1) {
      const u = column / segments;
      const longitude = bounds.west + (bounds.east - bounds.west) * u;
      const position = latLngToVector3(latitude, longitude, radius);

      positions.push(position.x, position.y, position.z);
      uvs.push(u, 1 - v);
    }
  }

  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const a = row * (segments + 1) + column;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;

      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function xyzTileBounds(tile: XyzTile) {
  const tileCount = 2 ** tile.z;
  const west = (tile.x / tileCount) * 360 - 180;
  const east = ((tile.x + 1) / tileCount) * 360 - 180;
  const north = mercatorTileYToLatitude(tile.y, tileCount);
  const south = mercatorTileYToLatitude(tile.y + 1, tileCount);

  return { north, south, west, east };
}

function mercatorTileYToLatitude(y: number, tileCount: number) {
  return THREE.MathUtils.radToDeg(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / tileCount))));
}

function getTileUrl(urlTemplate: string, tile: XyzTile) {
  return urlTemplate
    .replaceAll("{z}", tile.z.toString())
    .replaceAll("{x}", tile.x.toString())
    .replaceAll("{y}", tile.y.toString());
}

function wrapTileX(x: number, tileCount: number) {
  return ((x % tileCount) + tileCount) % tileCount;
}

function getDetailTileKey(focus: SurfaceFocus, level: ZoomRenderLevel) {
  const cellSize = level === "local" ? 0.55 : 1.6;
  const latCell = Math.round(focus.latitude / cellSize);
  const lonCell = Math.round(focus.longitude / cellSize);

  return `${level}:${latCell}:${lonCell}`;
}

function createSurfaceLine(
  coordinates: SurfaceFocus[],
  color: number,
  opacity: number,
  altitude: number,
  lineWidth = 1
) {
  const points = coordinates.map((coordinate) =>
    latLngToVector3(coordinate.latitude, coordinate.longitude, globeRadius + altitude)
  );
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    linewidth: lineWidth,
    depthWrite: false
  });

  return new THREE.Line(geometry, material);
}

function syncConflictOverlayLayer(
  layer: THREE.Group,
  overlay?: ConflictOverlayData | null
) {
  disposeChildren(layer);
  layer.clear();

  if (!overlay) {
    return;
  }

  layer.add(createConflictOverlayLayer(overlay));
}

function createConflictOverlayLayer(overlay: ConflictOverlayData) {
  const group = new THREE.Group();
  group.name = "public-conflict-overlays";

  for (const borderLine of overlay.borderLines) {
    for (const ring of borderLine.rings) {
      if (ring.length < 3) {
        continue;
      }

      const line = createSurfaceLine(ring, 0xff2a2a, 0.9, 0.006, 1);
      line.name = `conflict-border-${borderLine.country}`;
      line.renderOrder = 7;
      group.add(line);
    }
  }

  for (const frontline of overlay.frontlines) {
    if (frontline.coordinates.length < 2) {
      continue;
    }

    const halo = createSurfaceLine(
      frontline.coordinates,
      0xff2a2a,
      0.28,
      0.01,
      2
    );
    halo.name = `${frontline.id}-halo`;
    halo.renderOrder = 8;
    group.add(halo);

    const line = createSurfaceLine(
      frontline.coordinates,
      0xff5a3d,
      0.96,
      0.012,
      2
    );
    line.name = frontline.id;
    line.renderOrder = 9;
    group.add(line);
  }

  return group;
}

function normalizeLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function zoomRenderLabel(state: ZoomRenderState) {
  if (state.satelliteStatus === "ready" && state.satelliteZoom) {
    return `Satellit Z${state.satelliteZoom} geladen`;
  }

  if (state.satelliteStatus === "loading" && state.satelliteZoom) {
    return `Satellit Z${state.satelliteZoom} wird geladen`;
  }

  if (state.satelliteStatus === "error") {
    return "Satellitenkacheln nicht verfügbar";
  }

  if (state.level === "local") {
    return "Lokaldetails nachgeladen";
  }

  if (state.level === "regional") {
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

function getFocusQuaternion(
  event: CrisisEvent,
  camera: THREE.PerspectiveCamera
) {
  const localPosition = latLngToVector3(
    event.latitude,
    event.longitude,
    globeRadius
  ).normalize();
  const cameraDirection = camera.position.clone().normalize();

  return new THREE.Quaternion().setFromUnitVectors(localPosition, cameraDirection);
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
