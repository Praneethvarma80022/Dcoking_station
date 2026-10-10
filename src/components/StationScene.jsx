import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useMachine } from '@/services/machineStore';

const GREEN = 0x8ea38c;
const GREEN_DARK = 0x71836c;
const FOIL = 0xd9d9cf;
const BLACK = 0x15181c;
const STEEL = 0xb9bfc6;
const DARK_PANEL = 0x1a1e23;
const DARK_METAL = 0x2a2e33;
const WIRE_RED = 0xc23b22;
const WHEEL = 0xc77b3a;

const Y_BASE = 0.56;
const ARM_LEN = 2.2;

const PRESETS = {
  '3D': { pos: new THREE.Vector3(6.4, 4.4, 7.8), target: new THREE.Vector3(0, 1.3, 0) },
  'OUTSIDE': { pos: new THREE.Vector3(6.4, 4.4, 7.8), target: new THREE.Vector3(0, 1.3, 0) },
  'INSIDE': { pos: new THREE.Vector3(0, 1.9, 5.6), target: new THREE.Vector3(0, 1.5, -0.2) },
};

export default function StationScene({ preset, showInternal }) {
  const mountRef = useRef(null);
  const { machine: stateRef } = useMachine();
  const showInternalRef = useRef(showInternal);
  showInternalRef.current = showInternal;

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0e12);
    scene.fog = new THREE.Fog(0x0b0e12, 16, 42);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.copy(PRESETS['3D'].pos);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.target.copy(PRESETS['3D'].target);

    // ---- Lights ----
    scene.add(new THREE.AmbientLight(0x9aa5b1, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(6, 10, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x93a7ff, 0.4);
    rim.position.set(-6, 5, -5);
    scene.add(rim);
    const inner = new THREE.PointLight(0xfff0dd, 0.9, 8);
    inner.position.set(0, 1.8, 0.3);
    scene.add(inner);

    // ---- Ground ----
    const grid = new THREE.GridHelper(34, 34, 0x1e293b, 0x111827);
    scene.add(grid);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.001;
    scene.add(floor);

    // ---- Materials ----
    const greenMat = new THREE.MeshStandardMaterial({ color: GREEN, roughness: 0.55, metalness: 0.25 });
    const greenDarkMat = new THREE.MeshStandardMaterial({ color: GREEN_DARK, roughness: 0.55, metalness: 0.25 });
    const foilMat = new THREE.MeshStandardMaterial({ color: FOIL, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide });
    const blackMat = new THREE.MeshStandardMaterial({ color: BLACK, roughness: 0.4, metalness: 0.5 });
    const steelMat = new THREE.MeshStandardMaterial({ color: STEEL, roughness: 0.25, metalness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: DARK_METAL, roughness: 0.5, metalness: 0.6 });
    const panelMat = new THREE.MeshPhysicalMaterial({ color: 0x6b7a6c, transparent: true, opacity: 0.5, roughness: 0.06, metalness: 0.1, emissive: 0x0ea5e9, emissiveIntensity: 0 });
    const redMat = new THREE.MeshStandardMaterial({ color: WIRE_RED, roughness: 0.6 });

    // ---- Casters ----
    const casterGeoB = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const casterGeoW = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 24);
    const wheelMat = new THREE.MeshStandardMaterial({ color: WHEEL, roughness: 0.5 });
    [[-1.95, -1.05], [1.95, -1.05], [-1.95, 1.05], [1.95, 1.05]].forEach(([x, z]) => {
      const c = new THREE.Group();
      const bracket = new THREE.Mesh(casterGeoB, darkMat);
      bracket.position.y = 0.29;
      const wheel = new THREE.Mesh(casterGeoW, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.y = 0.11;
      c.add(bracket, wheel);
      c.position.set(x, 0, z);
      scene.add(c);
    });

    // ---- Cabinet shell ----
    const shell = new THREE.Group();
    scene.add(shell);

    // base frame + floor pan (always visible)
    const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.25, 2.9), greenMat);
    baseFrame.position.y = 0.395;
    scene.add(baseFrame);
    const floorPan = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 2.5), darkMat);
    floorPan.position.y = 0.535;
    scene.add(floorPan);

    // corner posts
    const postGeo = new THREE.BoxGeometry(0.1, 2.0, 0.1);
    [[-2.25, -1.4], [2.25, -1.4], [-2.25, 1.4], [2.25, 1.4]].forEach(([x, z]) => {
      const post = new THREE.Mesh(postGeo, greenDarkMat);
      post.position.set(x, 1.55, z);
      shell.add(post);
    });

    // center front post (divides the two bays)
    const centerPost = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.0, 0.1), greenDarkMat);
    centerPost.position.set(0, 1.55, 1.4);
    shell.add(centerPost);

    // walls (green outside)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.0, 0.06), greenMat);
    backWall.position.set(0, 1.55, -1.42);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 2.9), greenMat);
    leftWall.position.set(-2.27, 1.55, 0);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 2.9), greenMat);
    rightWall.position.set(2.27, 1.55, 0);
    shell.add(backWall, leftWall, rightWall);

    // foil interior lining
    const foilBack = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.9, 0.02), foilMat);
    foilBack.position.set(0, 1.55, -1.38);
    const foilLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.9, 2.8), foilMat);
    foilLeft.position.set(-2.22, 1.55, 0);
    const foilRight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.9, 2.8), foilMat);
    foilRight.position.set(2.22, 1.55, 0);
    shell.add(foilBack, foilLeft, foilRight);

    // top rim + lid slide rails
    // top rim as an open frame so the platform is visible when the lid opens
    const rimXGeo = new THREE.BoxGeometry(4.6, 0.18, 0.2);
    [1.35, -1.35].forEach((z) => {
      const bar = new THREE.Mesh(rimXGeo, greenMat);
      bar.position.set(0, 2.64, z);
      shell.add(bar);
    });
    const rimZGeo = new THREE.BoxGeometry(0.2, 0.18, 2.5);
    [2.2, -2.2].forEach((x) => {
      const bar = new THREE.Mesh(rimZGeo, greenMat);
      bar.position.set(x, 2.64, 0);
      shell.add(bar);
    });
    const lidRailGeo = new THREE.BoxGeometry(4.55, 0.04, 0.06);
    const lidRailL = new THREE.Mesh(lidRailGeo, steelMat);
    lidRailL.position.set(0, 2.76, -1.24);
    const lidRailR = new THREE.Mesh(lidRailGeo, steelMat);
    lidRailR.position.set(0, 2.76, 1.24);
    shell.add(lidRailL, lidRailR);

    // top lid — two sliding halves (left & right), driven by DOOR
    const lidLGroup = new THREE.Group();
    const lidL = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.12, 2.6), blackMat);
    lidL.position.set(-1.075, 2.82, 0);
    lidLGroup.add(lidL);
    shell.add(lidLGroup);
    const lidRGroup = new THREE.Group();
    const lidR = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.12, 2.6), blackMat);
    lidR.position.set(1.075, 2.82, 0);
    lidRGroup.add(lidR);
    shell.add(lidRGroup);

    // side doors — hinged, swung open (static, like the reference)
    const sideDoors = [];
    const doorPanelMat = new THREE.MeshStandardMaterial({ color: 0x96a495, roughness: 0.6, metalness: 0.15 });
    const mkDoor = (hingeX, rotY) => {
      const g = new THREE.Group();
      // solid full-face panel — extends from the corner hinge to the center
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.95, 0.05), doorPanelMat);
      panel.position.set(hingeX < 0 ? 1.1 : -1.1, 0, 0);
      // long vertical black handle with grip block
      const hx = hingeX < 0 ? 1.65 : -1.65;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.05), blackMat);
      handle.position.set(hx, 0.05, 0.05);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.07), blackMat);
      grip.position.set(hx, -0.15, 0.06);
      g.add(panel, handle, grip);
      g.position.set(hingeX, 1.55, 1.42);
      g.rotation.y = rotY;
      shell.add(g);
      sideDoors.push({ g, openRot: rotY });
    };
    mkDoor(-2.25, -1.92); // left door swung out front-left
    mkDoor(2.25, 1.92);   // right door swung out front-right

    // ---- Scissor cross-lift (two bays) ----
    const armGeo = new THREE.BoxGeometry(0.05, 0.08, ARM_LEN);
    const arms = [];
    [-0.9, 0.9].forEach((x0) => {
      const a1 = new THREE.Mesh(armGeo, steelMat);
      const a2 = new THREE.Mesh(armGeo, steelMat);
      a1.position.set(x0, Y_BASE, 0);
      a2.position.set(x0, Y_BASE, 0);
      const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 12), darkMat);
      pivot.rotation.z = Math.PI / 2;
      pivot.position.set(x0, Y_BASE, 0);
      scene.add(a1, a2, pivot);
      arms.push({ a1, a2, pivot, x0 });
    });
    // lift motors
    [-0.9, 0.9].forEach((x0) => {
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 20), darkMat);
      motor.rotation.x = Math.PI / 2;
      motor.position.set(x0, Y_BASE + 0.1, 0.95);
      scene.add(motor);
    });

    // ---- Platform (rides on the scissor) ----
    const platform = new THREE.Group();
    platform.position.y = Y_BASE;

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.4, metalness: 0.7 });

    const silverMat = new THREE.MeshStandardMaterial({ color: 0xc8cdd3, roughness: 0.3, metalness: 0.85 });
    const motorRedMat = new THREE.MeshStandardMaterial({ color: 0xc23b22, roughness: 0.5 });

    // supporting base plate
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.06, 2.1), frameMat);
    basePlate.position.y = 0.03;
    platform.add(basePlate);

    // green outer tray with chamfered corners (like the reference)
    const trayGeoX = new THREE.BoxGeometry(3.9, 0.1, 0.18);
    [0.96, -0.96].forEach((z) => {
      const bar = new THREE.Mesh(trayGeoX, greenMat);
      bar.position.set(0, 0.11, z);
      platform.add(bar);
    });
    const trayGeoZ = new THREE.BoxGeometry(0.18, 0.1, 1.74);
    [1.86, -1.86].forEach((x) => {
      const bar = new THREE.Mesh(trayGeoZ, greenMat);
      bar.position.set(x, 0.11, 0);
      platform.add(bar);
    });
    const wedgeGeo = new THREE.BoxGeometry(0.16, 0.1, 0.16);
    [[1.8, 0.9], [1.8, -0.9], [-1.8, 0.9], [-1.8, -0.9]].forEach(([x, z]) => {
      const w = new THREE.Mesh(wedgeGeo, greenMat);
      w.position.set(x, 0.11, z);
      w.rotation.y = Math.PI / 4;
      platform.add(w);
    });
    // small bolt heads on the tray
    const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8);
    [[-1.2, 0.96], [1.2, 0.96], [-1.2, -0.96], [1.2, -0.96], [1.86, 0.4], [1.86, -0.4], [-1.86, 0.4], [-1.86, -0.4]].forEach(([x, z]) => {
      const bolt = new THREE.Mesh(boltGeo, silverMat);
      bolt.position.set(x, 0.165, z);
      platform.add(bolt);
    });

    // dark inner frame around the glass
    const innerXGeo = new THREE.BoxGeometry(3.5, 0.08, 0.14);
    [0.79, -0.79].forEach((z) => {
      const bar = new THREE.Mesh(innerXGeo, frameMat);
      bar.position.set(0, 0.1, z);
      platform.add(bar);
    });
    const innerZGeo = new THREE.BoxGeometry(0.14, 0.08, 1.44);
    [1.68, -1.68].forEach((x) => {
      const bar = new THREE.Mesh(innerZGeo, frameMat);
      bar.position.set(x, 0.1, 0);
      platform.add(bar);
    });

    // glass docking surface
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 1.38), panelMat);
    panel.position.y = 0.1;
    platform.add(panel);

    // front & back edge assemblies: guide rail + long lead screw + carriages
    const railHGeo = new THREE.BoxGeometry(3.3, 0.035, 0.05);
    const screwHGeo = new THREE.CylinderGeometry(0.022, 0.022, 3.2, 10);
    const motorGeoH = new THREE.CylinderGeometry(0.07, 0.07, 0.2, 16);
    const redRingGeo = new THREE.CylinderGeometry(0.073, 0.073, 0.025, 16);
    const carriageGeoS = new THREE.BoxGeometry(0.15, 0.06, 0.1);
    const plateGeoS = new THREE.BoxGeometry(0.22, 0.08, 0.13);
    [0.86, -0.86].forEach((z) => {
      const rail = new THREE.Mesh(railHGeo, frameMat);
      rail.position.set(0, 0.155, z - 0.07 * Math.sign(z));
      platform.add(rail);
      const screw = new THREE.Mesh(screwHGeo, steelMat);
      screw.rotation.z = Math.PI / 2;
      screw.position.set(0, 0.155, z);
      platform.add(screw);
      [1.72, -1.72].forEach((x) => {
        const motor = new THREE.Mesh(motorGeoH, darkMat);
        motor.rotation.z = Math.PI / 2;
        motor.position.set(x, 0.155, z);
        platform.add(motor);
        const ring = new THREE.Mesh(redRingGeo, motorRedMat);
        ring.rotation.z = Math.PI / 2;
        ring.position.set(x - 0.11 * Math.sign(x), 0.155, z);
        platform.add(ring);
      });
      const plate = new THREE.Mesh(plateGeoS, silverMat);
      plate.position.set(0, 0.175, z);
      platform.add(plate);
    });

    // left & right edge assemblies: dual round rails + bearing blocks
    const railVGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.6, 10);
    const bearingGeoV = new THREE.BoxGeometry(0.07, 0.05, 0.09);
    [1.5, -1.5].forEach((x) => {
      [0.06, -0.06].forEach((dx) => {
        const rail = new THREE.Mesh(railVGeo, steelMat);
        rail.rotation.x = Math.PI / 2;
        rail.position.set(x + dx, 0.15, 0);
        platform.add(rail);
        [0.5, -0.5].forEach((z) => {
          const b = new THREE.Mesh(bearingGeoV, darkMat);
          b.position.set(x + dx, 0.16, z);
          platform.add(b);
        });
      });
    });

    // four centering rods forming a rectangle — CENTER squeezes inward, GET BACK spreads out
    // X-rods (front/back) ride the side rails and move along Z
    const xRods = [1, -1].map((sz) => {
      const g = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.06, 0.07), steelMat);
      g.add(rod);
      [1.5, -1.5].forEach((x) => {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.12), silverMat);
        c.position.set(x, 0, 0);
        g.add(c);
      });
      g.position.y = 0.2;
      platform.add(g);
      return { g, sz };
    });
    // Z-rods (left/right) ride the front/back lead screws and move along X
    const zRods = [1, -1].map((sx) => {
      const g = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 1.72), steelMat);
      g.add(rod);
      [0.86, -0.86].forEach((z) => {
        const c = new THREE.Mesh(carriageGeoS, silverMat);
        c.position.set(0, -0.02, z);
        g.add(c);
      });
      g.position.y = 0.25;
      platform.add(g);
      return { g, sx };
    });

    scene.add(platform);

    // The drone is a digital twin: telemetry owns its transform whenever HM30 data is live.
    const droneGroup = new THREE.Group();
    const droneBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.28), blackMat);
    const droneNose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 4), steelMat);
    droneNose.rotation.z = -Math.PI / 2;
    droneNose.position.x = 0.34;
    droneGroup.add(droneBody, droneNose);
    [[-0.32, -0.24], [-0.32, 0.24], [0.32, -0.24], [0.32, 0.24]].forEach(([x, z]) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.05), steelMat);
      arm.position.set(x / 2, 0, z / 2);
      arm.rotation.y = Math.atan2(z, x);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 20), redMat);
      rotor.rotation.x = Math.PI / 2;
      rotor.position.set(x, 0.06, z);
      droneGroup.add(arm, rotor);
    });
    droneGroup.position.set(0, 1.8, 0);
    scene.add(droneGroup);

    // ---- Preset transitions ----
    const desiredPos = PRESETS['3D'].pos.clone();
    const desiredTarget = PRESETS['3D'].target.clone();
    let transitioning = false;
    mount._applyPreset = (p) => {
      const t = PRESETS[p] || PRESETS['3D'];
      desiredPos.copy(t.pos);
      desiredTarget.copy(t.target);
      transitioning = true;
    };
    controls.addEventListener('start', () => { transitioning = false; });

    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const s = stateRef.current;
      if (s) {
        // Two top door halves slide apart with DOOR position
        const open = (s.door.position / 100) * 2.15;
        lidLGroup.position.x = -open;
        lidRGroup.position.x = open;

        // Side doors swing open/closed with DOOR position
        const sd = s.door.position / 100;
        sideDoors.forEach(({ g, openRot }) => { g.rotation.y = openRot * sd; });

        // Scissor kinematics from CROSS position
        const theta = THREE.MathUtils.degToRad(8 + (s.platform.position / 100) * 37);
        const h = ARM_LEN * Math.sin(theta);
        arms.forEach(({ a1, a2, pivot, x0 }) => {
          a1.rotation.x = theta;
          a2.rotation.x = -theta;
          a1.position.y = Y_BASE + h / 2;
          a2.position.y = Y_BASE + h / 2;
          pivot.position.y = Y_BASE + h / 2;
        });
        platform.position.y = Y_BASE + h;

        // Rectangular rods: centered at 100, back at 0
        // Four rods: open at 0 (edges), centered at 100 (squeezed toward middle)
        const c = s.glass.position / 100;
        xRods.forEach(({ g, sz }) => { g.position.z = sz * (0.7 - 0.42 * c); });
        zRods.forEach(({ g, sx }) => { g.position.x = sx * (1.45 - 0.95 * c); });

        // Charging glow on the platform panel
        panelMat.emissiveIntensity = s.charging.active ? 0.35 : 0;

        const telemetryDrone = s.drone;
        const droneLive = s.hardwareTelemetry && telemetryDrone?.connected;
        droneGroup.visible = !s.hardwareTelemetry || droneLive;
        if (droneGroup.visible) {
          const latitude = Number(telemetryDrone?.latitude);
          const longitude = Number(telemetryDrone?.longitude);
          const hasGps = Number.isFinite(latitude) && Number.isFinite(longitude);
          if (!droneLive || !hasGps) {
            droneGroup.position.set(0, Y_BASE + h + 0.8, 0);
          } else {
            const homeLatitude = Number.isFinite(s.droneHomeLatitude) ? s.droneHomeLatitude : latitude;
            const homeLongitude = Number.isFinite(s.droneHomeLongitude) ? s.droneHomeLongitude : longitude;
            const eastMeters = (longitude - homeLongitude) * 111320 * Math.cos(latitude * Math.PI / 180);
            const northMeters = (latitude - homeLatitude) * 110540;
            droneGroup.position.set(eastMeters * 0.05, Y_BASE + h + 0.8 + Math.max(0, Number(telemetryDrone.altitude) || 0) * 0.05, -northMeters * 0.05);
          }
          droneGroup.rotation.set(Number(telemetryDrone.pitch) || 0, ((Number(telemetryDrone.heading) || 0) * Math.PI) / 180, Number(telemetryDrone.roll) || 0);
          droneBody.material = telemetryDrone.armed ? redMat : blackMat;
        }

        // INTERNAL toggle: cutaway shell
        shell.visible = !showInternalRef.current;
      }

      if (transitioning) {
        camera.position.lerp(desiredPos, 0.08);
        controls.target.lerp(desiredTarget, 0.08);
        if (camera.position.distanceTo(desiredPos) < 0.05) transitioning = false;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth;
      const h2 = mount.clientHeight;
      camera.aspect = w / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h2);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((mm) => mm.dispose());
          else obj.material.dispose();
        }
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (mountRef.current && mountRef.current._applyPreset) mountRef.current._applyPreset(preset);
  }, [preset]);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
}