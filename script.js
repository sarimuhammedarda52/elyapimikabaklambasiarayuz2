class TouchTexture {
  constructor() {
    this.size = 64; this.width = this.height = this.size;
    this.maxAge = 64; this.radius = 0.25 * this.size; 
    this.speed = 1 / this.maxAge; this.trail = []; this.last = null;
    this.initTexture();
  }
  initTexture() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width; this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.fillStyle = "black"; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.texture = new THREE.Texture(this.canvas);
  }
  update() {
    this.clear();
    let speed = this.speed;
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      let f = point.force * speed * (1 - point.age / this.maxAge);
      point.x += point.vx * f; point.y += point.vy * f; point.age++;
      if (point.age > this.maxAge) { this.trail.splice(i, 1); } else { this.drawPoint(point); }
    }
    this.texture.needsUpdate = true;
  }
  clear() { this.ctx.fillStyle = "black"; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
  addTouch(point) {
    let force = 0; let vx = 0; let vy = 0; const last = this.last;
    if (last) {
      const dx = point.x - last.x; const dy = point.y - last.y;
      if (dx === 0 && dy === 0) return;
      const dd = dx * dx + dy * dy; let d = Math.sqrt(dd);
      vx = dx / d; vy = dy / d; force = Math.min(dd * 20000, 2.0); 
    }
    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }
  drawPoint(point) {
    const pos = { x: point.x * this.width, y: (1 - point.y) * this.height };
    let intensity = 1;
    if (point.age < this.maxAge * 0.3) { intensity = Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2)); } 
    else { const t = 1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7); intensity = -t * (t - 2); }
    intensity *= point.force;
    const radius = this.radius;
    let color = `${((point.vx + 1) / 2) * 255}, ${((point.vy + 1) / 2) * 255}, ${intensity * 255}`;
    let offset = this.size * 5;
    this.ctx.shadowOffsetX = offset; this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius * 1; this.ctx.shadowColor = `rgba(${color},${0.2 * intensity})`;
    this.ctx.beginPath(); this.ctx.fillStyle = "rgba(255,0,0,1)";
    this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2); this.ctx.fill();
  }
}

