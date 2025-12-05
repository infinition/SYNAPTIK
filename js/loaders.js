// ==========================================
// SIMPLE OBJ LOADER
// ==========================================
class SimpleOBJLoader {
    static parse(text) {
        const vertices = [];
        const normals = [];
        const uvs = [];
        const faces = [];

        const lines = text.split('\n');

        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('v ')) {
                const parts = line.split(/\s+/);
                vertices.push(
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                );
            } else if (line.startsWith('vn ')) {
                const parts = line.split(/\s+/);
                normals.push(
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                );
            } else if (line.startsWith('vt ')) {
                const parts = line.split(/\s+/);
                uvs.push(
                    parseFloat(parts[1]),
                    parseFloat(parts[2])
                );
            } else if (line.startsWith('f ')) {
                const parts = line.split(/\s+/).slice(1);
                const faceVertices = [];

                for (let part of parts) {
                    const indices = part.split('/');
                    faceVertices.push(parseInt(indices[0]) - 1);
                }

                // Triangulate if needed
                if (faceVertices.length === 3) {
                    faces.push(...faceVertices);
                } else if (faceVertices.length === 4) {
                    faces.push(faceVertices[0], faceVertices[1], faceVertices[2]);
                    faces.push(faceVertices[0], faceVertices[2], faceVertices[3]);
                }
            }
        }

        const geometry = new THREE.BufferGeometry();

        // Build final vertex array
        const finalVertices = [];
        for (let i = 0; i < faces.length; i++) {
            const idx = faces[i];
            finalVertices.push(
                vertices[idx * 3],
                vertices[idx * 3 + 1],
                vertices[idx * 3 + 2]
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(finalVertices, 3));
        geometry.computeVertexNormals();

        return geometry;
    }
}
