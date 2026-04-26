/**
 * NexaERP — Three.js 3D Logo Script
 * Renders a rotating 3D Diamond for the brand panel
 */

const init3DLogo = () => {
    const container = document.querySelector('.brand-logo-wrap');
    if (!container) return;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'three-logo-canvas';
    canvas.style.width = '60px';
    canvas.style.height = '60px';
    canvas.style.position = 'absolute';
    canvas.style.left = '-10px';
    canvas.style.top = '-10px';
    canvas.style.zIndex = '1';
    
    // Replace the static icon with this if needed, or overlay it
    const icon = document.querySelector('.brand-icon');
    if (icon) {
        icon.style.position = 'relative';
        icon.appendChild(canvas);
        // Hide the SVG inside if we want full 3D
        const svg = icon.querySelector('svg');
        if (svg) svg.style.opacity = '0.2';
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 2;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(60, 60);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Create Diamond Geometry
    const geometry = new THREE.OctahedronGeometry(1, 0);
    const material = new THREE.MeshPhongMaterial({
        color: 0x6366f1,
        emissive: 0x4f46e5,
        specular: 0xffffff,
        shininess: 100,
        flatShading: true,
        transparent: true,
        opacity: 0.9
    });

    const diamond = new THREE.Mesh(geometry, material);
    scene.add(diamond);

    // Wireframe overlay
    const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.2 });
    const wireframe = new THREE.Mesh(geometry, wireMaterial);
    diamond.add(wireframe);

    // Lights
    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(1, 1, 1);
    scene.add(light1);

    const light2 = new THREE.AmbientLight(0x404040, 2);
    scene.add(light2);

    const animate = () => {
        requestAnimationFrame(animate);
        diamond.rotation.y += 0.01;
        diamond.rotation.x += 0.005;
        renderer.render(scene, camera);
    };

    animate();
};

// Load Three.js dynamically if not present
if (typeof THREE === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
    script.onload = init3DLogo;
    document.head.appendChild(script);
} else {
    init3DLogo();
}