class GradientBackground {
  constructor(sceneManager) {
    this.sceneManager = sceneManager; this.mesh = null;
    this.uniforms = {
      uTime: { value: 0 }, uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uColor1: { value: new THREE.Vector3() }, uColor2: { value: new THREE.Vector3() }, uColor3: { value: new THREE.Vector3() }, 
      uColor4: { value: new THREE.Vector3() }, uColor5: { value: new THREE.Vector3() }, uColor6: { value: new THREE.Vector3() }, 
      uSpeed: { value: 1.2 }, uIntensity: { value: 1.8 }, uTouchTexture: { value: null },
      uGrainIntensity: { value: 0.08 }, uZoom: { value: 1.0 }, uDarkNavy: { value: new THREE.Vector3() }, 
      uGradientSize: { value: 1.0 }, uGradientCount: { value: 6.0 }, uColor1Weight: { value: 1.0 }, uColor2Weight: { value: 1.0 } 
    };
  }
  init() {
    const viewSize = this.sceneManager.getViewSize();
    const geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `varying vec2 vUv; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.); vUv = uv; }`,
      fragmentShader: `
            uniform float uTime; uniform vec2 uResolution;
            uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3;
            uniform vec3 uColor4; uniform vec3 uColor5; uniform vec3 uColor6;
            uniform float uSpeed; uniform float uIntensity; uniform sampler2D uTouchTexture;
            uniform float uGrainIntensity; uniform vec3 uDarkNavy;
            uniform float uGradientSize; uniform float uColor1Weight; uniform float uColor2Weight;
            varying vec2 vUv;
            
            float grain(vec2 uv, float time) {
              vec2 grainUv = uv * uResolution * 0.5;
              float grainValue = fract(sin(dot(grainUv + time, vec2(12.9898, 78.233))) * 43758.5453);
              return grainValue * 2.0 - 1.0;
            }
            
            vec3 getGradientColor(vec2 uv, float time) {
              float gradientRadius = uGradientSize;
              vec2 center1 = vec2(0.5 + sin(time * uSpeed * 0.4) * 0.4, 0.5 + cos(time * uSpeed * 0.5) * 0.4);
              vec2 center2 = vec2(0.5 + cos(time * uSpeed * 0.6) * 0.5, 0.5 + sin(time * uSpeed * 0.45) * 0.5);
              vec2 center3 = vec2(0.5 + sin(time * uSpeed * 0.35) * 0.45, 0.5 + cos(time * uSpeed * 0.55) * 0.45);
              vec2 center4 = vec2(0.5 + cos(time * uSpeed * 0.5) * 0.4, 0.5 + sin(time * uSpeed * 0.4) * 0.4);
              vec2 center5 = vec2(0.5 + sin(time * uSpeed * 0.7) * 0.35, 0.5 + cos(time * uSpeed * 0.6) * 0.35);
              vec2 center6 = vec2(0.5 + cos(time * uSpeed * 0.45) * 0.5, 0.5 + sin(time * uSpeed * 0.65) * 0.5);
              
              float dist1 = length(uv - center1); float dist2 = length(uv - center2);
              float dist3 = length(uv - center3); float dist4 = length(uv - center4);
              float dist5 = length(uv - center5); float dist6 = length(uv - center6);
              
              float influence1 = 1.0 - smoothstep(0.0, gradientRadius, dist1);
              float influence2 = 1.0 - smoothstep(0.0, gradientRadius, dist2);
              float influence3 = 1.0 - smoothstep(0.0, gradientRadius, dist3);
              float influence4 = 1.0 - smoothstep(0.0, gradientRadius, dist4);
              float influence5 = 1.0 - smoothstep(0.0, gradientRadius, dist5);
              float influence6 = 1.0 - smoothstep(0.0, gradientRadius, dist6);
              
              vec2 rotatedUv1 = uv - 0.5; float angle1 = time * uSpeed * 0.15;
              rotatedUv1 = vec2(rotatedUv1.x * cos(angle1) - rotatedUv1.y * sin(angle1), rotatedUv1.x * sin(angle1) + rotatedUv1.y * cos(angle1)) + 0.5;
              
              vec2 rotatedUv2 = uv - 0.5; float angle2 = -time * uSpeed * 0.12;
              rotatedUv2 = vec2(rotatedUv2.x * cos(angle2) - rotatedUv2.y * sin(angle2), rotatedUv2.x * sin(angle2) + rotatedUv2.y * cos(angle2)) + 0.5;
              
              float radialGradient1 = length(rotatedUv1 - 0.5);
              float radialGradient2 = length(rotatedUv2 - 0.5);
              float radialInfluence1 = 1.0 - smoothstep(0.0, 0.8, radialGradient1);
              float radialInfluence2 = 1.0 - smoothstep(0.0, 0.8, radialGradient2);
              
              vec3 color = vec3(0.0);
              color += uColor1 * influence1 * (0.55 + 0.45 * sin(time * uSpeed)) * uColor1Weight;
              color += uColor2 * influence2 * (0.55 + 0.45 * cos(time * uSpeed * 1.2)) * uColor2Weight;
              color += uColor3 * influence3 * (0.55 + 0.45 * sin(time * uSpeed * 0.8)) * uColor1Weight;
              color += uColor4 * influence4 * (0.55 + 0.45 * cos(time * uSpeed * 1.3)) * uColor2Weight;
              color += uColor5 * influence5 * (0.55 + 0.45 * sin(time * uSpeed * 1.1)) * uColor1Weight;
              color += uColor6 * influence6 * (0.55 + 0.45 * cos(time * uSpeed * 0.9)) * uColor2Weight;
              
              color += mix(uColor1, uColor3, radialInfluence1) * 0.45 * uColor1Weight;
              color += mix(uColor2, uColor4, radialInfluence2) * 0.4 * uColor2Weight;
              
              color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;
              float luminance = dot(color, vec3(0.299, 0.587, 0.114));
              color = mix(vec3(luminance), color, 1.35);
              color = pow(color, vec3(0.92)); 
              
              float brightness1 = length(color);
              float mixFactor1 = max(brightness1 * 1.2, 0.15); 
              color = mix(uDarkNavy, color, mixFactor1);
              
              float maxBrightness = 1.0;
              float brightness = length(color);
              if (brightness > maxBrightness) { color = color * (maxBrightness / brightness); }
              return color;
            }
            
            void main() {
              vec2 uv = vUv;
              vec4 touchTex = texture2D(uTouchTexture, uv);
              float vx = -(touchTex.r * 2.0 - 1.0); float vy = -(touchTex.g * 2.0 - 1.0); float intensity = touchTex.b;
              uv.x += vx * 0.8 * intensity; uv.y += vy * 0.8 * intensity;
              
              vec2 center = vec2(0.5); float dist = length(uv - center);
              float ripple = sin(dist * 20.0 - uTime * 3.0) * 0.04 * intensity;
              float wave = sin(dist * 15.0 - uTime * 2.0) * 0.03 * intensity;
              uv += vec2(ripple + wave);
              
              vec3 color = getGradientColor(uv, uTime);
              color += grain(uv, uTime) * uGrainIntensity;
              
              float timeShift = uTime * 0.5;
              color.r += sin(timeShift) * 0.02; color.g += cos(timeShift * 1.4) * 0.02; color.b += sin(timeShift * 1.2) * 0.02;
              
              float mixFactor2 = max(length(color) * 1.2, 0.15); 
              color = mix(uDarkNavy, color, mixFactor2);
              
              gl_FragColor = vec4(clamp(color, vec3(0.0), vec3(1.0)), 1.0);
            }
          `
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.sceneManager.scene.add(this.mesh);
  }
  update(delta) { if (this.uniforms.uTime) this.uniforms.uTime.value += delta; }
  onResize(width, height) {
    const viewSize = this.sceneManager.getViewSize();
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
    }
    if (this.uniforms.uResolution) this.uniforms.uResolution.value.set(width, height);
  }
}

