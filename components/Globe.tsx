"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Float } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
function Planet() {
  const group = useRef<THREE.Group>(null);
  const points = useMemo(() => {
    const p = [];
    for (let i = 0; i < 3600; i++) {
      const y = 1 - (i / 3599) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = i * 2.399963;
      const x = Math.cos(theta) * radius,
        z = Math.sin(theta) * radius;
      const land =
        Math.sin(x * 9 + y * 5) +
        Math.cos(z * 8 - y * 4) +
        Math.sin(z * 13 + x * 6);
      if (land > 0.28) p.push(x * 2.015, y * 2.015, z * 2.015);
    }
    return new Float32Array(p);
  }, []);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.035;
  });
  return (
    <group ref={group} rotation={[0.15, -0.5, 0.1]}>
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          color="#0b2f28"
          roughness={0.9}
          metalness={0.18}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.005, 28, 20]} />
        <meshBasicMaterial
          color="#268364"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#69d5a3"
          size={0.026}
          sizeAttenuation
          transparent
          opacity={0.8}
        />
      </points>
      <mesh rotation={[Math.PI / 2.5, 0.4, 0]}>
        <torusGeometry args={[2.35, 0.006, 8, 160]} />
        <meshBasicMaterial color="#4b9f82" transparent opacity={0.38} />
      </mesh>
      {[
        [1.2, 0.8, 1.4],
        [-0.9, 0.3, 1.77],
        [0.4, -0.9, 1.75],
      ].map((p, i) => (
        <group key={i} position={p as [number, number, number]}>
          <mesh>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshBasicMaterial color="#9effce" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color="#59e4a1" transparent opacity={0.16} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
export default function Globe() {
  return (
    <Canvas
      camera={{ position: [0, 0.2, 6.8], fov: 43 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      fallback={
        <div className="visual-fallback">
          3D rendering is unavailable. Explore the geospatial map instead.
        </div>
      }
    >
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 4, 5]} intensity={3} color="#b6ffe0" />
      <Stars radius={60} depth={25} count={900} factor={2} fade speed={0.2} />
      <Float speed={0.7} floatIntensity={0.15} rotationIntensity={0.06}>
        <Planet />
      </Float>
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={4.8}
        maxDistance={9}
        autoRotate={false}
      />
    </Canvas>
  );
}
