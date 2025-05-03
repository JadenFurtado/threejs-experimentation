import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { Water } from 'three/addons/objects/Water.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a); // Dark background to match website

// Get container
const container = document.getElementById('three-container');

// Create a group for the model
const modelGroup = new THREE.Group();
scene.add(modelGroup);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(15, 8, 15);
camera.lookAt(0, 0, 0);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true 
});
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
container.appendChild(renderer.domElement);

// Enhanced Lighting Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// Key Light (sun)
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(50, 75, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 500;
scene.add(sunLight);

// Fill light for better vessel visibility
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-50, 50, -50);
scene.add(fillLight);

// Create water with darker color to match theme
const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
const water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }),
    alpha: 1.0,
    sunDirection: sunLight.position.clone().normalize(),
    sunColor: 0xffffff,
    waterColor: 0x001133, // Darker blue water color
    distortionScale: 2.5,
    fog: scene.fog !== undefined
});
water.rotation.x = -Math.PI / 2;
water.position.y = -0.1;
scene.add(water);

// Particle system variables
let particleSystem;
const particleCount = 150; // Increased particle count

// Create particle system
function createParticleSystem() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const material = new THREE.PointsMaterial({
        size: 0.05,
        map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true
    });

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = (Math.random() * 20);
        positions[i * 3 + 2] = 0;

        // Blue color gradient to match website theme
        const intensity = Math.random();
        colors[i * 3] = 0.05;  // R (slight red for better blend)
        colors[i * 3 + 1] = 0.4 + (intensity * 0.3);  // G
        colors[i * 3 + 2] = 1.0;  // B (full blue)

        sizes[i] = Math.random() * 0.05 + 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

// Update particle positions
function updateParticles() {
    if (!particleSystem) return;

    const positions = particleSystem.geometry.attributes.position.array;
    const colors = particleSystem.geometry.attributes.color.array;

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += 0.08; // Slightly slower upward movement

        if (positions[i * 3 + 1] > 20) {
            positions[i * 3 + 1] = 0;
            positions[i * 3] = (Math.random() - 0.5) * 0.3; // Tighter spread
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

            // Update color intensity
            colors[i * 3 + 2] = Math.random() * 0.8; // Blue variation
        }
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.geometry.attributes.color.needsUpdate = true;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}
window.addEventListener('resize', onWindowResize);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true;
controls.minDistance = 5;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI / 2.1;

// Loading manager
const manager = new THREE.LoadingManager();
const loadingElement = document.getElementById('loading');

manager.onStart = function(url, itemsLoaded, itemsTotal) {
    loadingElement.style.display = 'block';
};

manager.onLoad = function() {
    loadingElement.style.display = 'none';
};

manager.onProgress = function(url, itemsLoaded, itemsTotal) {
    loadingElement.textContent = 'Loading: ' + Math.round(itemsLoaded / itemsTotal * 100) + '%';
};

manager.onError = function(url) {
    console.error('Error loading', url);
};

// Load model
const mtlLoader = new MTLLoader(manager);
mtlLoader.load('models/LPG_Tanker_Ship.mtl', function(materials) {
    materials.preload();
    
    const objLoader = new OBJLoader(manager);
    objLoader.setMaterials(materials);
    objLoader.load('models/LPG_Tanker_Ship.obj', onModelLoad);
});

function onModelLoad(object) {
    object.traverse(function(child) {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                child.material.side = THREE.DoubleSide;
                child.material.shadowSide = THREE.BackSide;
                child.material.transparent = true;
                child.material.opacity = 0.5;
                child.material.needsUpdate = true;
            }
        }
    });

    modelGroup.position.set(0, 0, 0);
    modelGroup.add(object);
    object.rotation.x -= Math.PI / 2;

    const box = new THREE.Box3().setFromObject(modelGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 10 / maxDim;

    object.position.sub(center);
    modelGroup.scale.multiplyScalar(scale);
    modelGroup.position.y = (size.y * scale) / 2;

    // Create a small box at particle source
    const boxGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const boxMaterial = new THREE.MeshPhongMaterial({
        color: 0x0d6efd,
        transparent: true,
        opacity: 1,
        emissive: 0x0d6efd,
        emissiveIntensity: 0.5
    });
    const sourceBox = new THREE.Mesh(boxGeometry, boxMaterial);
    scene.add(sourceBox);

    createParticleSystem();
    
    if (particleSystem) {
        particleSystem.position.copy(modelGroup.position);
        particleSystem.position.y -= 0.8;
        particleSystem.position.z -= 0.1;
        particleSystem.position.x += 0;

        // Position the source box at particle origin
        sourceBox.position.copy(particleSystem.position);
    }

    const distance = 20;
    camera.position.set(distance, distance/2, distance);
    controls.target.set(0, (size.y * scale) / 2, 0);
    controls.update();
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    water.material.uniforms['time'].value += clock.getDelta() * 0.25;
    updateParticles();
    controls.update();
    renderer.render(scene, camera);
}

animate();