class App {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
    document.body.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = "webGLApp";

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.camera.position.z = 50;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.touchTexture = new TouchTexture();
    this.gradientBackground = new GradientBackground(this);
    this.gradientBackground.uniforms.uTouchTexture.value = this.touchTexture.texture;

    // KABAK LAMBASI KONSEPTİ İÇİN GÜNCELLENMİŞ, SICAK GECE VE GÜNDÜZ RENK ŞEMALARI
    this.themes = {
      'day': {
        color1: new THREE.Vector3(0.0, 0.5, 0.8), // Okyanus Mavisi
        color2: new THREE.Vector3(1.0, 0.8, 0.4), // Güneş Sarısı
        color3: new THREE.Vector3(0.0, 0.8, 0.7), // Turkuaz
        color4: new THREE.Vector3(1.0, 0.5, 0.2), // Turuncu / Mercan
        color5: new THREE.Vector3(0.1, 0.4, 0.9), // Derin Mavi
        color6: new THREE.Vector3(0.9, 0.9, 0.8), // Yumuşak Işık
        darkNavy: new THREE.Vector3(0.05, 0.1, 0.2) // Koyu ama ferah zemin
      },
      'night': {
        color1: new THREE.Vector3(0.9, 0.4, 0.0), // Canlı Kehribar (Lamba Işığı)
        color2: new THREE.Vector3(0.05, 0.1, 0.25), // Gece Okyanus Laciverti (Siyah Değil)
        color3: new THREE.Vector3(0.7, 0.2, 0.0), // Sıcak Koyu Turuncu
        color4: new THREE.Vector3(0.1, 0.15, 0.35), // Alacakaranlık Mavisi
        color5: new THREE.Vector3(1.0, 0.6, 0.1), // Parıldayan Sarı/Altın
        color6: new THREE.Vector3(0.02, 0.05, 0.15), // Derin Gece Mavisi
        darkNavy: new THREE.Vector3(0.02, 0.05, 0.12) // Siyah yerine sıcak karanlık lacivert
      }
    };
    this.init();
  }
  
  setTheme(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return;
    const uniforms = this.gradientBackground.uniforms;
    
    // Tween JS vb. kullanmadan doğrudan yumuşak renk geçişi (GLSL shader hallediyor)
    uniforms.uColor1.value.copy(theme.color1);
    uniforms.uColor2.value.copy(theme.color2);
    uniforms.uColor3.value.copy(theme.color3);
    uniforms.uColor4.value.copy(theme.color4);
    uniforms.uColor5.value.copy(theme.color5);
    uniforms.uColor6.value.copy(theme.color6);
    uniforms.uDarkNavy.value.copy(theme.darkNavy);
    
    this.scene.background = new THREE.Color(0x0a0e27); 
  }

  init() {
    this.gradientBackground.init();
    this.setTheme('day'); // Sayfa açılışında Gündüz teması başlar
    this.tick();
    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("mousemove", (ev) => this.onMouseMove(ev));
    window.addEventListener("touchmove", (ev) => this.onTouchMove(ev));
  }
  onTouchMove(ev) {
    const touch = ev.touches[0];
    this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }
  onMouseMove(ev) {
    this.mouse = { x: ev.clientX / window.innerWidth, y: 1 - ev.clientY / window.innerHeight };
    this.touchTexture.addTouch(this.mouse);
  }
  getViewSize() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180;
    const height = Math.abs(this.camera.position.z * Math.tan(fovInRadians / 2) * 2);
    return { width: height * this.camera.aspect, height };
  }
  tick() {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.touchTexture.update();
    this.gradientBackground.update(delta);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.tick());
  }
  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.gradientBackground.onResize(window.innerWidth, window.innerHeight);
  }
}

