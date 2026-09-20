import * as THREE from 'three';

function random(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function surfaceTexture(kind: 'leather' | 'carpet' | 'acoustic' | 'wood'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(256, 256);
  const rng = random(128);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      let value = 175 + rng() * 65;
      if (kind === 'carpet') value = 80 + rng() * 125 + (x % 3 === 0 ? 15 : 0);
      if (kind === 'acoustic') value = x % 5 === 0 && y % 5 === 0 ? 40 : 180 + rng() * 50;
      if (kind === 'wood') value = 105 + Math.sin(x * 0.2 + Math.sin(y * 0.013) * 1.3) * 34 + rng() * 28;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'carpet' ? 36 : kind === 'leather' ? 3 : 5, kind === 'carpet' ? 42 : 4);
  texture.anisotropy = 4;
  return texture;
}

export function makeMaterials() {
  const leather = surfaceTexture('leather');
  const carpet = surfaceTexture('carpet');
  const acoustic = surfaceTexture('acoustic');
  const wood = surfaceTexture('wood');
  const mats = {
    leather: new THREE.MeshStandardMaterial({ color: '#641f2b', roughness: 0.38, metalness: 0.04, bumpMap: leather, bumpScale: 0.007, roughnessMap: leather }),
    cushion: new THREE.MeshStandardMaterial({ color: '#7c2938', roughness: 0.46, metalness: 0.02, bumpMap: leather, bumpScale: 0.008 }),
    piping: new THREE.MeshStandardMaterial({ color: '#9a4954', roughness: 0.62 }),
    carpet: new THREE.MeshStandardMaterial({ color: '#282727', roughness: 1, map: carpet, bumpMap: carpet, bumpScale: 0.025 }),
    platform: new THREE.MeshStandardMaterial({ color: '#252322', roughness: 0.98, map: carpet, bumpMap: carpet, bumpScale: 0.016 }),
    acoustic: new THREE.MeshStandardMaterial({ color: '#36332f', roughness: 0.96, bumpMap: acoustic, bumpScale: 0.012 }),
    acousticDark: new THREE.MeshStandardMaterial({ color: '#222322', roughness: 0.94, bumpMap: acoustic, bumpScale: 0.01 }),
    wood: new THREE.MeshStandardMaterial({ color: '#423026', roughness: 0.56, map: wood, bumpMap: wood, bumpScale: 0.009 }),
    woodLight: new THREE.MeshStandardMaterial({ color: '#635044', roughness: 0.64, map: wood }),
    wall: new THREE.MeshStandardMaterial({ color: '#262523', roughness: 0.89 }),
    black: new THREE.MeshStandardMaterial({ color: '#0d1010', roughness: 0.46, metalness: 0.2 }),
    metal: new THREE.MeshStandardMaterial({ color: '#373331', metalness: 0.85, roughness: 0.3 }),
    brass: new THREE.MeshStandardMaterial({ color: '#ad8b52', metalness: 0.78, roughness: 0.35 }),
    screenFrame: new THREE.MeshStandardMaterial({ color: '#070808', roughness: 0.82 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#242321', roughness: 0.92 }),
    ceilingInset: new THREE.MeshStandardMaterial({ color: '#101313', roughness: 0.95 }),
    led: new THREE.MeshStandardMaterial({ color: '#efbe78', emissive: '#ffbd62', emissiveIntensity: 2.4, roughness: 0.65, toneMapped: false }),
    ledSoft: new THREE.MeshStandardMaterial({ color: '#966032', emissive: '#f7a349', emissiveIntensity: 0.85, roughness: 0.9 }),
    fixture: new THREE.MeshStandardMaterial({ color: '#fff3d4', emissive: '#ffe4b4', emissiveIntensity: 3.4, toneMapped: false }),
    hallway: new THREE.MeshStandardMaterial({ color: '#8a7160', roughness: 0.9, bumpMap: acoustic, bumpScale: 0.009 }),
    green: new THREE.MeshStandardMaterial({ color: '#293d26', roughness: 0.82, side: THREE.DoubleSide }),
    planter: new THREE.MeshStandardMaterial({ color: '#37342d', roughness: 0.63, metalness: 0.28 }),
    earth: new THREE.MeshStandardMaterial({ color: '#17110b', roughness: 1 }),
    bottleAmber: new THREE.MeshStandardMaterial({ color: '#a8762e', roughness: 0.3, metalness: 0.06 }),
    bottleGreen: new THREE.MeshStandardMaterial({ color: '#3f6f4d', roughness: 0.35 }),
    pastry: new THREE.MeshStandardMaterial({ color: '#d9a662', roughness: 0.85 }),
    bread: new THREE.MeshStandardMaterial({ color: '#a9763f', roughness: 0.9 }),
    china: new THREE.MeshStandardMaterial({ color: '#e8e4d8', roughness: 0.4 }),
    glassDisplay: new THREE.MeshStandardMaterial({ color: '#cfe0e4', transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0.1, depthWrite: false }),
    fridgeSteel: new THREE.MeshStandardMaterial({ color: '#3a4146', metalness: 0.75, roughness: 0.3 }),
  };
  return mats;
}

export type CinemaMaterials = ReturnType<typeof makeMaterials>;

export function labelTexture(text: string, color = '#d8c2a0', background = '#1a1815'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = color;
  ctx.font = '500 49px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 67);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function softShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0,0,0,.62)');
  gradient.addColorStop(0.55, 'rgba(0,0,0,.4)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export function posterTexture(title: string, subtitle: string, variant: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 400, 600);
  gradient.addColorStop(0, variant ? '#1e3436' : '#645045');
  gradient.addColorStop(1, '#0b0f12');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 600);
  if (variant) {
    for (let i = 5; i >= 0; i--) {
      ctx.beginPath();
      ctx.arc(200, 255, 37 + i * 22, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(204,178,132,${0.1 + i * 0.035})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(200, 255, 42, 0, Math.PI * 2);
    ctx.fillStyle = '#bbaa8f';
    ctx.fill();
  } else {
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 380 - i * 31);
      ctx.lineTo(95, 230 - i * 13);
      ctx.lineTo(183, 340 - i * 19);
      ctx.lineTo(292, 210 - i * 15);
      ctx.lineTo(400, 320 - i * 16);
      ctx.lineTo(400, 470);
      ctx.lineTo(0, 470);
      ctx.fillStyle = `rgba(14,23,27,${0.2 + i * 0.1})`;
      ctx.fill();
    }
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8cdbb';
  ctx.font = '13px Arial';
  ctx.fillText('M Y   D O N K E Y   O R I G I N A L', 200, 44);
  ctx.font = '38px Georgia';
  title.split('|').forEach((line, i) => ctx.fillText(line, 200, 465 + i * 44));
  ctx.font = '11px Arial';
  ctx.fillStyle = '#a99f91';
  ctx.fillText(subtitle, 200, 560);
  // Small donkey icon at bottom
  ctx.font = '22px Arial';
  ctx.fillStyle = '#7a6e5e';
  ctx.fillText('🫏', 200, 595);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function resolvePosterUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `https://image.tmdb.org/t/p/w500${trimmed}`;
  }
  return `https://image.tmdb.org/t/p/w500/${trimmed}`;
}

function wrapPosterText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    if (ctx.measureText(testLine).width < maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3);
}

function drawPosterCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgWidth = img.naturalWidth || img.width || 600;
  const imgHeight = img.naturalHeight || img.height || 900;
  const imgRatio = imgWidth / imgHeight;
  const targetRatio = w / h;
  let sx = 0, sy = 0, sw = imgWidth, sh = imgHeight;
  if (imgRatio > targetRatio) {
    sw = imgHeight * targetRatio;
    sx = (imgWidth - sw) / 2;
  } else {
    sh = imgWidth / targetRatio;
    sy = (imgHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * Robustly loads an image avoiding the browser CORS disk-cache collision bug.
 * When an image has been previously loaded in an <img> tag without crossOrigin,
 * Chrome/Safari/Edge can reject subsequent Image(crossOrigin='anonymous') calls.
 * We use fetch(mode:'cors') -> Blob URL as primary, with cache-busting fallbacks.
 */
async function loadPosterElement(url: string): Promise<HTMLImageElement> {
  // Strategy 1: Fetch with mode: 'cors' and convert to local Blob URL (guaranteed same-origin)
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'default' });
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => {
          URL.revokeObjectURL(objectUrl);
          reject(e);
        };
        img.src = objectUrl;
      });
    }
  } catch (_) {
    // Continue to strategy 2
  }

  // Strategy 2: Cache-busting query to bypass non-CORS cached entry in browser HTTP cache
  try {
    const sep = url.includes('?') ? '&' : '?';
    const cacheBustUrl = `${url}${sep}_cb=${Date.now()}`;
    const res = await fetch(cacheBustUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => {
          URL.revokeObjectURL(objectUrl);
          reject(e);
        };
        img.src = objectUrl;
      });
    }
  } catch (_) {
    // Continue to strategy 3
  }

  // Strategy 3: Standard Image element with crossOrigin anonymous
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Creates a dynamic 3D cinema wall poster texture.
 * Immediately paints a high-end styled canvas (with title and branding) so there is never an untextured blank,
 * then asynchronously loads and composites the movie/show poster image into the texture.
 */
