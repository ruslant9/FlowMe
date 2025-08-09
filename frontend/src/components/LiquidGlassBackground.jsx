// frontend/src/components/LiquidGlassBackground.jsx
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, createPortal, useThree } from '@react-three/fiber';
import { OrthographicCamera, useFBO } from '@react-three/drei';

import * as THREE from 'three';

import vertexShader from '../vertexShader.glsl?raw';
import fragmentShader from '../fragmentShader.glsl?raw';
import ShaderBlobs from './ShaderBlobs'; // Импортируем наши новые 3D-капли

function GlassScene() {
    const blobScene = useMemo(() => new THREE.Scene(), []);
    const camera = useRef();
    const { size, viewport, gl } = useThree();
    const target = useFBO(size.width * viewport.dpr, size.height * viewport.dpr);

    const uniforms = useMemo(() => ({
        u_background: { value: null },
        u_time: { value: 0.0 },
        u_blur: { value: 15.0 },
        u_resolution: { value: new THREE.Vector2() }
    }), []);

    useFrame((state) => {
        if (!camera.current) return;

        uniforms.u_time.value = state.clock.getElapsedTime();
        uniforms.u_resolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr);

        // Обновляем размер render target, если нужно (например при ресайзе)
        if (target.width !== size.width * viewport.dpr || target.height !== size.height * viewport.dpr) {
            target.setSize(size.width * viewport.dpr, size.height * viewport.dpr);
        }

        gl.setRenderTarget(target);
        gl.render(blobScene, camera.current);
        gl.setRenderTarget(null);

        uniforms.u_background.value = target.texture;
    });

    return (
        <>
            <OrthographicCamera ref={camera} makeDefault position={[0, 0, 10]} zoom={1} />
            {createPortal(<ShaderBlobs />, blobScene)}
            <mesh>
                <planeGeometry args={[2, 2]} />
                <shaderMaterial
                    uniforms={uniforms}
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                />
            </mesh>
        </>
    )
}

const LiquidGlassBackground = () => {
    return (
        <Canvas style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 0 // Изменено на 0, т.к. фон должен быть за контентом с z-10
        }}>
            <GlassScene />
        </Canvas>
    );
};

export default LiquidGlassBackground;