// Uygulamayı Başlat
const app = new App();

// --- CUSTOM CURSOR --- //
const cursor = document.getElementById("customCursor");
document.addEventListener("mousemove", (e) => {
  cursor.style.left = e.clientX + "px";
  cursor.style.top = e.clientY + "px";
});

document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => { cursor.style.width = '50px'; cursor.style.height = '50px'; cursor.style.borderColor = '#FFB067'; });
  el.addEventListener('mouseleave', () => { cursor.style.width = '40px'; cursor.style.height = '40px'; cursor.style.borderColor = 'rgba(255,255,255,0.5)'; });
});

// --- GECE/GÜNDÜZ GALERİ GEÇİŞİ VE TEMA DEĞİŞİMİ --- //
const galleryToggleBtn = document.getElementById('gallery-toggle-btn');
const galleryStatus = document.getElementById('gallery-status');
const galleryMainImg = document.getElementById('gallery-main-img');
const galleryCaption = document.getElementById('gallery-caption');

const dayImageSrc = 'urunfotograf/gunduzurunfoto.jpg';
const nightImageSrc = 'urunfotograf/geceurunfoto.png';

let isNightMode = false;

if (galleryToggleBtn && galleryMainImg) {
    galleryToggleBtn.addEventListener('click', () => {
        // Yumuşak geçiş için resmi saydamlaştır
        galleryMainImg.classList.add('fade-out');
        
        setTimeout(() => {
            isNightMode = !isNightMode;
            
            if (isNightMode) {
                // Gece Moduna Geçiş
                galleryMainImg.src = nightImageSrc;
                galleryStatus.innerText = 'Gündüz Halini Gör';
                galleryCaption.innerText = 'Gece: LED ışığın yarattığı modern ve aydınlık atmosfer.';
                app.setTheme('night'); // Arka plan temasını sıcak geceye çevir
            } else {
                // Gündüz Moduna Geçiş
                galleryMainImg.src = dayImageSrc;
                galleryStatus.innerText = 'Gece Halini Gör';
                galleryCaption.innerText = 'Gündüz: Doğal kabak dokusu ve balık desenlerinin canlılığı.';
                app.setTheme('day'); // Arka plan temasını gündüze çevir
            }
            
            galleryMainImg.classList.remove('fade-out');
        }, 400); 
    });
}