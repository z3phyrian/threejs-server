/**
 * Scripted By: Duylinh Nguyen
 * Server-Side Three.js Rendering with Express and Origami Integration
 *
 * This script creates a Node.js server using Express that renders a 3D scene using Three.js and headless-gl.
 * It receives rendering parameters (time, color, fov, aspect, size) from Origami Studio via POST requests with a JSON body.
 * The rendered image is then sent back to Origami as a base64 encoded PNG within a JSON response.
 * Shadows are enabled in the scene.
 *
 * Dependencies:
 *   - express
 *   - three
 *   - gl (headless-gl)
 *   - jsdom
 *   - pngjs
 */

const express = require('express');
const path = require('path');
const THREE = require('three');
const createGL = require('gl');
const { JSDOM } = require('jsdom');
const { PNG } = require('pngjs');

const app = express();
const port = 3002;
app.use(express.json()); // Enable JSON body parsing
let startTime = Date.now(); // Store server start time for animation

app.use(express.static(path.join(__dirname, 'public')));

app.post('/render-scene', (req, res) => { // Handle POST requests to /render-scene
    try {
        // Create a dummy DOM environment for Three.js
        const { window } = new JSDOM('<!DOCTYPE html><canvas></canvas>');
        global.document = window.document;
        global.window = window;
        global.navigator = { userAgent: 'node.js' };

        // Get rendering parameters from the request body
        const { time, color, fov, aspect, size } = req.body;

        // Set width and height based on size and aspect, with default values
        const actualSize = size?.X || 256;
        let actualWidth = actualSize;
        let actualHeight = actualSize;

        if(aspect) {
            actualWidth = actualSize * aspect;
        }

        // Create a headless WebGL context
        const gl = createGL(actualWidth, actualHeight, { preserveDrawingBuffer: true });

        // Check for required WebGL extensions
        const halfFloatExt = gl.getExtension('OES_texture_half_float');
        if (!halfFloatExt) {
            console.warn('OES_texture_half_float is not supported. Some features may be disabled.');
            // Disable features that require half-float textures if needed
            // renderer.toneMapping = THREE.NoToneMapping; // Example
        }

        const halfFloatLinearExt = gl.getExtension('OES_texture_half_float_linear');
        if (!halfFloatLinearExt) {
            console.warn('OES_texture_half_float_linear is not supported. Some features may be disabled.');
            // Disable features that require half-float linear filtering if needed
        }

        const depthTextureExt = gl.getExtension('WEBGL_depth_texture');
        if (!depthTextureExt) {
            console.warn('WEBGL_depth_texture is not supported. Shadows may not work as expected.');
        }

        // Create a Three.js WebGL renderer using the headless context
        const renderer = new THREE.WebGLRenderer({ context: gl });
        renderer.setSize(actualWidth, actualHeight);
        // renderer.shadowMap.enabled = true; // Enable shadow mapping
        // renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use PCF soft shadows

        // Create a Three.js scene and camera
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(fov || 75, actualWidth / actualHeight, 0.1, 1000);

        // Create a cube
        const geometry = new THREE.BoxGeometry();

        // Handle color from request body (W, X, Y, Z components)
        let actualColor;
        if (color) {
            actualColor = new THREE.Color(color.X, color.Y, color.Z);
            actualColor.convertSRGBToLinear();
            actualColor.multiplyScalar(color.W);
        } else {
            actualColor = new THREE.Color(0x800080); // Default color
        }

        const material = new THREE.MeshStandardMaterial({ color: actualColor }); // Use MeshStandardMaterial for shadows
        const cube = new THREE.Mesh(geometry, material);
        cube.castShadow = true; // Make the cube cast shadows
        scene.add(cube);

        // Create a spot light
        const light = new THREE.SpotLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        light.castShadow = true; // Make the light cast shadows
        light.shadow.mapSize.width = 1024; // Increase shadow map size
        light.shadow.mapSize.height = 1024;
        scene.add(light);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        camera.position.z = 5;

        // Animation function
        const animate = (time) => {
            cube.rotation.x = time * 0.001;
            cube.rotation.y = time * 0.0005;
            renderer.render(scene, camera);
        };

        // Calculate elapsed time and animate
        const elapsedTime = time || Date.now() - startTime;
        animate(elapsedTime);

        // Read pixel data from the WebGL context
        const data = new Uint8Array(actualWidth * actualHeight * 4);
        gl.readPixels(0, 0, actualWidth, actualHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);

        // Flip the image vertically (WebGL reads pixels from bottom-left)
        const flippedData = new Uint8Array(actualWidth * actualHeight * 4);
        for (let y = 0; y < actualHeight; y++) {
            for (let x = 0; x < actualWidth; x++) {
                const sourceIndex = (y * actualWidth + x) * 4;
                const targetIndex = ((actualHeight - 1 - y) * actualWidth + x) * 4;
                flippedData[targetIndex] = data[sourceIndex];
                flippedData[targetIndex + 1] = data[sourceIndex + 1];
                flippedData[targetIndex + 2] = data[sourceIndex + 2];
                flippedData[targetIndex + 3] = data[sourceIndex + 3];
            }
        }

        // Create a PNG image from the flipped pixel data
        const png = new PNG({ width: actualWidth, height: actualHeight });
        png.data = Buffer.from(flippedData);
        const pngBuffer = PNG.sync.write(png);
        const base64 = pngBuffer.toString('base64');

        // Send the base64 string in a JSON response
        const jsonResponse = {
            imageData: base64
        };

        res.json(jsonResponse);

    } catch (error) {
        console.error("Error in /render-scene:", error);
        res.status(500).json({ error: "Error rendering scene" });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});