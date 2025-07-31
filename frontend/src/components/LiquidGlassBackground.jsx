// frontend/src/components/LiquidGlassBackground.jsx
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, createPortal } from '@react-three/fiber';
import { OrthographicCamera, useFBO } from '@react-three/drei';
import * as THREE from 'three';

import vertexShader from '../vertexShader.glsl?raw';
import fragmentShader from '../fragmentShader.glsl?raw';
import ShaderBlobs from './ShaderBlobs'; // Импортируем наши новые 3D-капли

function GlassScene() {
    // Создаем отдельную сцену для наших "капель"
    const blobScene = useMemo(() => new THREE.Scene(), []);
    const camera = useRef();
    const target = useFBO(); // Frame Buffer Object для рендера в текстуру

    const uniforms = useMemo(() => ({
        u_background: { value: null },
        u_time: { value: 0.0 },
        u_blur: { value: 15.0 },
        u_resolution: { value: new THREE.Vector2() }
    }), []);
    
    useFrame((state) => {
        uniforms.u_time.value = state.clock.getElapsedTime();
        uniforms.u_resolution.value.set(state.size.width * state.viewport.dpr, state.size.height * state.viewport.dpr);

        // 1. Рендерим сцену с "каплями" в нашу текстуру (target)
        state.gl.setRenderTarget(target);
        state.gl.render(blobScene, camera.current);
        
        // 2. Передаем эту текстуру в наш шейдер
        uniforms.u_background.value = target.texture;
        
        // 3. Сбрасываем рендер-таргет, чтобы теперь рендерить на экран
        state.gl.setRenderTarget(null);
    });

    return (
        <>
            <OrthographicCamera ref={camera} makeDefault position={[0, 0, 10]} zoom={1} />
            {/* Рендерим наши 3D-капли в их отдельную сцену */}
            {createPortal(<ShaderBlobs />, blobScene)}
            
            {/* Это наша плоскость со "стеклом", которая будет видна на экране */}
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