import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
  Clock,
} from 'three';

const ROAD_LENGTH = 84;
const ROAD_LIMIT = ROAD_LENGTH / 2;
const BUILDING_COLORS = [0x203f44, 0x295156, 0x1d363b, 0x315f66];
const CAR_COLORS = [0x78e0d6, 0xbefcf6, 0xf4fffd, 0x55bfc6, 0x1d9288];

function disposeMaterial(material) {
  if (!material) return;

  for (const key of Object.keys(material)) {
    const value = material[key];
    if (value && typeof value === 'object' && 'minFilter' in value) {
      value.dispose();
    }
  }

  material.dispose();
}

function createBuilding(width, height, depth, color, accent) {
  const group = new Group();

  const body = new Mesh(
    new BoxGeometry(width, height, depth),
    new MeshStandardMaterial({
      color,
      roughness: 0.92,
      metalness: 0.08,
    }),
  );
  body.position.y = height / 2;
  group.add(body);

  const cap = new Mesh(
    new CylinderGeometry(width * 0.58, width * 0.74, 0.52, 6),
    new MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.16,
      roughness: 0.72,
      metalness: 0.16,
    }),
  );
  cap.position.set(0, height + 0.36, 0);
  cap.rotation.y = Math.PI / 6;
  group.add(cap);

  return group;
}

function createServiceBay(color, trimColor, glowMaterials) {
  const group = new Group();

  const shell = new Mesh(
    new BoxGeometry(5.6, 2.9, 4.6),
    new MeshStandardMaterial({
      color,
      roughness: 0.9,
      metalness: 0.08,
    }),
  );
  shell.position.y = 1.45;
  group.add(shell);

  const roof = new Mesh(
    new BoxGeometry(6.1, 0.26, 5),
    new MeshStandardMaterial({
      color: 0x27334a,
      roughness: 0.72,
      metalness: 0.22,
    }),
  );
  roof.position.y = 2.96;
  group.add(roof);

  const apron = new Mesh(
    new BoxGeometry(6.8, 0.12, 2.1),
    new MeshStandardMaterial({
      color: 0x1a2132,
      roughness: 0.96,
      metalness: 0.02,
    }),
  );
  apron.position.set(0, 0.02, 3.15);
  group.add(apron);

  for (let index = -1; index <= 1; index += 1) {
    const shutter = new Mesh(
      new BoxGeometry(1.2, 1.7, 0.1),
      new MeshStandardMaterial({
        color: 0x101726,
        roughness: 0.95,
        metalness: 0.06,
      }),
    );
    shutter.position.set(index * 1.55, 1.05, 2.34);
    group.add(shutter);
  }

  const canopyMaterial = new MeshStandardMaterial({
    color: trimColor,
    emissive: trimColor,
    emissiveIntensity: 0.42,
    roughness: 0.64,
    metalness: 0.18,
  });
  glowMaterials.push(canopyMaterial);

  const canopy = new Mesh(
    new BoxGeometry(6.2, 0.18, 0.44),
    canopyMaterial,
  );
  canopy.position.set(0, 2.18, 2.4);
  group.add(canopy);

  const signPole = new Mesh(
    new BoxGeometry(0.22, 2.2, 0.22),
    new MeshStandardMaterial({
      color: 0x54637c,
      roughness: 0.7,
      metalness: 0.28,
    }),
  );
  signPole.position.set(-2.65, 1.5, 0.1);
  group.add(signPole);

  const signPanelMaterial = new MeshStandardMaterial({
    color: 0x162239,
    emissive: trimColor,
    emissiveIntensity: 0.34,
    roughness: 0.66,
    metalness: 0.16,
  });
  glowMaterials.push(signPanelMaterial);

  const signPanel = new Mesh(
    new BoxGeometry(1.4, 0.92, 0.12),
    signPanelMaterial,
  );
  signPanel.position.set(-2.65, 2.85, 0.1);
  group.add(signPanel);

  const wrenchStrokeMaterial = new MeshStandardMaterial({
    color: 0xf2efe5,
    emissive: 0xf2efe5,
    emissiveIntensity: 0.18,
    roughness: 0.58,
    metalness: 0.22,
  });

  const strokeA = new Mesh(
    new BoxGeometry(0.72, 0.1, 0.06),
    wrenchStrokeMaterial,
  );
  strokeA.position.set(-2.65, 2.85, 0.18);
  strokeA.rotation.z = Math.PI / 5.4;
  group.add(strokeA);

  const strokeB = new Mesh(
    new BoxGeometry(0.38, 0.1, 0.06),
    wrenchStrokeMaterial,
  );
  strokeB.position.set(-2.48, 3.03, 0.18);
  strokeB.rotation.z = -Math.PI / 3.4;
  group.add(strokeB);

  const strokeC = new Mesh(
    new BoxGeometry(0.38, 0.1, 0.06),
    wrenchStrokeMaterial,
  );
  strokeC.position.set(-2.82, 2.67, 0.18);
  strokeC.rotation.z = -Math.PI / 3.4;
  group.add(strokeC);

  return group;
}