export function contentPosterTexture(
  posterPath?: string | null,
  title?: string | null,
  variant = 0,
  onUpdated?: () => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 900;
  const ctx = canvas.getContext('2d')!;

  const displayTitle = title?.trim() || (variant ? 'ORBITAL' : 'THE QUIET BETWEEN');
  const subtitle = variant ? 'SOME THINGS ARE WORTH FINDING.' : 'NOW SCREENING IN 3D THEATRE';

  // Base background gradient
  const gradient = ctx.createLinearGradient(0, 0, 600, 900);
  gradient.addColorStop(0, variant ? '#192b2d' : '#3d302a');
  gradient.addColorStop(0.5, '#121619');
  gradient.addColorStop(1, '#07090b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 600, 900);

  // Geometric artwork background
  if (variant) {
    for (let i = 5; i >= 0; i--) {
      ctx.beginPath();
      ctx.arc(300, 380, 50 + i * 32, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(204,178,132,${0.08 + i * 0.03})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(300, 380, 58, 0, Math.PI * 2);
    ctx.fillStyle = '#bbaa8f';
    ctx.fill();
  } else {
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 560 - i * 45);
      ctx.lineTo(145, 340 - i * 20);
      ctx.lineTo(275, 490 - i * 28);
      ctx.lineTo(438, 315 - i * 22);
      ctx.lineTo(600, 470 - i * 24);
      ctx.lineTo(600, 680);
      ctx.lineTo(0, 680);
      ctx.fillStyle = `rgba(14,23,27,${0.2 + i * 0.1})`;
      ctx.fill();
    }
  }

  // Header branding
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8cdbb';
  ctx.font = '600 18px Arial';
  ctx.fillText('M Y   D O N K E Y   C I N E M A', 300, 65);

  // Feature Title
  ctx.fillStyle = '#f3ebe0';
  ctx.font = 'bold 42px Georgia, serif';
  const lines = wrapPosterText(ctx, displayTitle.toUpperCase(), 520);
  const startY = 660 - ((lines.length - 1) * 26);
  lines.forEach((line, i) => {
    ctx.fillText(line, 300, startY + i * 50);
  });

  // Subtitle
  ctx.font = '14px Arial';
  ctx.fillStyle = '#b4a896';
  ctx.fillText(subtitle, 300, 800);

  // Donkey icon
  ctx.font = '28px Arial';
  ctx.fillStyle = '#8a7c6a';
  ctx.fillText('🫏', 300, 855);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;

  const resolvedUrl = resolvePosterUrl(posterPath);
  if (resolvedUrl) {
    loadPosterElement(resolvedUrl)
      .then((img) => {
        ctx.clearRect(0, 0, 600, 900);
        drawPosterCover(ctx, img, 0, 0, 600, 900);

        // Subtle cinema vignette around edges so it sits naturally in the brass frame
        const vignette = ctx.createRadialGradient(300, 450, 220, 300, 450, 580);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.28)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, 600, 900);

        // Subtle inner rim line
        ctx.strokeStyle = 'rgba(214, 187, 144, 0.2)';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 596, 896);

        texture.needsUpdate = true;
        onUpdated?.();
      })
      .catch((err) => {
        console.warn('[Cinema Poster] Could not load artwork image, keeping stylized typography:', resolvedUrl, err);
      });
  }

  return texture;
}

