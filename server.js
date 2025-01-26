/**
 * Scripted By: Duylinh Nguyen
 * Server-Side Three.js Rendering with Express and Origami Integration
 * ... (description and dependencies)
 */

const express = require('express');
const path = require('path');
const THREE = require('three');
const createGL = require('gl');
const { JSDOM } = require('jsdom');
const { PNG } = require('pngjs');

const app = express();
const port = 3002;
app.use(express.json());
let startTime = Date.now();

app.use(express.static(path.join(__dirname, 'public')));

app.post('/render-scene', (req, res) => {
    try {
        const { window } = new JSDOM('<!DOCTYPE html><canvas></canvas>');
        global.document = window.document;
        global.window = window;
        global.navigator = { userAgent: 'node.js' };

        const { time, color, fov, aspect, size } = req.body;

        const actualSize = size?.X || 256;
        let actualWidth = actualSize;
        let actualHeight = actualSize;

        if (aspect) {
            actualWidth = actualSize * aspect;
            actualHeight = actualSize; // Important: Set height correctly
        }

        const gl = createGL(actualWidth, actualHeight, { preserveDrawingBuffer: true });

        const halfFloatExt = gl.getExtension('OES_texture_half_float');
        if (!halfFloatExt) {
            console.warn('OES_texture_half_float is not supported.');
        }

        const halfFloatLinearExt = gl.getExtension('OES_texture_half_float_linear');
        if (!halfFloatLinearExt) {
            console.warn('OES_texture_half_float_linear is not supported.');
        }

        const depthTextureExt = gl.getExtension('WEBGL_depth_texture');
        if (!depthTextureExt) {
            console.warn('WEBGL_depth_texture is not supported.');
        }

        const renderer = new THREE.WebGLRenderer({ context: gl });
        renderer.setSize(actualWidth, actualHeight);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(fov || 75, actualWidth / actualHeight, 0.1, 1000);

        const geometry = new THREE.BoxGeometry();

        let actualColor;
        if (color) {
            actualColor = new THREE.Color(color.X, color.Y, color.Z);
            actualColor.convertSRGBToLinear();
            actualColor.multiplyScalar(color.W);
        } else {
            actualColor = new THREE.Color(0x800080);
        }

        const material = new THREE.MeshStandardMaterial({ color: actualColor });
        const cube = new THREE.Mesh(geometry, material);
        cube.castShadow = false;
        scene.add(cube);

        const light = new THREE.SpotLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        scene.add(light);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        camera.position.z = 5;

        const animate = (time) => {
            cube.rotation.x = time * 0.001;
            cube.rotation.y = time * 0.0005;
            renderer.render(scene, camera);
        };

        const elapsedTime = time || Date.now() - startTime;
        animate(elapsedTime);

        const data = new Uint8Array(actualWidth * actualHeight * 4);
        gl.readPixels(0, 0, actualWidth, actualHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
        // console.log("data.length:", data.length);
        const allZero = data.every(val => val === 0);
        // console.log("All data zero:", allZero);

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

        // Ensure the data is correctly copied before creating the PNG
        // console.log("Flipped data length:", flippedData.length);
        const allFlippedZero = flippedData.every(val => val === 0);
        // console.log("All flipped data zero:", allFlippedZero);

        let pngBuffer;
        try {
            const png = new PNG({ width: actualWidth, height: actualHeight });
            png.data = Buffer.from(flippedData); // Use the correctly flipped data
            pngBuffer = PNG.sync.write(png);
            // console.log("pngBuffer.length:", pngBuffer.length);
            // console.log("First 16 bytes of pngBuffer:", pngBuffer.slice(0, 16).toString('hex'));
        } catch (pngError) {
            // console.error("Error during PNG encoding:", pngError);
            return res.status(500).send("Error encoding PNG");
        }
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': pngBuffer.length
        });
        res.end(pngBuffer);

    } catch (error) { // Outer catch block
        console.error("Error in /render-scene:", error);
        res.status(500).send("Error rendering scene");
    } // Close outer try/catch
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});