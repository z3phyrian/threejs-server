const createGL = require('gl');

try {
    const width = 256;
    const height = 256;
    const gl = createGL(width, height, { preserveDrawingBuffer: true });

    if (!gl) {
        console.error("Failed to create WebGL context.");
    } else {
        console.log("WebGL context created successfully!");
        // Example: clear the canvas
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
} catch (error) {
    console.error("Error:", error);
}
