import React, { useState, useEffect } from 'react';

interface OverlayProps {
    engine: any; // Type this properly later
}

export const Overlay: React.FC<OverlayProps> = ({ engine }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [stats, setStats] = useState({ fps: 0, chunks: 0, x: 0, y: 0, z: 0 });
    const [settings, setSettings] = useState({
        renderDistance: 2,
        fov: 75,
        fog: true,
        flyMode: false
    });

    useEffect(() => {
        const interval = setInterval(() => {
            if (engine) {
                setStats({
                    fps: 0, // Stats.js handles this visually, but we could extract it
                    chunks: engine.worldManager.chunks.size,
                    x: Math.floor(engine.camera.position.x),
                    y: Math.floor(engine.camera.position.y),
                    z: Math.floor(engine.camera.position.z)
                });

                // Sync settings from engine if needed
                setSettings(prev => ({
                    ...prev,
                    flyMode: engine.isFlying
                }));
            }
        }, 100);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Escape') {
                setShowMenu(prev => !prev);
                if (!showMenu) {
                    document.exitPointerLock();
                } else {
                    document.body.requestPointerLock();
                }
            }
        };

        const handlePointerLockChange = () => {
            // Force re-render
            setStats(prev => ({ ...prev }));
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('pointerlockchange', handlePointerLockChange);
        return () => {
            clearInterval(interval);
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('pointerlockchange', handlePointerLockChange);
        };
    }, [engine, showMenu]);

    const updateSetting = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        if (engine) {
            if (key === 'fov') {
                engine.camera.fov = value;
                engine.camera.updateProjectionMatrix();
            }
            if (key === 'fog') {
                engine.scene.fog.density = value ? 0.02 : 0;
            }
            if (key === 'flyMode') {
                engine.isFlying = value;
            }
            // Render distance logic would go here (update WorldManager)
        }
    };

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {/* Crosshair */}
            {!showMenu && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '20px', height: '20px',
                    background: 'rgba(255, 255, 255, 0.5)',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: '2px solid black'
                }} />
            )}

            {/* Stats */}
            <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'white', textShadow: '1px 1px 0 #000', fontFamily: 'monospace' }}>
                <div>Pos: {stats.x}, {stats.y}, {stats.z}</div>
                <div>Chunks: {stats.chunks}</div>
                <div>Locked: {engine && engine.inputManager.isPointerLocked ? 'Yes' : 'No'}</div>
            </div>

            {/* Menu */}
            {showMenu && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0, 0, 0, 0.8)',
                    padding: '20px',
                    borderRadius: '10px',
                    color: 'white',
                    pointerEvents: 'auto'
                }}>
                    <h2>Settings</h2>

                    <div style={{ marginBottom: '10px' }}>
                        <label>
                            FOV: {settings.fov}
                            <input
                                type="range" min="30" max="110"
                                value={settings.fov}
                                onChange={(e) => updateSetting('fov', parseInt(e.target.value))}
                            />
                        </label>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <label>
                            <input
                                type="checkbox"
                                checked={settings.fog}
                                onChange={(e) => updateSetting('fog', e.target.checked)}
                            />
                            Fog
                        </label>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <label>
                            <input
                                type="checkbox"
                                checked={settings.flyMode}
                                onChange={(e) => updateSetting('flyMode', e.target.checked)}
                            />
                            Fly Mode
                        </label>
                    </div>

                    <button onClick={() => {
                        setShowMenu(false);
                        document.body.requestPointerLock();
                    }}>Resume</button>

                    <div style={{ marginTop: '20px', borderTop: '1px solid white', paddingTop: '10px' }}>
                        <h3>Debug</h3>
                        <button onClick={async () => {
                            if (engine) {
                                const { IntegrationTest } = await import('../test/IntegrationTest');
                                const test = new IntegrationTest(engine, (msg) => console.log(`[TEST] ${msg}`));
                                test.run();
                            }
                        }}>Run Integration Test</button>

                        <div style={{ marginTop: '10px' }}>
                            Pointer Locked: {engine && engine.inputManager.isPointerLocked ? 'Yes' : 'No'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