/** Renders a MY DONKEY logo canvas texture as a fallback (used until real image loads). */
function myDonkeyLogoFallback(width: number, height: number, style: 'horizontal' | 'badge' | 'seat'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const cx = width / 2;
  const cy = height / 2;

  if (style === 'badge') {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(cx, cy));
    gradient.addColorStop(0, 'rgba(40,32,22,0.95)');
    gradient.addColorStop(1, 'rgba(20,15,10,0.98)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(cx, cy) - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,155,90,0.6)';
    ctx.lineWidth = width * 0.018;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(cx, cy) - width * 0.02, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `${height * 0.38}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🫏', cx, cy - height * 0.06);
    ctx.fillStyle = '#c8a86e';
    ctx.font = `600 ${height * 0.13}px Arial`;
    ctx.fillText('MY DONKEY', cx, cy + height * 0.32);
  } else if (style === 'seat') {
    ctx.fillStyle = '#1c1814';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(190,155,90,0.3)';
    ctx.fillRect(0, height - 3, width, 3);
    ctx.fillRect(0, 0, width, 3);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${height * 0.3}px Arial`;
    ctx.fillText('🫏', cx - width * 0.2, cy);
    ctx.fillStyle = '#c0a060';
    ctx.font = `600 ${height * 0.28}px Arial`;
    ctx.fillText('MY DONKEY', cx + width * 0.1, cy);
  } else {
    ctx.fillStyle = '#141210';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(190,155,90,0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, width - 16, height - 16);
    ctx.strokeStyle = 'rgba(190,155,90,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, width - 28, height - 28);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${height * 0.5}px Arial`;
    ctx.fillText('🫏', cx - width * 0.18, cy);
    ctx.fillStyle = '#d4af72';
    ctx.font = `700 ${height * 0.27}px Arial`;
    ctx.fillText('MY DONKEY', cx + width * 0.12, cy - height * 0.09);
    ctx.fillStyle = '#7a6e54';
    ctx.font = `${height * 0.12}px Arial`;
    ctx.fillText('3 D   C I N E M A', cx + width * 0.12, cy + height * 0.16);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Returns a MY DONKEY logo texture.
 * Immediately returns a canvas fallback, then hot-swaps to /logo.png once loaded.
 * style='badge'  → circular seat headrest badge (logo centred in a dark circle)
 * style='seat'   → compact horizontal strip for seat backs
 * style='horizontal' → wall plaque with logo + tagline
 */
export function myDonkeyLogoTexture(width = 512, height = 256, style: 'horizontal' | 'badge' | 'seat' = 'horizontal'): THREE.CanvasTexture {
  const texture = myDonkeyLogoFallback(width, height, style);

  // Async: load the real logo and composite it on top.
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    if (style === 'badge') {
      // Dark circle background
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width, height) / 2);
      gradient.addColorStop(0, 'rgba(40,32,22,0.96)');
      gradient.addColorStop(1, 'rgba(20,15,10,0.99)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      // Gold ring
      ctx.strokeStyle = 'rgba(190,155,90,0.65)';
      ctx.lineWidth = width * 0.018;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - width * 0.02, 0, Math.PI * 2);
      ctx.stroke();
      // Logo centred, taking up ~55% of badge height
      const logoSize = height * 0.55;
      const logoX = (width - logoSize) / 2;
      const logoY = height * 0.1;
      ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
      // MY DONKEY label below
      ctx.fillStyle = '#c8a86e';
      ctx.font = `600 ${height * 0.13}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MY DONKEY', width / 2, height * 0.87);
    } else if (style === 'seat') {
      // Dark strip
      ctx.fillStyle = '#1c1814';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(190,155,90,0.3)';
      ctx.fillRect(0, 0, width, 3);
      ctx.fillRect(0, height - 3, width, 3);
      // Logo on left portion
      const logoH = height * 0.75;
      const logoW = logoH;
      ctx.drawImage(img, width * 0.06, (height - logoH) / 2, logoW, logoH);
      // Text on right
      ctx.fillStyle = '#c0a060';
      ctx.font = `600 ${height * 0.3}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('MY DONKEY', width * 0.35, height / 2);
    } else {
      // Horizontal wall plaque
      ctx.fillStyle = '#141210';
      ctx.fillRect(0, 0, width, height);
      // Gold border
      ctx.strokeStyle = 'rgba(190,155,90,0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, width - 16, height - 16);
      ctx.strokeStyle = 'rgba(190,155,90,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(14, 14, width - 28, height - 28);
      // Logo on left
      const logoH = height * 0.7;
      const logoW = logoH;
      const logoX = width * 0.06;
      const logoY = (height - logoH) / 2;
      ctx.drawImage(img, logoX, logoY, logoW, logoH);
      // Text on right
      ctx.fillStyle = '#d4af72';
      ctx.font = `700 ${height * 0.3}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('MY DONKEY', width * 0.4, height * 0.38);
      ctx.fillStyle = '#7a6e54';
      ctx.font = `${height * 0.14}px Arial`;
      ctx.fillText('3 D   C I N E M A', width * 0.4, height * 0.68);
    }

    // Hot-swap the canvas into the existing texture
    // THREE.CanvasTexture keeps a reference to the canvas. We update via image property.
    (texture as THREE.CanvasTexture & { image: HTMLCanvasElement }).image = canvas;
    texture.needsUpdate = true;
  };
  img.onerror = () => { /* fallback canvas is already showing, do nothing */ };
  img.src = '/logo.png';

  return texture;
}

/**
 * Loads /logo.png and composites it into the provided canvas context
 * for the cinema idle screen. Returns a Promise that resolves when done.
 */
export function paintLogoOnScreen(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  callback: () => void
): void {
  const img = new Image();
  img.onload = () => {
    // Draw logo centred in upper-centre area
    const logoSize = Math.round(canvasH * 0.28); // ~302px at 1080p
    const logoX = (canvasW - logoSize) / 2;
    const logoY = Math.round(canvasH * 0.2);
    ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
    callback();
  };
  img.onerror = callback; // proceed without logo if missing
  img.src = '/logo.png';
}
