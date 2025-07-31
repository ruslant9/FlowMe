// frontend/src/components/ShaderBlobs.jsx

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Blob = ({ color, position, speed, scaleFactor }) => {
    const mesh = useRef();

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (mesh.current) {
            mesh.current.position.x = position[0] + Math.sin(time * speed.x) * scaleFactor.x;
            mesh.current.position.y = position[1] + Math.cos(time * speed.y) * scaleFactor.y;
            mesh.current.position.z = position[2] + Math.sin(time * speed.z) * scaleFactor.z;
        }
    });

    return (
        <mesh ref={mesh} position={position}>
            <sphereGeometry args={[1.5, 32, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
    );
};

const ShaderBlobs = () => {
    return (
        <>
            <Blob 
                color={new THREE.Color("#007BFF")} 
                position={[-3, -1, -5]} 
                speed={{x: 0.3, y: 0.4, z: 0.2}} 
                scaleFactor={{x: 2, y: 3, z: 1}} 
            />
            <Blob 
                color={new THREE.Color("#8A2BE2")} 
                position={[3, 2, -6]} 
                speed={{x: 0.2, y: 0.3, z: 0.5}} 
                scaleFactor={{x: 3, y: 2, z: 1.5}} 
            />
            <Blob 
                color={new THREE.Color("#00CED1")} 
                position={[0, 3, -4]} 
                speed={{x: 0.5, y: 0.2, z: 0.3}} 
                scaleFactor={{x: 2.5, y: 2, z: 1}} 
            />
        </>
    );
};

export default ShaderBlobs;