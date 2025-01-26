const express = require('express');
const path = require('path');
const THREE = require('three');
const createGL = require('gl');
const { JSDOM } = require('jsdom'); // Import JSDOM
const { PNG } = require('pngjs');

const app = express();
const port = 3002;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/render-scene', (req, res) => {
    try {
        // ***Create a dummy DOM environment***
        const { window } = new JSDOM('<!DOCTYPE html><canvas></canvas>');
        global.document = window.document;
        global.window = window;
        global.navigator = { userAgent: 'node.js' };

        const width = 256;
        const height = 256;

        // Create a WebGL context (WebGL1 only)
        const gl = createGL(width, height, { preserveDrawingBuffer: true });

        if (!gl) {
            throw new Error("Failed to create WebGL context.");
        }

        // Initialize the WebGLRenderer with a WebGL1 context
        const renderer = new THREE.WebGLRenderer({
            context: gl,
            powerPreference: 'high-performance',
        });

        renderer.setSize(width, height);

        // Create a scene, camera, and cube
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x800080 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        camera.position.z = 5;

        // Render the scene
        renderer.render(scene, camera);

        // Extract pixel data
        const data = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);

        // Create a PNG from the pixel data
        const png = new PNG({ width, height });
        png.data = Buffer.from(data);

        const pngBuffer = PNG.sync.write(png);

        // Send the PNG as a response
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(pngBuffer);
    } catch (error) {
        console.error("Error in /render-scene:", error);
        res.status(500).send("Error rendering scene");
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
