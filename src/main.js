import * as THREE from "three";
import "./styles.css";

const MAX_PIXEL_RATIO = 2;
const PRIMARY_COLORS = {
  red: "#ff2d2d",
  yellow: "#ffe000",
  blue: "#1f6bff",
};
const MIXED_COLORS = {
  orange: "#ff8a00",
  purple: "#8a2be2",
  green: "#19c24a",
  brown: "#76513a",
  gray: "#777a78",
};

const MIX_PAIRS = [
  [PRIMARY_COLORS.red, PRIMARY_COLORS.yellow, MIXED_COLORS.orange],
  [PRIMARY_COLORS.red, PRIMARY_COLORS.blue, MIXED_COLORS.purple],
  [PRIMARY_COLORS.yellow, PRIMARY_COLORS.blue, MIXED_COLORS.green],
  [MIXED_COLORS.green, MIXED_COLORS.purple, MIXED_COLORS.brown],
  [PRIMARY_COLORS.red, MIXED_COLORS.green, MIXED_COLORS.gray],
  [PRIMARY_COLORS.blue, MIXED_COLORS.orange, MIXED_COLORS.brown],
  [PRIMARY_COLORS.yellow, MIXED_COLORS.purple, "#806445"],
  [PRIMARY_COLORS.red, MIXED_COLORS.orange, "#ff572f"],
  [PRIMARY_COLORS.yellow, MIXED_COLORS.orange, "#ffb400"],
  [PRIMARY_COLORS.blue, MIXED_COLORS.purple, "#5740d8"],
  [PRIMARY_COLORS.yellow, MIXED_COLORS.green, "#78d52f"],
  [PRIMARY_COLORS.blue, MIXED_COLORS.green, "#168f91"],
  [PRIMARY_COLORS.red, MIXED_COLORS.purple, "#d62d88"],
  [MIXED_COLORS.orange, MIXED_COLORS.green, "#7f8c3a"],
  [MIXED_COLORS.orange, MIXED_COLORS.purple, "#835065"],
];
const MIX_RESULTS = new Map(
  MIX_PAIRS.map(([first, second, result]) => [[first, second].sort().join("|"), result]),
);
function lookupMix(first, second) {
  if (first === second) return first;
  if ([first, second].includes(MIXED_COLORS.gray)) return MIXED_COLORS.gray;
  if ([first, second].includes(MIXED_COLORS.brown)) return MIXED_COLORS.brown;
  const key = [first, second].sort().join("|");
  if (MIX_RESULTS.has(key)) return MIX_RESULTS.get(key);

  const mixed = new THREE.Color(first).lerp(new THREE.Color(second), 0.5);
  const hsl = {};
  mixed.getHSL(hsl);
  mixed.setHSL(hsl.h, hsl.s * 0.42, Math.min(hsl.l * 0.78, 0.48));
  return `#${mixed.getHexString()}`;
}

const BUBBLE_LEVELS = [
  {
    title: "红色 + 黄色",
    hint: "推动两个泡泡，让它们融合成橙色",
    colors: [PRIMARY_COLORS.red, PRIMARY_COLORS.yellow],
    result: MIXED_COLORS.orange,
  },
  {
    title: "红色 + 蓝色",
    hint: "推动两个泡泡，让它们融合成紫色",
    colors: [PRIMARY_COLORS.red, PRIMARY_COLORS.blue],
    result: MIXED_COLORS.purple,
  },
  {
    title: "黄色 + 蓝色",
    hint: "推动两个泡泡，让它们融合成绿色",
    colors: [PRIMARY_COLORS.yellow, PRIMARY_COLORS.blue],
    result: MIXED_COLORS.green,
  },
  {
    title: "三原色",
    hint: "推动任意两个泡泡，观察它们融合出新的颜色",
    colors: [PRIMARY_COLORS.red, PRIMARY_COLORS.yellow, PRIMARY_COLORS.blue],
  },
  {
    title: "自由泡泡空间",
    hint: "用身体自由推动多个泡泡，观察连续混色",
    colors: [
      PRIMARY_COLORS.red,
      PRIMARY_COLORS.yellow,
      PRIMARY_COLORS.blue,
      PRIMARY_COLORS.yellow,
      PRIMARY_COLORS.blue,
      PRIMARY_COLORS.red,
      PRIMARY_COLORS.blue,
      PRIMARY_COLORS.red,
      PRIMARY_COLORS.yellow,
    ],
    free: true,
  },
];