function createCar(color) {
  const car = new Group();

  const chassis = new Mesh(
    new BoxGeometry(1.4, 0.38, 2.6),
    new MeshStandardMaterial({
      color,
      roughness: 0.42,
      metalness: 0.32,
    }),
  );
  chassis.position.y = 0.46;
  car.add(chassis);

  const roof = new Mesh(
    new BoxGeometry(1.02, 0.36, 1.18),
    new MeshStandardMaterial({
      color: 0xd9e6ff,
      roughness: 0.28,
      metalness: 0.38,
      transparent: true,
      opacity: 0.84,
    }),
  );
  roof.position.set(0, 0.78, -0.12);
  car.add(roof);

  const bumper = new Mesh(
    new BoxGeometry(1.1, 0.18, 0.28),
    new MeshStandardMaterial({
      color: 0x0c1220,
      roughness: 0.68,
      metalness: 0.24,
    }),
  );
  bumper.position.set(0, 0.33, 1.25);
  car.add(bumper);

  const wheelGeometry = new CylinderGeometry(0.26, 0.26, 0.24, 12);
  const wheelMaterial = new MeshStandardMaterial({
    color: 0x0b0f19,
    roughness: 0.94,
    metalness: 0.12,
  });
  const wheelOffsets = [
    [-0.76, 0.26, 0.9],
    [0.76, 0.26, 0.9],
    [-0.76, 0.26, -0.92],
    [0.76, 0.26, -0.92],
  ];

  wheelOffsets.forEach(([x, y, z]) => {
    const wheel = new Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    car.add(wheel);
  });

  return car;
}

function addRoadLaneMarkers(parent, x, material, markers) {
  for (let index = 0; index < 11; index += 1) {
    const marker = new Mesh(
      new BoxGeometry(0.14, 0.03, 2.8),
      material,
    );
    marker.position.set(x, 0.05, -ROAD_LIMIT + (index * 8.4));
    parent.add(marker);
    markers.push(marker);
  }
}

