import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import type { EmbedMedia } from '../catalog/types';
import type { ProviderStatus } from './types';
import { validateEmbed } from '../catalog/servers';

export class ProviderSurface {
  private renderer = new CSS3DRenderer();
  private scene = new THREE.Scene();
  private plane: CSS3DObject;
  private iframe: HTMLIFrameElement | null = null;
  private dockIframe: HTMLIFrameElement | null = null;
  private media: EmbedMedia | null = null;
  private dock: HTMLDivElement | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private status: ProviderStatus = 'idle';
  private screen: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private onStatus: (status: ProviderStatus) => void;

  constructor(host: HTMLDivElement, screen: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>, onStatus: (status: ProviderStatus) => void) {
    this.screen = screen;
    this.onStatus = onStatus;
    this.renderer.domElement.className = 'provider-world-layer';
    const initWidth = host.clientWidth || window.innerWidth;
    const initHeight = host.clientHeight || window.innerHeight;
    this.renderer.setSize(initWidth, initHeight);
    host.appendChild(this.renderer.domElement);

    const element = document.createElement('div');
    element.className = 'provider-world-screen';
    element.style.width = '1600px';
    element.style.height = '900px';
    this.plane = new CSS3DObject(element);
    // Position directly on the front cinema screen wall in 3D (Z = -6.805, facing audience)
    this.plane.position.set(screen.position.x, screen.position.y, -6.805);
    this.plane.scale.setScalar(7.8 / 1600);
    this.scene.add(this.plane);
    this.renderer.domElement.style.display = 'none';
    window.addEventListener('message', this.onMessage);
  }

  private setStatus(status: ProviderStatus) {
    this.status = status;
    this.onStatus(status);
  }

  load(media: EmbedMedia) {
    if (!validateEmbed(media)) throw new Error('The provider URL does not match the selected title and server.');
    this.clear();
    this.media = media;

    // 1. Primary iframe mounted onto the 3D cinema screen on the wall
    const frame = document.createElement('iframe');
    frame.className = 'provider-iframe';
    frame.title = `${media.title} - ${media.selection.server} main cinema screen`;
    frame.allow = 'autoplay *; fullscreen *; encrypted-media *; picture-in-picture *; clipboard-write *';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.addEventListener('load', () => {
      if (frame !== this.iframe) return;
      if (this.timeout) clearTimeout(this.timeout);
      this.setStatus('opened');
    });
    frame.addEventListener('error', () => {
      if (frame === this.iframe) this.setStatus('error');
    });
    frame.src = media.url;
    this.iframe = frame;
    this.setStatus('opening');

    this.plane.element.innerHTML = '';
    this.plane.element.appendChild(frame);
    this.renderer.domElement.style.display = 'block';

    // 2. Synchronize dock in side panel if currently open
    this.syncDock();

    this.timeout = setTimeout(() => {
      if (this.status === 'opening') this.setStatus('slow');
    }, 9000);
  }

  setDock(dock: HTMLDivElement | null) {
    this.dock = dock;
    this.syncDock();
  }

  private syncDock() {
    if (!this.dock) {
      if (this.dockIframe) {
        try { this.dockIframe.src = 'about:blank'; } catch {}
        this.dockIframe.remove();
        this.dockIframe = null;
      }
      return;
    }

    // When dock panel is open, mount preview frame inside dock
    this.dock.innerHTML = '';
    if (this.media) {
      const dFrame = document.createElement('iframe');
      dFrame.className = 'provider-iframe';
      dFrame.title = `${this.media.title} - ${this.media.selection.server} dock player`;
      dFrame.allow = 'autoplay *; fullscreen *; encrypted-media *; picture-in-picture *; clipboard-write *';
      dFrame.allowFullscreen = true;
      dFrame.referrerPolicy = 'strict-origin-when-cross-origin';
      dFrame.src = this.media.url;
      this.dock.appendChild(dFrame);
      this.dockIframe = dFrame;
    }
  }

  private onMessage = (event: MessageEvent) => {
    if (!this.media || !this.iframe || event.source !== this.iframe.contentWindow) return;
    try {
      if (event.origin !== new URL(this.media.url).origin) return;
    } catch { return; }
    let data: unknown = event.data;
    if (typeof data === 'string') {
      if (data.length > 10000) return;
      try { data = JSON.parse(data); } catch { return; }
    }
    if (data && typeof data === 'object') {
      const str = JSON.stringify(data).toLowerCase();
      if (str.includes('error') || str.includes('fail') || str.includes('not_found') || str.includes('unavailable')) {
        this.setStatus('error');
      }
    }
  };

  resize(width: number, height: number) {
    this.renderer.setSize(width, height);
  }

  render(camera: THREE.Camera) {
    if (this.media) {
      this.renderer.render(this.scene, camera);
    }
  }

  get isInRoom() {
    return !!this.media;
  }

  get currentStatus() {
    return this.status;
  }

  reload() {
    if (this.media) this.load(this.media);
  }

  clear() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
    if (this.iframe) {
      try { this.iframe.src = 'about:blank'; } catch {}
      this.iframe.remove();
      this.iframe = null;
    }
    if (this.dockIframe) {
      try { this.dockIframe.src = 'about:blank'; } catch {}
      this.dockIframe.remove();
      this.dockIframe = null;
    }
    if (this.dock) this.dock.innerHTML = '';
    this.plane.element.innerHTML = '';
    this.renderer.domElement.style.display = 'none';
    this.media = null;
    this.status = 'idle';
  }

  dispose() {
    this.clear();
    this.renderer.domElement.remove();
    window.removeEventListener('message', this.onMessage);
  }
}