const dom = {
  app: document.querySelector("#app"),
  scene: document.querySelector("#scene"),
  videoStage: document.querySelector("#video-stage"),
  welcomeStart: document.querySelector("#welcome-start"),
  welcomeStatus: document.querySelector("#welcome-status"),
  homeButton: document.querySelector("#home-button"),
  backButton: document.querySelector("#back-button"),
  gameTiles: document.querySelectorAll("[data-game]"),
  embeddedGame: document.querySelector("#embedded-game"),
  embeddedBack: document.querySelector("#embedded-back"),
  gameFrame: document.querySelector("#game-frame"),
  gamePreview: document.querySelector("#game-preview"),
  previewBack: document.querySelector("#preview-back"),
  previewCode: document.querySelector("#preview-code"),
  previewTitle: document.querySelector("#preview-title"),
  previewDescription: document.querySelector("#preview-description"),
  startButton: document.querySelector("#start-button"),
  demoButton: document.querySelector("#demo-button"),
  resetButton: document.querySelector("#reset-button"),
  bubblePageBack: document.querySelector("#bubble-page-back"),
  bubblePageNext: document.querySelector("#bubble-page-next"),
  bubblePageNumber: document.querySelector("#bubble-page-number"),
  bubblePageTitle: document.querySelector("#bubble-page-title"),
  bubblePageHint: document.querySelector("#bubble-page-hint"),
  trackingPill: document.querySelector("#tracking-pill"),
  trackingLabel: document.querySelector("#tracking-label"),
  video: document.querySelector("#input-video"),
  landmarkCanvas: document.querySelector("#landmark-canvas"),
  cameraCard: document.querySelector("#camera-card"),
  cameraPlaceholder: document.querySelector("#camera-placeholder"),
  fpsLabel: document.querySelector("#fps-label"),
  poseStatus: document.querySelector("#pose-status"),
  bubbleCount: document.querySelector("#bubble-count"),
  mixLegend: document.querySelector("#mix-legend"),
  mixColorA: document.querySelector("#mix-color-a"),
  mixColorB: document.querySelector("#mix-color-b"),
  mixColorResult: document.querySelector("#mix-color-result"),
  mixResult: document.querySelector("#mix-result"),
  mixLabel: document.querySelector("#mix-label"),
  firstPlayHint: document.querySelector("#first-play-hint"),
  toast: document.querySelector("#toast"),
};

class BubbleLab {
  constructor(container) {
    this.container = container;
    this.showPoseOverlay = true;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x07101f, 0.022);
    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    this.camera.position.set(0, 0, 12);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.elapsed = 0;
    this.bubbles = [];
    this.effects = [];
    this.currentLevel = 0;
    this.nextBubbleId = 1;
    this.interactionPoints = [];
    this.bodyPointHistory = new Map();
    this.worldBounds = { width: 16, height: 9 };

    this.sphereGeometry = new THREE.SphereGeometry(1, 48, 32);
    this.ringGeometry = new THREE.TorusGeometry(1, 0.025, 10, 80);
    this.dotGeometry = new THREE.SphereGeometry(0.055, 16, 12);
    this.glowTexture = this.createGlowTexture();
    this.bodyCursors = [this.createJointCursor(0x78f5e2), this.createJointCursor(0x9cb7ff)];