export default function MechanicBackdrop() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host || typeof window === 'undefined' || !window.WebGLRenderingContext) {
      return undefined;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'wt-home-scene-canvas';
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = SRGBColorSpace;
    }
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    scene.fog = new Fog(0x143437, 18, 74);

    const camera = new PerspectiveCamera(42, 1, 0.1, 180);
    camera.position.set(0, 14, 27);
    camera.lookAt(0, 2.4, 2);

    const world = new Group();
    world.rotation.y = -0.16;
    scene.add(world);

    scene.add(new AmbientLight(0xe8fff9, 1.7));

    const warmKey = new DirectionalLight(0xf5fffd, 2.15);
    warmKey.position.set(18, 22, 10);
    scene.add(warmKey);

    const coolRim = new PointLight(0x88f1e6, 28, 96, 2);
    coolRim.position.set(-16, 12, 14);
    scene.add(coolRim);

    const shopGlow = new PointLight(0x4ecfc0, 24, 34, 2);
    shopGlow.position.set(6, 4.2, 2);
    scene.add(shopGlow);

    const ground = new Mesh(
      new PlaneGeometry(80, 112),
      new MeshStandardMaterial({
        color: 0x132d30,
        roughness: 1,
        metalness: 0,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.08;
    world.add(ground);

    const boulevard = new Mesh(
      new BoxGeometry(9, 0.08, ROAD_LENGTH),
      new MeshStandardMaterial({
        color: 0x173237,
        roughness: 0.94,
        metalness: 0.08,
      }),
    );
    boulevard.position.set(0, 0.02, 0);
    world.add(boulevard);

    const sideStreet = new Mesh(
      new BoxGeometry(5.1, 0.08, ROAD_LENGTH * 0.78),
      new MeshStandardMaterial({
        color: 0x1a3a3d,
        roughness: 0.94,
        metalness: 0.08,
      }),
    );
    sideStreet.position.set(13.5, 0.02, -2.6);
    sideStreet.rotation.y = 0.08;
    world.add(sideStreet);

    const laneMarkers = [];
    const laneMarkerMaterial = new MeshStandardMaterial({
      color: 0xe4fffb,
      emissive: 0x4fa49a,
      emissiveIntensity: 0.34,
      roughness: 0.7,
      metalness: 0.14,
    });

    addRoadLaneMarkers(world, -2.25, laneMarkerMaterial, laneMarkers);
    addRoadLaneMarkers(world, 2.25, laneMarkerMaterial, laneMarkers);

    const glowMaterials = [laneMarkerMaterial];

    const parkingLot = new Mesh(
      new BoxGeometry(9.6, 0.06, 8.8),
      new MeshStandardMaterial({
        color: 0x193337,
        roughness: 0.96,
        metalness: 0.05,
      }),
    );
    parkingLot.position.set(-13.6, 0.01, 6.4);
    world.add(parkingLot);

    const serviceHub = createServiceBay(0x21474d, 0x8ff3e8, glowMaterials);
    serviceHub.position.set(-13.8, 0, 5.2);
    serviceHub.rotation.y = Math.PI / 2;
    world.add(serviceHub);

    const cornerShop = createServiceBay(0x244e55, 0x49cfc0, glowMaterials);
    cornerShop.position.set(12.4, 0, -10.2);
    cornerShop.rotation.y = -Math.PI / 2 - 0.08;
    cornerShop.scale.setScalar(0.92);
    world.add(cornerShop);

    const skyline = new Group();
    world.add(skyline);

    const sideDirections = [-1, 1];
    sideDirections.forEach((direction) => {
      for (let index = 0; index < 7; index += 1) {
        const width = 2.6 + ((index % 3) * 0.55);
        const height = 3.8 + ((index * 1.05) % 5.2);
        const depth = 3.2 + ((index % 4) * 0.65);
        const building = createBuilding(
          width,
          height,
          depth,
          BUILDING_COLORS[(index + (direction > 0 ? 1 : 0)) % BUILDING_COLORS.length],
          direction > 0 ? 0x89f4e7 : 0x53c9bc,
        );
        building.position.set(
          direction * (10.8 + ((index % 2) * 3.5)),
          0,
          -26 + (index * 8.2),
        );
        building.rotation.y = direction > 0 ? -0.22 : 0.22;
        skyline.add(building);
      }
    });

    for (let index = 0; index < 6; index += 1) {
      const distant = createBuilding(
        4.6 + (index % 3),
        6.5 + ((index * 1.35) % 4.5),
        5 + (index % 2),
        0x193338,
        0x4d8f8b,
      );
      distant.position.set(-23 + (index * 8.6), 0, -30 - (index % 2 ? 6 : 0));
      distant.rotation.y = 0.08 * (index - 2);
      distant.scale.y = 1.2 + (index % 2) * 0.35;
      world.add(distant);
    }

    const medianLights = [];
    for (let index = 0; index < 7; index += 1) {
      const post = new Group();
      const stem = new Mesh(
        new BoxGeometry(0.08, 1.4, 0.08),
        new MeshStandardMaterial({
          color: 0x89a8a5,
          roughness: 0.68,
          metalness: 0.28,
        }),
      );
      stem.position.y = 0.72;
      post.add(stem);

      const orbMaterial = new MeshStandardMaterial({
        color: 0xf8fffd,
        emissive: 0x83f3e7,
        emissiveIntensity: 0.54,
        roughness: 0.36,
        metalness: 0.12,
      });
      glowMaterials.push(orbMaterial);
      medianLights.push(orbMaterial);

      const orb = new Mesh(
        new SphereGeometry(0.14, 14, 14),
        orbMaterial,
      );
      orb.position.y = 1.46;
      post.add(orb);

      post.position.set(index % 2 === 0 ? -5.1 : 5.1, 0, -ROAD_LIMIT + (index * 12.8));
      world.add(post);
    }

    const cars = [];
    const laneConfigs = [
      { x: -3.25, speed: 7.8, direction: 1, z: -32 },
      { x: -1.2, speed: 8.7, direction: -1, z: 18 },
      { x: 1.2, speed: 9.3, direction: 1, z: -8 },
      { x: 3.25, speed: 7.5, direction: -1, z: 33 },
      { x: 12.9, speed: 5.6, direction: 1, z: -24, angle: 0.08 },
    ];

    laneConfigs.forEach((lane, index) => {
      const car = createCar(CAR_COLORS[index % CAR_COLORS.length]);
      car.position.set(lane.x, 0.04, lane.z);
      car.rotation.y = lane.direction > 0 ? 0 : Math.PI;
      if (lane.angle) {
        car.rotation.y += lane.direction > 0 ? lane.angle : -lane.angle;
      }
      car.userData = {
        baseY: 0.04 + ((index % 2) * 0.02),
        direction: lane.direction,
        minZ: -ROAD_LIMIT - 8,
        maxZ: ROAD_LIMIT + 8,
        phase: index * 0.9,
        speed: lane.speed,
      };
      world.add(car);
      cars.push(car);
    });

    const parkedCar = createCar(0x62d4ff);
    parkedCar.position.set(-12.8, 0.04, 8.8);
    parkedCar.rotation.y = -Math.PI / 2;
    parkedCar.scale.setScalar(0.94);
    world.add(parkedCar);

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;

      if (!width || !height) return;

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(() => {
      resize();
    });
    observer.observe(host);
    resize();

    let frameId = 0;
    const clock = new Clock();

    const renderScene = () => {
      const delta = Math.min(clock.getDelta(), 0.033);
      const elapsed = clock.elapsedTime;

      world.rotation.y = -0.16 + (Math.sin(elapsed * 0.18) * 0.028);
      camera.position.x = Math.sin(elapsed * 0.12) * 1.1;
      camera.position.y = 14 + (Math.sin(elapsed * 0.1) * 0.35);
      camera.lookAt(0, 2.6, 2);

      laneMarkers.forEach((marker, index) => {
        marker.position.z += delta * (index % 2 === 0 ? 3.2 : 4.1);
        if (marker.position.z > ROAD_LIMIT + 3) {
          marker.position.z = -ROAD_LIMIT - 3;
        }
      });

      cars.forEach((car) => {
        const { direction, minZ, maxZ, phase, speed, baseY } = car.userData;
        car.position.z += delta * speed * direction;
        if (car.position.z > maxZ) car.position.z = minZ;
        if (car.position.z < minZ) car.position.z = maxZ;
        car.position.y = baseY + (Math.sin((elapsed * 3.2) + phase) * 0.03);
        car.rotation.z = Math.sin((elapsed * 1.8) + phase) * 0.008;
      });

      glowMaterials.forEach((material, index) => {
        material.emissiveIntensity = 0.24 + (Math.sin((elapsed * 1.35) + (index * 0.55)) * 0.12);
      });

      medianLights.forEach((material, index) => {
        material.emissiveIntensity = 0.44 + (Math.sin((elapsed * 1.85) + (index * 0.7)) * 0.16);
      });

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(renderScene);
    };

    if (reducedMotion) {
      renderer.render(scene, camera);
    } else {
      renderScene();
    }

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      observer.disconnect();

      const seenGeometries = new Set();
      const seenMaterials = new Set();

      scene.traverse((object) => {
        if (!object.isMesh) return;

        if (object.geometry && !seenGeometries.has(object.geometry)) {
          seenGeometries.add(object.geometry);
          object.geometry.dispose();
        }

        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (!material || seenMaterials.has(material)) return;
          seenMaterials.add(material);
          disposeMaterial(material);
        });
      });

      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={hostRef} className="wt-home-scene" aria-hidden="true" />;
}
