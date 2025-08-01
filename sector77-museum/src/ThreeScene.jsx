import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Define createStarTexture BEFORE the component
function createStarTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Draw a radial gradient circle
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.1, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function ThreeScene() {
  useEffect(() => {
    console.log('ThreeScene mounted');
    return () => console.log('ThreeScene unmounted');
  }, []);
  const mountRef = useRef();
  const [tooltip, setTooltip] = useState({ show: false, text: '', x: 0, y: 0 });
  const { publicKey, connected, connecting, disconnect, signTransaction } = useWallet();
  const [minting, setMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState('');
  
  // Create refs to store current wallet state
  const walletStateRef = useRef({ connected, publicKey, signTransaction });
  
  // Update refs when wallet state changes
  useEffect(() => {
    walletStateRef.current = { connected, publicKey, signTransaction };
  }, [connected, publicKey, signTransaction]);
  
  // Debug wallet connection
  useEffect(() => {
    console.log('Wallet Status:', { connected, connecting, publicKey: publicKey?.toBase58() });
  }, [connected, connecting, publicKey]);
  
  // Minting function - moved outside useEffect
  const mintNFT = React.useCallback(async (modelName, price) => {
    console.log('Mint called with wallet state:', { connected, publicKey: publicKey?.toBase58() });
    
    if (!connected || !publicKey) {
      setMintStatus('Please connect your wallet first');
      return;
    }
    
    setMinting(true);
    setMintStatus('Minting...');
    
    try {
      // Create a simple transaction (placeholder for NFT minting)
      const connection = new Connection('https://api.devnet.solana.com');
      const transaction = new Transaction();
      
      // Add a simple transfer transaction as placeholder
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey, // Sending to self as placeholder
          lamports: 0.001 * LAMPORTS_PER_SOL,
        })
      );
      
      // Sign and send transaction
      const signature = await signTransaction(transaction);
      const txid = await connection.sendRawTransaction(signature.serialize());
      await connection.confirmTransaction(txid);
      
      setMintStatus(`Successfully minted ${modelName}! TX: ${txid.slice(0, 8)}...`);
      console.log('Mint successful:', txid);
      
    } catch (error) {
      console.error('Minting error:', error);
      setMintStatus(`Minting failed: ${error.message}`);
    } finally {
      setMinting(false);
    }
  }, [connected, publicKey, signTransaction]);

  // Gamification state
  const [ownedModels, setOwnedModels] = useState({});
  const [piloting, setPiloting] = useState(false); // change to store model name or false

  // Debug: log piloting state changes
  useEffect(() => {
    console.log('[DEBUG] piloting state changed:', piloting);
  }, [piloting]);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [lastPosition, setLastPosition] = useState(null);
  const swordfishRef = useRef(null);
  const tachikomaRef = useRef(null);

  // After successful mint, mark model as owned
  function handleMintSuccess(modelName) {
    setOwnedModels((prev) => ({ ...prev, [modelName]: true }));
  }

  // Patch: call handleMintSuccess after minting Swordfish II
  // (You can do the same for Tachikoma if you want)
  // In your minting logic, after setMintStatus(...), add:
  // if (modelName === 'Swordfish II') handleMintSuccess(modelName);

  // Keyboard controls for piloting
  useEffect(() => {
    if (!piloting) return;
    function handleKeyDown(e) {
      let model = null;
      if (piloting === 'Swordfish II') model = swordfishRef.current;
      if (piloting === 'Tachikoma') model = tachikomaRef.current;
      if (!model) return;
      let move = { x: 0, z: 0 };
      if (e.key === 'ArrowUp' || e.key === 'w') move.z = -1;
      if (e.key === 'ArrowDown' || e.key === 's') move.z = 1;
      if (e.key === 'ArrowLeft' || e.key === 'a') move.x = -1;
      if (e.key === 'ArrowRight' || e.key === 'd') move.x = 1;
      if (move.x !== 0 || move.z !== 0) {
        const prev = model.position.clone();
        model.position.x += move.x;
        model.position.z += move.z;
        setLastPosition(prev);
        setDistanceTraveled((d) => d + Math.sqrt(move.x * move.x + move.z * move.z));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [piloting]);

  // Attach swordfishRef to Swordfish II model after loading
  // In your GLTF loader:
  // swordfishRef.current = model; // Assign ref to the model

  // Attach tachikomaRef to Tachikoma model after loading
  // In your STL loader for Tachikoma:
  // tachikomaRef.current = mesh;

  // Force ownership for Tachikoma for demo
  useEffect(() => {
    setOwnedModels((prev) => ({ ...prev, 'Tachikoma': true }));
  }, []);

  // Debug log for ownedModels and piloting
  useEffect(() => {
    console.log('ownedModels:', ownedModels);
    console.log('piloting:', piloting);
  }, [ownedModels, piloting]);

  // UI: Pilot and Claim Reward buttons
  // ... in your return/render section ...
  // {ownedModels['Swordfish II'] && !piloting && (
  //   <button onClick={() => setPiloting(true)}>Pilot Swordfish II</button>
  // )}
  // {piloting && (
  //   <button onClick={() => setPiloting(false)}>Stop Piloting</button>
  // )}
  // {distanceTraveled >= 5 && (
  //   <button onClick={handleClaimReward}>Claim Reward</button>
  // )}

  // Load ownership from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ownedModels');
    if (stored) setOwnedModels(JSON.parse(stored));
  }, []);

  // Save ownership to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('ownedModels', JSON.stringify(ownedModels));
  }, [ownedModels]);

  useEffect(() => {
    try {
      const container = mountRef.current;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x101014); // slightly off pure black

      const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
      camera.position.set(2, 2, 4);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
      dirLight.position.set(5, 10, 7.5);
      scene.add(dirLight);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      // Raycaster for mouse interaction
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      const modelData = new Map(); // Store model info
      // Load GLTF model
      const gltfLoader = new GLTFLoader();

      gltfLoader.load(
        '/models/swordfishII_0104.gltf',
        (gltf) => {
          const model = gltf.scene;
          scene.add(model);

          model.position.set(0, 0, 0);
          model.scale.set(1, 1, 1); // Try 10,10,10 or 0.1,0.1,0.1 if needed
          
          // Store model data for tooltip
          modelData.set(model, {
            name: 'Swordfish II',
            price: '0.05 SOL',
            available: 100
          });

          // Center and frame the model
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3()).length();
          const center = box.getCenter(new THREE.Vector3());
          controls.target.copy(center);
          camera.position.copy(center);
          camera.position.x += size / 2;
          camera.position.y += size / 5;
          camera.position.z += size / 2;
          camera.lookAt(center);
          swordfishRef.current = model; // Assign ref to the model
        },
        undefined,
        (error) => {
          console.error('An error happened while loading the model:', error);
        }
      );

      // Function to load OBJ models
      const loadOBJModel = (url, position = [0, 0, 0], scale = [1, 1, 1], material = null) => {
        const objLoader = new OBJLoader();
        
        objLoader.load(
          url,
          (object) => {
            // Apply material if provided, otherwise use default
            if (material) {
              object.traverse((child) => {
                if (child.isMesh) {
                  child.material = material;
                }
              });
            }
            
            // Position and scale the model
            object.position.set(...position);
            object.scale.set(...scale);
            
            scene.add(object);
            
            // Center and frame the model
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3()).length();
            const center = box.getCenter(new THREE.Vector3());
            controls.target.copy(center);
            camera.position.copy(center);
            camera.position.x += size / 2;
            camera.position.y += size / 5;
            camera.position.z += size / 2;
            camera.lookAt(center);
          },
          undefined,
          (error) => {
            console.error('An error happened while loading the OBJ model:', error);
          }
        );
      };

      // Example: Load an OBJ model (uncomment and modify as needed)
      // loadOBJModel('/models/your-model.obj', [0, 0, 0], [1, 1, 1]);
      
      // Example with custom material
      // const customMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
      // loadOBJModel('/models/your-model.obj', [0, 0, 0], [1, 1, 1], customMaterial);

      // Function to load STL models
      const loadSTLModel = (url, position = [0, 0, 0], scale = [1, 1, 1], material = null, rotationY = 0, rotationX = 0, rotationZ = 0, modelInfo = null) => {
        const stlLoader = new STLLoader();
        
        stlLoader.load(
          url,
          (geometry) => {
            console.log('STL loaded successfully:', url);
            console.log('Geometry bounds:', geometry.boundingBox);
            
            // Create mesh with geometry
            const meshMaterial = material || new THREE.MeshPhongMaterial({ 
              color: 0x888888,
              specular: 0x111111,
              shininess: 200 
            });
            
            const mesh = new THREE.Mesh(geometry, meshMaterial);
            
            // Position, scale, and rotate the model
            mesh.position.set(...position);
            mesh.scale.set(...scale);
            if (rotationY) mesh.rotation.y = rotationY;
            if (rotationX) mesh.rotation.x = rotationX;
            if (rotationZ) mesh.rotation.z = rotationZ;
            
            console.log('Mesh added to scene at position:', mesh.position);
            console.log('Mesh scale:', mesh.scale);
            
            scene.add(mesh);
            
            // Store model data for tooltip if provided
            if (modelInfo) {
              modelData.set(mesh, modelInfo);
            }
            
            // Camera centering is commented out
            if (url.includes('tachikoma')) {
              tachikomaRef.current = mesh;
            }
          },
          undefined,
          (error) => {
            console.error('An error happened while loading the STL model:', error);
          }
        );
      };

      // Example: Load an STL model (uncomment and modify as needed)
      // loadSTLModel('/models/your-model.stl', [0, 0, 0], [1, 1, 1]);
      
      // Example with custom material
      // const customMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
      // loadSTLModel('/models/your-model.stl', [0, 0, 0], [1, 1, 1], customMaterial);

      // Load tachikoma.stl model with custom blue material for visibility
      const brightMaterial = new THREE.MeshPhongMaterial({ color: 0x8493d6 });
      loadSTLModel('/models/tachikoma.stl', [0, 2, -5], [1/3, 1/3, 1/3], brightMaterial, 0, -Math.PI / 2, -Math.PI / 2, {
        name: 'Tachikoma',
        price: '0.01 SOL',
        available: 100
      });

      // Star field parameters
      const starCount = 2000; // Adjust for more/less stars
      const starGeometry = new THREE.BufferGeometry();
      const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.2,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8,
        map: createStarTexture(),
        alphaTest: 0.01,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const starVertices = [];
      for (let i = 0; i < starCount; i++) {
        const x = THREE.MathUtils.randFloatSpread(200); // Spread stars in a 200x200x200 cube
        const y = THREE.MathUtils.randFloatSpread(200);
        const z = THREE.MathUtils.randFloatSpread(200);
        starVertices.push(x, y, z);
      }
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // Mouse event handlers
      function onMouseMove(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Raycast to find intersected objects
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
          const intersectedObject = intersects[0].object;
          // Find the parent model (could be a mesh within a group)
          let model = intersectedObject;
          while (model.parent && model.parent !== scene) {
            model = model.parent;
          }
          
          if (modelData.has(model)) {
            const data = modelData.get(model);
            setTooltip({
              show: true,
              text: `${data.name}\nPrice: ${data.price}\nAvailable: ${data.available}\nClick to mint!`,
              x: event.clientX,
              y: event.clientY
            });
            // Change cursor to pointer when hovering over interactive models
            renderer.domElement.style.cursor = 'pointer';
          }
        } else {
          setTooltip({ show: false, text: '', x: 0, y: 0 });
          // Reset cursor to default when not hovering over models
          renderer.domElement.style.cursor = 'default';
        }
      }
      
      // Click handler for minting
      async function onMouseClick(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Raycast to find intersected objects
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
          const intersectedObject = intersects[0].object;
          // Find the parent model
          let model = intersectedObject;
          while (model.parent && model.parent !== scene) {
            model = model.parent;
          }
          
          if (modelData.has(model)) {
            const data = modelData.get(model);
            console.log('Clicking on model:', data.name);
            
            // Get current wallet state from ref
            const { connected, publicKey, signTransaction } = walletStateRef.current;
            console.log('Current wallet state:', { connected, publicKey: publicKey?.toBase58() });
            
            // Call minting function with current wallet state
            if (!connected || !publicKey) {
              setMintStatus('Please connect your wallet first');
              return;
            }
            
            setMinting(true);
            setMintStatus('Minting...');
            
            // Create and send transaction
            const connection = new Connection('https://api.devnet.solana.com');
            const transaction = new Transaction();
            
            // Get recent blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;
            
            // Calculate price based on model
            const priceInSOL = data.name === 'Swordfish II' ? 0.05 : 0.01;
            const priceInLamports = priceInSOL * LAMPORTS_PER_SOL;
            
            transaction.add(
              SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: publicKey,
                lamports: priceInLamports,
              })
            );
            
            signTransaction(transaction).then(signature => {
              return connection.sendRawTransaction(signature.serialize());
            }).then(txid => {
              return connection.confirmTransaction(txid).then(() => txid);
            }).then(txid => {
              setMintStatus(`Successfully minted ${data.name}! TX: ${txid}`);
              console.log('Mint successful:', txid);
              console.log('Minted:', data.name);
              if (data.name === 'Swordfish II' || data.name === 'Tachikoma') handleMintSuccess(data.name); // Call handleMintSuccess
            }).catch(error => {
              console.error('Minting error:', error);
              setMintStatus(`Minting failed: ${error.message}`);
            }).finally(() => {
              setMinting(false);
            });
          }
        }
      }
      
      function onMouseLeave() {
        setTooltip({ show: false, text: '', x: 0, y: 0 });
      }
      
      renderer.domElement.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('click', onMouseClick);
      renderer.domElement.addEventListener('mouseleave', onMouseLeave);

      // Responsive
      function onResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }
      window.addEventListener('resize', onResize);

      // Animation loop
      function animate() {
        requestAnimationFrame(animate);
        // Twinkle
        stars.material.opacity = 0.7 + 0.3 * Math.sin(Date.now() * 0.001);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      // Cleanup on unmount
      return () => {
        window.removeEventListener('resize', onResize);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('click', onMouseClick);
        renderer.domElement.removeEventListener('mouseleave', onMouseLeave);
        renderer.dispose();
        container.removeChild(renderer.domElement);
      };
    } catch (err) {
      console.error('ThreeScene error:', err);
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Wallet Connect Button */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        .wallet-adapter-button-trigger {
          background: #22232a !important;
          color: #fff !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          border: none !important;
          font-family: 'Roboto', system-ui, Avenir, Helvetica, Arial, sans-serif !important;
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1001
      }}>
        <WalletMultiButton />
      </div>
      
      {/* Wallet Info */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'Roboto, system-ui, Avenir, Helvetica, Arial, sans-serif',
        zIndex: 1001
      }}>
        Supported: Phantom
      </div>
      
      {/* Wallet Status */}
      {connected && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'Roboto, system-ui, Avenir, Helvetica, Arial, sans-serif',
          zIndex: 1001
        }}>
          <span style={{ fontFamily: 'Roboto, system-ui, Avenir, Helvetica, Arial, sans-serif' }}>
            Connected: {publicKey?.toBase58().slice(0, 8)}...
          </span>
          <button 
            onClick={disconnect}
            style={{
              marginLeft: '10px',
              padding: '4px 12px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              transition: 'background 0.2s, color 0.2s',
              fontFamily: 'Roboto, system-ui, Avenir, Helvetica, Arial, sans-serif',
            }}
          >
            Disconnect
          </button>
        </div>
      )}
      
      {/* Connection Status */}
      {connecting && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          backgroundColor: 'rgba(255, 165, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'Space Grotesk, system-ui, Avenir, Helvetica, Arial, sans-serif',
          zIndex: 1001
        }}>
          Connecting...
        </div>
      )}
      
      {/* Minting Status */}
      {mintStatus && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          backgroundColor: minting
            ? 'rgba(239,204,0,0.8)'
            : 'rgba(70,97,60,0.85)', // green 85% transparent
          color: minting ? '#22232a' : '#fff',
          padding: '16px 20px',
          borderRadius: '8px',
          fontSize: '13px',
          fontFamily: 'Space Grotesk, system-ui, Avenir, Helvetica, Arial, sans-serif',
          zIndex: 1001,
          maxWidth: '500px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
          border: minting ? '0.5px solid #efcc00' : '0.5px solid #b6c0ee',
          letterSpacing: '0.01em',
          transition: 'background 0.2s, border 0.2s'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
            {minting ? '⏳ Minting...' : '✅ Mint Successful!'}
          </div>
          <div style={{ 
            wordBreak: 'break-all', 
            lineHeight: '1.4',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            padding: '8px',
            borderRadius: '4px',
            marginTop: '8px'
          }}>
            {mintStatus}
          </div>
          {!minting && mintStatus.includes('TX:') && (
            <button
              onClick={() => {
                const txId = mintStatus.split('TX: ')[1];
                navigator.clipboard.writeText(txId);
                setMintStatus(mintStatus + ' (Copied!)');
                setTimeout(() => setMintStatus(mintStatus), 2000);
              }}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'Space Grotesk, system-ui, Avenir, Helvetica, Arial, sans-serif',
              }}
            >
              📋 Copy TX ID
            </button>
          )}
        </div>
      )}
      
      {tooltip.show && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'Space Grotesk, system-ui, Avenir, Helvetica, Arial, sans-serif',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'pre-line',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Minimal Elegant Pilot/Claim Button Block */}
      <div style={{
        position: 'fixed',
        top: 80,
        left: 20,
        zIndex: 1002,
        display: 'flex',
        gap: '12px'
      }}>
        {ownedModels['Swordfish II'] && (
          <button
            onClick={() => { console.log('Clicked Pilot Swordfish II'); setPiloting('Swordfish II'); }}
            disabled={piloting === 'Swordfish II'}
            style={{
              padding: '10px 22px',
              fontWeight: 500,
              background: piloting === 'Swordfish II' ? '#e5e7eb' : '#22232a',
              color: piloting === 'Swordfish II' ? '#888' : '#fff',
              border: '1px solid #333',
              borderRadius: 8,
              cursor: piloting === 'Swordfish II' ? 'not-allowed' : 'pointer',
              boxShadow: piloting === 'Swordfish II' ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            {piloting === 'Swordfish II' ? 'Piloting Swordfish II' : 'Pilot Swordfish II'}
          </button>
        )}
        {ownedModels['Tachikoma'] && (
          <button
            onClick={() => { console.log('Clicked Pilot Tachikoma'); setPiloting('Tachikoma'); }}
            disabled={piloting === 'Tachikoma'}
            style={{
              padding: '10px 22px',
              fontWeight: 500,
              background: piloting === 'Tachikoma' ? '#e5e7eb' : '#22232a',
              color: piloting === 'Tachikoma' ? '#888' : '#fff',
              border: '1px solid #333',
              borderRadius: 8,
              cursor: piloting === 'Tachikoma' ? 'not-allowed' : 'pointer',
              boxShadow: piloting === 'Tachikoma' ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            {piloting === 'Tachikoma' ? 'Piloting Tachikoma' : 'Pilot Tachikoma'}
          </button>
        )}
        {piloting && (
          <button
            onClick={() => setPiloting(false)}
            style={{
              padding: '10px 22px',
              fontWeight: 500,
              background: '#fff',
              color: '#22232a',
              border: '1px solid #333',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            Stop Piloting
          </button>
        )}
        {distanceTraveled >= 5 && piloting && (
          <button
            onClick={() => alert('Reward claimed! (This is a local simulation)')}
            style={{
              padding: '10px 22px',
              fontWeight: 500,
              background: '#22232a',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            Claim Reward
          </button>
        )}
      </div>
    </div>
  );
}