    this.addAtmosphere();
    this.resize();
    this.reset();
    this.animate();
  }

  createGlowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,0.8)");
    gradient.addColorStop(0.12, "rgba(255,255,255,0.25)");
    gradient.addColorStop(0.46, "rgba(255,255,255,0.06)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  addAtmosphere() {
    const starCount = 180;
    const positions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 22;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 13;
      positions[index * 3 + 2] = -2 - Math.random() * 7;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x9bc7de,
      size: 0.018,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);

    const ambient = new THREE.AmbientLight(0xffffff, 0.92);
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(-4, 6, 8);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(5, -3, 4);
    this.scene.add(ambient, key, fill);
  }

  createJointCursor(color) {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.015, 8, 48),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    );
    const dot = new THREE.Mesh(
      this.dotGeometry,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
    );
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    halo.scale.setScalar(1.4);
    group.add(halo, ring, dot);
    group.visible = false;
    group.renderOrder = 10;
    this.scene.add(group);
    return group;
  }

  createBubble(position, radius, colorValue, velocity = new THREE.Vector3()) {
    const color = new THREE.Color(colorValue);
    const colorHex = `#${color.getHexString()}`;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.sphereGeometry, material);
    mesh.renderOrder = 2;

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.scale.setScalar(2.2);
    glow.position.z = -0.05;

    const group = new THREE.Group();
    group.position.copy(position);
    group.scale.setScalar(0.01);
    group.add(glow, mesh);
    this.scene.add(group);

    const bubble = {
      id: this.nextBubbleId,
      group,
      mesh,
      glow,
      material,
      color,
      colorHex,
      radius,
      visualRadius: 0.01,
      velocity: velocity.clone(),
      volume: radius ** 3,
      phase: Math.random() * Math.PI * 2,
      drift: new THREE.Vector3(
        (Math.random() - 0.5) * 0.045,
        (Math.random() - 0.5) * 0.045,
        (Math.random() - 0.5) * 0.018,
      ),
      touched: 0,
      born: 0,
      mixCount: 1,
    };
    this.nextBubbleId += 1;
    this.bubbles.push(bubble);
    return bubble;
  }

  reset({ notify = true } = {}) {
    for (const bubble of this.bubbles) {
      this.disposeBubble(bubble);
    }
    this.bubbles = [];

    const level = BUBBLE_LEVELS[this.currentLevel];
    const palette = [...new Set(level.colors)];
    if (level.free) {
      const halfWidth = this.worldBounds.width * 0.5;
      const halfHeight = this.worldBounds.height * 0.5;
      const xMax = halfWidth * 0.74;
      const yMax = halfHeight * 0.66;
      const radii = [0.3, 1.2, 0.5, 0.95, 0.36, 0.8, 1.05, 0.45, 1.15, 0.6, 0.42, 0.9];
      const rows = 3;
      const cols = 4;
      const cells = [];

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const baseX = -xMax + (col / (cols - 1)) * (2 * xMax);
          const baseY = -yMax + (row / (rows - 1)) * (2 * yMax);
          const radius = radii[(row * cols + col) % radii.length];
          const x = THREE.MathUtils.clamp(
            baseX + THREE.MathUtils.randFloat(-xMax * 0.16, xMax * 0.16),
            -halfWidth + radius + 0.4,
            halfWidth - radius - 0.4,
          );
          const y = THREE.MathUtils.clamp(
            baseY + THREE.MathUtils.randFloat(-yMax * 0.18, yMax * 0.18),
            -halfHeight + radius + 0.6,
            halfHeight - radius - 0.6,
          );
          const color = palette[(row + col) % palette.length];
          cells.push({
            position: new THREE.Vector3(x, y, THREE.MathUtils.randFloat(-0.1, 0.1)),
            radius,
            color,
          });
        }
      }
      cells.forEach(({ position, radius, color }) => {
        this.createBubble(position, radius, color, new THREE.Vector3());
      });
    } else if (level.colors.length >= 3) {
      const distance = Math.min(this.worldBounds.width * 0.24, 3.4);
      const angles = [
        Math.PI / 2,
        Math.PI / 2 + (2 * Math.PI) / 3,
        Math.PI / 2 + (4 * Math.PI) / 3,
      ];
      const radii = level.colors.map(() => THREE.MathUtils.randFloat(1.0, 1.25));
      level.colors.forEach((color, index) => {
        const position = new THREE.Vector3(
          Math.cos(angles[index]) * distance,
          Math.sin(angles[index]) * distance,
          THREE.MathUtils.randFloat(-0.12, 0.12),
        );
        this.createBubble(position, radii[index], color, new THREE.Vector3());
      });
    } else {
      const reach = Math.min(this.worldBounds.width * 0.3, 3.8);
      const bigRadius = THREE.MathUtils.randFloat(1.18, 1.36);
      const smallRadius = THREE.MathUtils.randFloat(0.96, 1.12);
      const side = Math.random() < 0.5 ? -1 : 1;
      const configs = [
        {
          radius: bigRadius,
          xSign: side,
        },
        {
          radius: smallRadius,
          xSign: -side,
        },
      ];
      level.colors.forEach((color, index) => {
        const config = configs[index % configs.length];
        const position = new THREE.Vector3(
          config.xSign * THREE.MathUtils.randFloat(reach * 0.7, reach),
          THREE.MathUtils.randFloat(-1.3, 1.3),
          THREE.MathUtils.randFloat(-0.12, 0.12),
        );
        this.createBubble(position, config.radius, color, new THREE.Vector3());
      });
    }

    this.updateLevelUI();
    this.updateCount();
    if (notify) showToast("本页泡泡已经重新绘制");
  }

  setLevel(levelIndex) {
    const nextLevel = THREE.MathUtils.clamp(levelIndex, 0, BUBBLE_LEVELS.length - 1);
    this.currentLevel = nextLevel;
    this.reset({ notify: false });
  }

  updateLevelUI() {
    const level = BUBBLE_LEVELS[this.currentLevel];
    dom.bubblePageBack.disabled = this.currentLevel === 0;
    dom.bubblePageNext.disabled = this.currentLevel === BUBBLE_LEVELS.length - 1;
    dom.mixLegend.classList.remove("result-visible");
    dom.mixLabel.textContent = level.free ? "自由混色" : "推动泡泡，看看会变成什么颜色";
    dom.mixColorA.style.setProperty("--dot-color", level.colors[0]);
    dom.mixColorB.style.setProperty("--dot-color", level.colors[1]);
    dom.mixColorResult.style.removeProperty("--dot-color");
  }

  disposeBubble(bubble) {
    this.scene.remove(bubble.group);
    bubble.material.dispose();
    bubble.glow.material.dispose();
  }

  updateCount() {
    dom.bubbleCount.textContent = String(this.bubbles.length).padStart(2, "0");
  }

  setBody(points) {
    const now = performance.now();
    const activeIds = new Set();
    this.interactionPoints = points.map((point) => {
      activeIds.add(point.id);
      const previous = this.bodyPointHistory.get(point.id);
      const elapsed = previous
        ? Math.max((now - previous.time) / 1000, 1 / 120)
        : 1 / 60;
      const rawVelocity = previous
        ? point.position.clone().sub(previous.position).divideScalar(elapsed).clampLength(0, 18)
        : new THREE.Vector3();
      const velocity = previous
        ? previous.velocity.clone().lerp(rawVelocity, 0.48)
        : rawVelocity;

      this.bodyPointHistory.set(point.id, {
        position: point.position.clone(),
        velocity: velocity.clone(),
        time: now,
      });
      return {
        position: point.position,
        velocity,
        radius: point.radius,
        strength: point.strength,
      };
    });

    for (const id of this.bodyPointHistory.keys()) {
      if (!activeIds.has(id)) this.bodyPointHistory.delete(id);
    }

    const wrists = ["joint-15", "joint-16"]
      .map((id) => points.find((point) => point.id === id))
      .filter(Boolean);
    this.bodyCursors.forEach((cursor, index) => {
      const wrist = wrists[index];
      cursor.visible = this.showPoseOverlay && Boolean(wrist);
      if (!cursor.visible) return;
      cursor.position.lerp(wrist.position, 0.52);
      cursor.scale.setScalar(1);
      cursor.rotation.z += 0.018 * (index ? -1 : 1);
    });
  }

  screenToWorld(x, y, z = 0) {
    return new THREE.Vector3(
      (x - 0.5) * this.worldBounds.width,
      (0.5 - y) * this.worldBounds.height,
      THREE.MathUtils.clamp(-z * 2.2, -1, 1),
    );
  }

  videoToWorld(x, y, z = 0) {
    const videoWidth = dom.video.videoWidth || 1280;
    const videoHeight = dom.video.videoHeight || 720;
    const sourceAspect = videoWidth / videoHeight;
    const viewportAspect = window.innerWidth / window.innerHeight;
    let viewportX = x;
    let viewportY = y;

    if (viewportAspect > sourceAspect) {
      const renderedHeight = viewportAspect / sourceAspect;
      viewportY = y * renderedHeight - (renderedHeight - 1) * 0.5;
    } else if (viewportAspect < sourceAspect) {
      const renderedWidth = sourceAspect / viewportAspect;
      viewportX = x * renderedWidth - (renderedWidth - 1) * 0.5;
    }

    return this.screenToWorld(1 - viewportX, viewportY, z);
  }

  collectInteractionPoints() {
    return [...this.interactionPoints];
  }

  updatePhysics(delta) {
    const safeDelta = Math.min(delta, 0.033);
    const points = this.collectInteractionPoints();
    const { width, height } = this.worldBounds;

    for (const bubble of this.bubbles) {
      bubble.born = Math.min(bubble.born + safeDelta * 3.8, 1);
      bubble.touched = Math.max(0, bubble.touched - safeDelta);
      bubble.velocity.addScaledVector(bubble.drift, safeDelta);
      const swayTime = this.elapsed * 0.5 + bubble.phase;
      bubble.velocity.x += Math.sin(swayTime) * 0.0016;
      bubble.velocity.y += Math.cos(swayTime * 0.6) * 0.0014;
      bubble.velocity.y += Math.sin(this.elapsed * 0.3 + bubble.phase * 1.4) * 0.0009;
      bubble.velocity.x += -bubble.group.position.x * safeDelta * 0.006;
      bubble.velocity.y += -bubble.group.position.y * safeDelta * 0.006;
      bubble.velocity.z += -bubble.group.position.z * safeDelta * 0.08;

      for (const point of points) {
        const offset = new THREE.Vector3(
          bubble.group.position.x - point.position.x,
          bubble.group.position.y - point.position.y,
          0,
        );
        const distance = offset.length();
        const range = bubble.radius + point.radius + 0.08;
        if (distance >= range) continue;

        const normal = distance > 0.001
          ? offset.divideScalar(distance)
          : new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, 0).normalize();
        const overlap = range - distance;
        const proximity = 1 - distance / range;
        const bodyVelocity = point.velocity.clone();
        bodyVelocity.z = 0;
        bodyVelocity.clampLength(0, 5);
        const approachSpeed = Math.max(bodyVelocity.dot(normal), 0);

        bubble.group.position.addScaledVector(normal, Math.min(overlap * 0.62, 0.16));
        bubble.velocity.addScaledVector(bodyVelocity, proximity * point.strength * 0.055);
        bubble.velocity.addScaledVector(
          normal,
          point.strength * (approachSpeed * 0.12 + proximity * 0.18),
        );
        bubble.touched = 0.5;
      }

      bubble.velocity.multiplyScalar(Math.pow(0.992, safeDelta * 60));
      bubble.velocity.clampLength(0, 8.5);
      bubble.group.position.addScaledVector(bubble.velocity, safeDelta);

      const horizontalLimit = width * 0.5 - bubble.radius;
      const verticalLimit = height * 0.5 - bubble.radius;
      if (Math.abs(bubble.group.position.x) > horizontalLimit) {
        bubble.group.position.x = Math.sign(bubble.group.position.x) * horizontalLimit;
        bubble.velocity.x *= -0.72;
      }
      if (Math.abs(bubble.group.position.y) > verticalLimit) {
        bubble.group.position.y = Math.sign(bubble.group.position.y) * verticalLimit;
        bubble.velocity.y *= -0.72;
      }
      if (Math.abs(bubble.group.position.z) > 1.25) {
        bubble.group.position.z = Math.sign(bubble.group.position.z) * 1.25;
        bubble.velocity.z *= -0.7;
      }
    }

    this.resolveCollisions();
  }

  resolveCollisions() {
    for (let first = 0; first < this.bubbles.length; first += 1) {
      for (let second = first + 1; second < this.bubbles.length; second += 1) {
        const a = this.bubbles[first];
        const b = this.bubbles[second];
        const distance = Math.hypot(
          b.group.position.x - a.group.position.x,
          b.group.position.y - a.group.position.y,
        );
        const contactDistance = a.radius + b.radius;
        if (distance > contactDistance) continue;

        this.mergeBubbles(a, b);
        return;
      }
    }
  }

  mergeBubbles(a, b) {
    const totalVolume = a.volume + b.volume;
    const weightA = a.volume / totalVolume;
    const weightB = b.volume / totalVolume;
    const position = a.group.position.clone().multiplyScalar(weightA)
      .addScaledVector(b.group.position, weightB);
    const velocity = a.velocity.clone().multiplyScalar(weightA)
      .addScaledVector(b.velocity, weightB)
      .multiplyScalar(0.36);
    const colorValue = lookupMix(a.colorHex, b.colorHex);
    const mixCount = a.mixCount + b.mixCount;
    const color = new THREE.Color(colorValue);
    const extraMixes = Math.max(mixCount - 2, 0);
    if (extraMixes > 0) {
      const darken = Math.min(extraMixes * 0.16, 0.6);
      color.lerp(new THREE.Color(0x2a1d12), darken);
    }
    const radius = Math.min(Math.cbrt(totalVolume) * 0.98, 1.48);

    this.bubbles = this.bubbles.filter((bubble) => bubble !== a && bubble !== b);
    this.disposeBubble(a);
    this.disposeBubble(b);
    const merged = this.createBubble(position, radius, `#${color.getHexString()}`, velocity);
    merged.mixCount = mixCount;
    merged.touched = 0;
    this.createFusionEffect(position, color, radius);
    this.updateCount();
    dom.mixColorA.style.setProperty("--dot-color", a.colorHex);
    dom.mixColorB.style.setProperty("--dot-color", b.colorHex);
    dom.mixColorResult.style.setProperty("--dot-color", `#${color.getHexString()}`);
    dom.mixLegend.classList.add("result-visible");
  }

  createFusionEffect(position, color, radius) {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(this.ringGeometry, ringMaterial);
    ring.position.copy(position);
    ring.scale.setScalar(radius * 0.45);
    this.scene.add(ring);

    const particleCount = 18;
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2 + Math.random() * 0.25;
      const speed = 0.8 + Math.random() * 1.5;
      velocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 0.55,
      ));
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color,
      map: this.glowTexture,
      size: 0.16,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.position.copy(position);
    this.scene.add(particles);

    this.effects.push({ ring, particles, velocities, life: 1, radius });
  }

  updateEffects(delta) {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      effect.life -= delta * 1.65;
      const progress = 1 - Math.max(effect.life, 0);
      effect.ring.scale.setScalar(effect.radius * (0.45 + progress * 2.8));
      effect.ring.material.opacity = Math.max(effect.life, 0) * 0.75;

      const positions = effect.particles.geometry.attributes.position;
      for (let particle = 0; particle < effect.velocities.length; particle += 1) {
        positions.array[particle * 3] += effect.velocities[particle].x * delta;
        positions.array[particle * 3 + 1] += effect.velocities[particle].y * delta;
        positions.array[particle * 3 + 2] += effect.velocities[particle].z * delta;
        effect.velocities[particle].multiplyScalar(Math.pow(0.95, delta * 60));
      }
      positions.needsUpdate = true;
      effect.particles.material.opacity = Math.max(effect.life, 0) * 0.8;

      if (effect.life <= 0) {
        this.scene.remove(effect.ring, effect.particles);
        effect.ring.geometry = null;
        effect.ring.material.dispose();
        effect.particles.geometry.dispose();
        effect.particles.material.dispose();
        this.effects.splice(index, 1);
      }
    }
  }

  updateVisuals(delta) {
    this.elapsed += delta;
    this.stars.rotation.z = Math.sin(this.elapsed * 0.06) * 0.02;

    for (const bubble of this.bubbles) {
      bubble.visualRadius = THREE.MathUtils.damp(
        bubble.visualRadius,
        bubble.radius,
        8,
        delta,
      );
      const wobble = 1 + Math.sin(this.elapsed * 1.2 + bubble.phase) * 0.018;
      bubble.group.scale.set(
        bubble.visualRadius * wobble,
        bubble.visualRadius / wobble,
        bubble.visualRadius,
      );
      bubble.group.rotation.x += delta * 0.035;
      bubble.group.rotation.y += delta * 0.055;
      bubble.glow.material.opacity = 0.12 + (bubble.touched > 0 ? 0.14 : 0);
    }
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * this.camera.position.z;
    this.worldBounds.height = visibleHeight * 0.92;
    this.worldBounds.width = visibleHeight * this.camera.aspect * 0.94;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.elapsed += delta;
    this.updatePhysics(delta);
    this.updateVisuals(delta);
    this.updateEffects(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

class PoseTracker {
  constructor(lab) {
    this.lab = lab;
    this.pose = null;
    this.camera = null;
    this.running = false;
    this.lastResultTime = 0;
    this.smoothFps = 0;
    this.pageTouchStartedAt = null;
    this.pageTouchButton = null;
    this.pageTouchArmed = true;
    this.context = dom.landmarkCanvas.getContext("2d");
  }

  async start() {
    if (this.running) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("当前浏览器不支持摄像头访问");
    }
    if (!window.Pose || !window.Camera) {
      throw new Error("MediaPipe Pose 资源加载失败，请检查网络后重试");
    }

    setTrackingState("loading", "正在连接");
    dom.startButton.disabled = true;
    dom.startButton.querySelector("b").textContent = "正在加载姿态模型";

    this.pose = new window.Pose({
      locateFile: (file) => `${import.meta.env.BASE_URL}mediapipe/pose/${file}`,
    });
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.62,
      minTrackingConfidence: 0.58,
      selfieMode: false,
    });
    this.pose.onResults((results) => this.onResults(results));

    const portrait = window.innerHeight > window.innerWidth;
    this.camera = new window.Camera(dom.video, {
      onFrame: async () => {
        if (!this.pose) return;
        try {
          await this.pose.send({ image: dom.video });
        } catch (error) {
          console.error("MediaPipe Pose 推理失败：", error);
          this.handleModelError("姿态模型运行失败，请刷新重试");
        }
      },
      width: portrait ? 720 : 1280,
      height: portrait ? 1280 : 720,
    });

    await this.camera.start();
    this.running = true;

    this.modelLoadTimer = window.setTimeout(() => {
      if (this.running && !this.lastResultTime) {
        this.handleModelError("姿态模型加载失败，请检查网络后刷新重试");
      }
    }, 12000);
    dom.videoStage.classList.add("live");
    dom.app.classList.add("camera-live");
    dom.cameraCard.classList.add("active");
    dom.cameraPlaceholder.classList.add("hidden");
    dom.startButton.disabled = false;
    dom.startButton.querySelector("b").textContent = "全身追踪已开启";
    dom.startButton.querySelector("small").textContent = "移动身体开始互动";
    setTrackingState("active", "全身追踪中");
  }

  async stop() {
    if (this.modelLoadTimer) {
      window.clearTimeout(this.modelLoadTimer);
      this.modelLoadTimer = null;
    }
    if (this.camera) this.camera.stop();
    if (this.pose) await this.pose.close();
    this.camera = null;
    this.pose = null;
    this.running = false;
    this.lastResultTime = 0;
    this.smoothFps = 0;
    this.context.clearRect(0, 0, dom.landmarkCanvas.width, dom.landmarkCanvas.height);
    this.clearPageTouch();
    this.lab.setBody([]);
    dom.videoStage.classList.remove("live");
    dom.app.classList.remove("camera-live");
    dom.cameraCard.classList.remove("active");
    dom.cameraPlaceholder.classList.remove("hidden");
    dom.fpsLabel.textContent = "-- FPS";
    dom.poseStatus.textContent = "等待摄像头连接";
    dom.startButton.disabled = false;
    dom.startButton.querySelector("b").textContent = "开启全身追踪";
    dom.startButton.querySelector("small").textContent = "需要摄像头权限";
    setTrackingState("idle", "等待连接");
  }

  handleModelError(message) {
    console.error(message);
    if (this.modelLoadTimer) {
      window.clearTimeout(this.modelLoadTimer);
      this.modelLoadTimer = null;
    }
    setTrackingState("error", "模型加载失败");
    dom.poseStatus.textContent = message;
    dom.fpsLabel.textContent = "-- FPS";
    if (this.running) this.stop();
  }

  onResults(results) {
    if (this.modelLoadTimer) {
      window.clearTimeout(this.modelLoadTimer);
      this.modelLoadTimer = null;
    }
    const now = performance.now();
    if (this.lastResultTime) {
      const currentFps = 1000 / Math.max(now - this.lastResultTime, 1);
      this.smoothFps = this.smoothFps
        ? this.smoothFps * 0.88 + currentFps * 0.12
        : currentFps;
      dom.fpsLabel.textContent = `${Math.round(this.smoothFps)} FPS`;
    }
    this.lastResultTime = now;

    const landmarks = results.poseLandmarks || null;
    if (this.showPoseOverlay) this.drawPose(landmarks);
    const bubbleActive = dom.app.classList.contains("game-active");
    const bookActive = dom.app.classList.contains("book-active");

    if (landmarks && bubbleActive) {
      this.updatePageTouch(landmarks);
    } else {
      this.clearPageTouch();
    }

    if (bookActive && dom.gameFrame.contentWindow) {
      dom.gameFrame.contentWindow.postMessage(
        { type: "POSE_RESULTS", landmarks },
        window.location.origin,
      );
    }

    const bodyPoints = landmarks && bubbleActive ? this.mapPose(landmarks) : [];
    this.lab.setBody(bodyPoints);
    dom.poseStatus.textContent = landmarks
      ? `身体已识别 · ${bubbleActive ? bodyPoints.length : 33} 个关键点`
      : "请后退并让全身进入画面";
  }

  videoPointToScreen(point) {
    const videoWidth = dom.video.videoWidth || 1280;
    const videoHeight = dom.video.videoHeight || 720;
    const sourceAspect = videoWidth / videoHeight;
    const viewportAspect = window.innerWidth / window.innerHeight;

    if (viewportAspect > sourceAspect) {
      const renderedHeight = window.innerWidth / sourceAspect;
      return {
        x: (1 - point.x) * window.innerWidth,
        y: point.y * renderedHeight - (renderedHeight - window.innerHeight) * 0.5,
      };
    }

    const renderedWidth = window.innerHeight * sourceAspect;
    return {
      x: (1 - point.x) * renderedWidth - (renderedWidth - window.innerWidth) * 0.5,
      y: point.y * window.innerHeight,
    };
  }

  isHandTouchingButton(button, landmarks) {
    if (button.disabled) return false;
    const bounds = button.getBoundingClientRect();
    const centerX = bounds.left + bounds.width * 0.5;
    const centerY = bounds.top + bounds.height * 0.5;
    const radius = Math.max(bounds.width, bounds.height) * 1.05;
    return [15, 16, 17, 18, 19, 20, 21, 22].some((index) => {
      const landmark = landmarks[index];
      if (!landmark || (landmark.visibility ?? 1) < 0.35) return false;
      const point = this.videoPointToScreen(landmark);
      return Math.hypot(point.x - centerX, point.y - centerY) <= radius;
    });
  }

  updatePageTouch(landmarks) {
    const touchedButton = [dom.resetButton, dom.bubblePageBack, dom.bubblePageNext]
      .find((button) => this.isHandTouchingButton(button, landmarks));

    dom.resetButton.classList.toggle("touch-active", touchedButton === dom.resetButton);
    dom.bubblePageBack.classList.toggle("touch-active", touchedButton === dom.bubblePageBack);
    dom.bubblePageNext.classList.toggle("touch-active", touchedButton === dom.bubblePageNext);

    if (!touchedButton) {
      this.pageTouchStartedAt = null;
      this.pageTouchButton = null;
      this.pageTouchArmed = true;
      return;
    }
    if (!this.pageTouchArmed) return;
    if (this.pageTouchButton !== touchedButton) {
      this.pageTouchButton = touchedButton;
      this.pageTouchStartedAt = performance.now();
      return;
    }
    if (performance.now() - this.pageTouchStartedAt >= 560) {
      this.pageTouchArmed = false;
      touchedButton.click();
    }
  }

  clearPageTouch() {
    dom.resetButton.classList.remove("touch-active");
    dom.bubblePageBack.classList.remove("touch-active");
    dom.bubblePageNext.classList.remove("touch-active");
    this.pageTouchStartedAt = null;
    this.pageTouchButton = null;
    this.pageTouchArmed = true;
  }

  mapPose(landmarks) {
    const jointRadii = new Map([
      [0, 0.5],
      [11, 0.66], [12, 0.66],
      [13, 0.62], [14, 0.62],
      [15, 0.76], [16, 0.76],
      [17, 0.58], [18, 0.58],
      [19, 0.58], [20, 0.58],
      [21, 0.58], [22, 0.58],
      [23, 0.66], [24, 0.66],
      [25, 0.58], [26, 0.58],
      [27, 0.58], [28, 0.58],
    ]);
    const limbSegments = [
      [11, 13, 0.5], [13, 15, 0.48],
      [12, 14, 0.5], [14, 16, 0.48],
      [15, 17, 0.44], [15, 19, 0.44], [15, 21, 0.44],
      [16, 18, 0.44], [16, 20, 0.44], [16, 22, 0.44],
      [11, 12, 0.52], [11, 23, 0.48],
      [12, 24, 0.48], [23, 24, 0.54],
      [23, 25, 0.44], [25, 27, 0.42],
      [24, 26, 0.44], [26, 28, 0.42],
    ];
    const joints = new Map();
    const points = [];

    jointRadii.forEach((radius, index) => {
      const landmark = landmarks[index];
      if (!landmark || (landmark.visibility ?? 1) < 0.38) return;
      const position = this.lab.videoToWorld(landmark.x, landmark.y, landmark.z);
      joints.set(index, position);
      points.push({
        id: `joint-${index}`,
        position,
        radius,
        strength: index >= 15 && index <= 22 ? 1.5 : 1.12,
      });
    });

    limbSegments.forEach(([startIndex, endIndex, radius]) => {
      const start = joints.get(startIndex);
      const end = joints.get(endIndex);
      if (!start || !end) return;
      [0.2, 0.4, 0.6, 0.8].forEach((amount, sampleIndex) => {
        points.push({
          id: `limb-${startIndex}-${endIndex}-${sampleIndex}`,
          position: new THREE.Vector3().lerpVectors(start, end, amount),
          radius,
          strength: 0.92,
        });
      });
    });

    const torsoIndices = [11, 12, 23, 24];
    if (torsoIndices.every((index) => joints.has(index))) {
      const torsoCenter = torsoIndices.reduce(
        (center, index) => center.add(joints.get(index)),
        new THREE.Vector3(),
      ).divideScalar(torsoIndices.length);
      points.push({
        id: "torso-center",
        position: torsoCenter,
        radius: 0.92,
        strength: 1.12,
      });
    }

    return points;
  }

  drawPose(landmarks) {
    const width = dom.video.videoWidth || 1280;
    const height = dom.video.videoHeight || 720;
    if (dom.landmarkCanvas.width !== width || dom.landmarkCanvas.height !== height) {
      dom.landmarkCanvas.width = width;
      dom.landmarkCanvas.height = height;
    }

    this.context.clearRect(0, 0, width, height);
    if (!landmarks || !window.drawConnectors || !window.drawLandmarks || !window.POSE_CONNECTIONS) return;

    window.drawConnectors(this.context, landmarks, window.POSE_CONNECTIONS, {
      color: "rgba(116, 243, 220, 0.82)",
      lineWidth: 2,
    });
    window.drawLandmarks(this.context, landmarks, {
      color: "rgba(238, 255, 252, 0.92)",
      fillColor: "#79efdc",
      lineWidth: 0.8,
      radius: 2,
    });
  }
}

