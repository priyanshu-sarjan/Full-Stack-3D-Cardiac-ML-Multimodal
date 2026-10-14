import * as THREE from 'three';

export const CoronaryPulseShader = {
  uniforms: {
    uTime: { value: 0 },
    uStenosis: { value: 0.0 }, // 0.0 = clean, 1.0 = total occlusion
    uFlowSpeed: { value: 3.5 }, // cm/s normalized
    uPulseFrequency: { value: 1.2 }, // heart rate multiplier
    uBaseColor: { value: new THREE.Color(0xff2a5f) },
    uOcclusionColor: { value: new THREE.Color(0xf59e0b) }, // atheroma yellow
    uIschemicColor: { value: new THREE.Color(0x3b185f) }, // downstream cyanotic
    uHovered: { value: 0.0 },
    uSelected: { value: 0.0 }
  },

  vertexShader: `
    uniform float uTime;
    uniform float uStenosis;
    uniform float uPulseFrequency;
    uniform float uHovered;
    uniform float uSelected;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vStenosisFactor;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      // Calculate lesion location along the vessel curve (uv.x corresponds to length)
      // Stenosis typically concentrates in proximal-mid segment (around uv.x = 0.35 - 0.55)
      float lesionCenter = 0.45;
      float distFromLesion = abs(uv.x - lesionCenter);
      float stenosisNarrowing = smoothstep(0.25, 0.0, distFromLesion) * uStenosis * 0.55;
      vStenosisFactor = stenosisNarrowing;

      // Systolic pulse dilation wave traveling down the artery
      float pulseWave = sin(uv.x * 16.0 - uTime * uPulseFrequency * 4.0);
      float pulseAmplitude = (1.0 - uStenosis * 0.7) * 0.06; // reduced pulse downstream of stenosis
      
      // Hover/Selection expansion
      float highlightScale = 1.0 + uHovered * 0.15 + uSelected * 0.22;

      // Displace vertices along normal
      vec3 displaced = position + normal * (pulseWave * pulseAmplitude - stenosisNarrowing * 0.12);
      displaced *= highlightScale;

      vPosition = displaced;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,

  fragmentShader: `
    uniform float uTime;
    uniform float uStenosis;
    uniform float uFlowSpeed;
    uniform float uPulseFrequency;
    uniform vec3 uBaseColor;
    uniform vec3 uOcclusionColor;
    uniform vec3 uIschemicColor;
    uniform float uHovered;
    uniform float uSelected;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vStenosisFactor;

    // Pseudo-random noise for turbulent hemodynamics
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      // Flow coordinate
      float flowCoord = vUv.x * 24.0 - uTime * uFlowSpeed * 3.5;
      float wave = sin(flowCoord) * 0.5 + 0.5;
      
      // Turbulent blood flow noise if stenosis > 50%
      float turbulence = 0.0;
      if (uStenosis > 0.45) {
        float noise = hash(vec2(vUv.x * 10.0, uTime * 4.0));
        turbulence = noise * (uStenosis - 0.4) * 0.8;
      }

      // Fresnel rim glow
      vec3 viewDir = normalize(-vPosition);
      float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.2);

      // Color gradation:
      // Upstream: vibrant scarlet pulse
      // Lesion site: atheroma lipid plaque color
      // Downstream of severe stenosis: ischemic desaturated deoxygenated blood
      vec3 healthyColor = mix(uBaseColor, vec3(1.0, 0.4, 0.6), wave * 0.45);
      
      // Post-stenosis ischemic tint
      float downstream = smoothstep(0.45, 0.9, vUv.x) * (uStenosis > 0.6 ? (uStenosis - 0.6) * 2.0 : 0.0);
      vec3 perfusedColor = mix(healthyColor, uIschemicColor, downstream * 0.7);

      // Mix plaque color at lesion site
      vec3 finalColor = mix(perfusedColor, uOcclusionColor, vStenosisFactor * 1.5);

      // Add hemodynamic velocity pulse crests
      finalColor += vec3(0.3, 0.1, 0.15) * pow(wave, 4.0) * (1.0 - uStenosis * 0.6);
      
      // Add turbulence flicker
      finalColor += vec3(turbulence * 0.4, turbulence * 0.2, 0.0);

      // Add fresnel rim lighting
      finalColor += fresnel * 0.55 * mix(uBaseColor, vec3(1.0, 1.0, 1.0), 0.3);

      // Selection glow
      if (uSelected > 0.5) {
        finalColor += vec3(0.2, 0.5, 0.9) * 0.7;
      } else if (uHovered > 0.5) {
        finalColor += vec3(0.3, 0.6, 0.8) * 0.4;
      }

      gl_FragColor = vec4(finalColor, 0.94);
    }
  `
};
