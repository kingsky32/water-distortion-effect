import * as THREE from "three";

export class Planes {
  constructor(sceneManager, image) {
    this.sceneManager = sceneManager;
    this.meshes = [];
    this.image = image;
    this.textures = null;
    this.hovering = -1;
    this.initiated = false;
    this.uniforms = {
      uPlaneSize: new THREE.Uniform(new THREE.Vector2(0, 0))
    };
  }
  load(loader) {
    loader.begin("image");
    var textureLoader = new THREE.TextureLoader();
    textureLoader.load(this.image, image => {
      this.textures = image;
      loader.end("image");
    });
  }
  init() {
    this.initiated = true;
    const { width, height } = this.sceneManager.getViewSize();

    const planeMetrics = this.getPlaneMetrics(width, height, window.innerWidth, window.innerHeight);

    const geometry = new THREE.PlaneBufferGeometry(
      planeMetrics.planeWidth,
      planeMetrics.planeHeight,
      1,
      1
    );
    this.uniforms.uPlaneSize.value.set(planeMetrics.planeWidth, planeMetrics.planeHeight);
    this.uniforms.uPlaneSize.needsUpdate = true;

    let space = planeMetrics.space * 10;
    let texture = this.textures;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uZoom: new THREE.Uniform(0),
        uZoomDelta: new THREE.Uniform(0.2),
        uPlaneSize: this.uniforms.uPlaneSize,
        uImage: new THREE.Uniform(texture),
        uImageSize: new THREE.Uniform(
          new THREE.Vector2(texture ? texture.image.width : 0, texture ? texture.image.height : 0)
        ),
        uMouse: new THREE.Uniform(new THREE.Vector2(0, 0))
      },
      fragmentShader,
      vertexShader: `
          varying vec2 vUv;
          void main() {
            
          }`
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = space;
    mesh.userData.index = 0;
    this.meshes.push(mesh);
    this.sceneManager.scene.add(mesh);
  }
  getPlaneMetrics(viewWidth, viewHeight, width, height) {
    const planeWidth = viewWidth / 4.5;
    if (width < 800) {
      return {
        planeWidth: viewWidth / 3,
        planeHeight: viewHeight * 0.8,
        x: 0,
        // Calculate the resting(empty) space and divided by number of planes
        space: viewWidth / 3
      };
    }
    return {
      planeWidth,
      planeHeight: viewHeight * 0.8,
      x: viewWidth / 5 / 1.5,
      // Calculate the resting(empty) space and divided by number of planes
      space: (viewWidth - viewWidth / 5 / 1.5 * 2 - planeWidth) / 2
    };
  }
  onResize(width, height) {
    const viewSize = this.sceneManager.getViewSize();

    const planeMetrics = this.getPlaneMetrics(viewSize.width, viewSize.height, width, height);
    const geometry = new THREE.PlaneBufferGeometry(
      planeMetrics.planeWidth,
      planeMetrics.planeHeight,
      1,
      1
    );

    this.uniforms.uPlaneSize.value.set(planeMetrics.planeWidth, planeMetrics.planeHeight);
    this.uniforms.uPlaneSize.needsUpdate = true;

    let translateToLeft = -viewSize.width / 2 + planeMetrics.planeWidth / 2;
    let x = translateToLeft + planeMetrics.x;
    let space = planeMetrics.space;

    this.meshes.forEach((mesh, i) => {
      mesh.geometry.dispose();
      mesh.geometry = geometry;
      mesh.position.x = x + i * space;
    });
  }
}

const fragmentShader = `
uniform float uZoom;
uniform float uZoomDelta;
uniform vec2 uMouse;

uniform vec2 uPlaneSize;
uniform sampler2D uImage;
uniform vec2 uImageSize;

varying vec2 vUv;

vec2 withRatio(vec2 uv, vec2 canvasSize, vec2 textureSize){
    
vec2 ratio = vec2(
    min((canvasSize.x / canvasSize.y) / (textureSize.x / textureSize.y), 1.0),
    min((canvasSize.y / canvasSize.x) / (textureSize.y / textureSize.x), 1.0)
  );

return vec2(
    uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
    uv.y * ratio.y + (1.0 - ratio.y) * 0.5
  );
}

void main() {
  vec2 uv = vUv;
  uv -= 0.5;
  uv *= 1.- uZoomDelta * uZoom;
  uv += uZoomDelta * (uMouse-0.5) * 0.5 * uZoom;
  uv += 0.5;
  uv = withRatio(uv, uPlaneSize, uImageSize);
  vec3 tex = texture2D(uImage, uv).xyz;
}`;