let toastTimer;
let firstPlayHintTimer;
function showToast(message, duration = 1800) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => dom.toast.classList.remove("visible"), duration);
}

function setTrackingState(state, label) {
  dom.trackingPill.classList.remove("active", "error");
  if (state === "active") dom.trackingPill.classList.add("active");
  if (state === "error") dom.trackingPill.classList.add("error");
  dom.trackingLabel.textContent = label;
}

const lab = new BubbleLab(dom.scene);
const tracker = new PoseTracker(lab);

const previewGames = {
  stars: {
    code: "SPACE · 03",
    title: "星尘轨迹",
    description: "让全身动作化为发光轨迹，在摄像头空间中绘制属于你的动态星图。这个动作游戏正在制作中。",
  },
};

function goHome() {
  window.clearTimeout(firstPlayHintTimer);
  dom.firstPlayHint.classList.remove("visible");
  dom.app.classList.remove("game-active", "bubble-game-mode", "preview-active", "book-active");
  dom.app.classList.add("lobby-active");
  dom.gamePreview.hidden = true;
  dom.embeddedGame.hidden = true;
  dom.gameFrame.src = "about:blank";
  lab.setBody([]);
  lab.showPoseOverlay = true;
}

function selectGame(gameId) {
  if (!tracker.running) {
    showToast("未开启摄像头，可浏览但无法体感互动", 2200);
  }

  dom.app.classList.remove("lobby-active");
  if (gameId === "bubble") {
    dom.gamePreview.hidden = true;
    dom.embeddedGame.hidden = true;
    dom.app.classList.remove("preview-active", "book-active");
    dom.app.classList.add("game-active", "bubble-game-mode");
    lab.showPoseOverlay = false;
    lab.setLevel(0);
    window.clearTimeout(firstPlayHintTimer);
    dom.firstPlayHint.classList.add("visible");
    firstPlayHintTimer = window.setTimeout(() => {
      dom.firstPlayHint.classList.remove("visible");
    }, 3800);
    return;
  }

  if (gameId === "book") {
    dom.gamePreview.hidden = true;
    dom.embeddedGame.hidden = false;
    dom.gameFrame.src = "/games/interactive-book.html?shared=1";
    dom.app.classList.remove("game-active", "bubble-game-mode", "preview-active");
    dom.app.classList.add("book-active");
    lab.showPoseOverlay = true;
    return;
  }

  const game = previewGames[gameId];
  if (!game) return;
  dom.previewCode.textContent = game.code;
  dom.previewTitle.textContent = game.title;
  dom.previewDescription.textContent = game.description;
  dom.gamePreview.hidden = false;
  dom.app.classList.add("preview-active");
}

window.addEventListener("resize", () => lab.resize());
dom.gameFrame.addEventListener("load", async () => {
  if (!dom.app.classList.contains("book-active") || !dom.video.srcObject) return;
  const frameVideo = dom.gameFrame.contentDocument?.querySelector("#camera");
  if (!frameVideo) return;
  frameVideo.srcObject = dom.video.srcObject;
  try {
    await frameVideo.play();
  } catch (error) {
    console.warn("Shared camera preview could not autoplay:", error);
  }
});

dom.welcomeStart.addEventListener("click", async () => {
  dom.welcomeStart.disabled = true;
  dom.welcomeStatus.textContent = "正在进入奇妙世界…";
  dom.app.classList.add("session-ready", "lobby-active");
  try {
    await tracker.start();
    dom.welcomeStatus.textContent = "摄像头已开启";
  } catch (error) {
    console.warn("Camera not available, entering without body tracking:", error);
    dom.welcomeStatus.textContent = "未开启摄像头，可浏览但无法体感";
  }
});

dom.gameTiles.forEach((tile) => {
  tile.addEventListener("click", () => selectGame(tile.dataset.game));
});
document.querySelectorAll("[data-coming-soon]").forEach((card) => {
  card.addEventListener("click", () => showToast("正在开发中，敬请期待", 2200));
});
dom.homeButton.addEventListener("click", goHome);
dom.backButton.addEventListener("click", goHome);
dom.embeddedBack.addEventListener("click", goHome);
dom.previewBack.addEventListener("click", goHome);
dom.bubblePageBack.addEventListener("click", () => {
  lab.setLevel(lab.currentLevel - 1);
});
dom.bubblePageNext.addEventListener("click", () => {
  lab.setLevel(lab.currentLevel + 1);
});
dom.resetButton.addEventListener("click", () => lab.reset());
dom.demoButton.addEventListener("click", () => {
  showToast("请用身体（手臂、躯干）推动泡泡，鼠标无法互动");
});
dom.startButton.addEventListener("click", async () => {
  try {
    await tracker.start();
  } catch (error) {
    console.error("Camera initialization failed:", error);
    dom.startButton.disabled = false;
    dom.startButton.querySelector("b").textContent = "重新开启摄像头";
    dom.startButton.querySelector("small").textContent = "用身体即可互动";
    setTrackingState("error", "连接失败");
    showToast(error instanceof Error ? error.message : "无法访问摄像头");
  }
});
