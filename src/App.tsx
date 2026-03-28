/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

// Game Constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const LANE_COUNT = 3;
const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 80;
const ENEMY_WIDTH = 50;
const ENEMY_HEIGHT = 80;
const INITIAL_SPEED = 5;
const SPEED_INCREMENT = 0.001;

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface Enemy extends GameObject {
  speed: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Game variables stored in refs to avoid re-renders during the game loop
  const playerRef = useRef<GameObject>({
    x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    color: '#00f2ff', // Cyan Neon
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const speedRef = useRef(INITIAL_SPEED);
  const roadOffsetRef = useRef(0);
  const frameIdRef = useRef<number>(0);
  const lastEnemySpawnRef = useRef<number>(0);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const resetGame = () => {
    playerRef.current = {
      x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      color: '#00f2ff',
    };
    enemiesRef.current = [];
    speedRef.current = INITIAL_SPEED;
    roadOffsetRef.current = 0;
    setScore(0);
    setGameState('PLAYING');
  };

  const spawnEnemy = () => {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const x = lane * LANE_WIDTH + (LANE_WIDTH - ENEMY_WIDTH) / 2;
    const colors = ['#ff0055', '#ffcc00', '#00ff66', '#cc00ff'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    enemiesRef.current.push({
      x,
      y: -ENEMY_HEIGHT,
      width: ENEMY_WIDTH,
      height: ENEMY_HEIGHT,
      color,
      speed: speedRef.current * (0.8 + Math.random() * 0.4),
    });
  };

  const update = () => {
    if (gameState !== 'PLAYING') return;

    const player = playerRef.current;
    const keys = keysRef.current;

    // Player Movement
    if (keys['ArrowLeft'] && player.x > 0) player.x -= 7;
    if (keys['ArrowRight'] && player.x < CANVAS_WIDTH - player.width) player.x += 7;
    if (keys['ArrowUp']) speedRef.current = Math.min(speedRef.current + 0.1, 15);
    if (keys['ArrowDown']) speedRef.current = Math.max(speedRef.current - 0.2, 3);

    // Natural speed increase
    speedRef.current += SPEED_INCREMENT;
    
    // Road Scrolling
    roadOffsetRef.current = (roadOffsetRef.current + speedRef.current) % 100;

    // Update Enemies
    enemiesRef.current.forEach((enemy, index) => {
      enemy.y += enemy.speed;

      // Collision Detection
      if (
        player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y
      ) {
        setGameState('GAMEOVER');
      }

      // Remove off-screen enemies
      if (enemy.y > CANVAS_HEIGHT) {
        enemiesRef.current.splice(index, 1);
        setScore(prev => prev + 10);
      }
    });

    // Spawn Enemies
    const now = Date.now();
    if (now - lastEnemySpawnRef.current > 1500 - (speedRef.current * 50)) {
      spawnEnemy();
      lastEnemySpawnRef.current = now;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear Canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Road
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([40, 40]);
    ctx.lineDashOffset = -roadOffsetRef.current;
    
    // Lane Markings
    for (let i = 1; i < LANE_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * LANE_WIDTH, 0);
      ctx.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset dash

    // Draw Player
    const p = playerRef.current;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = p.color;
    
    // Simple Car Shape
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.width, p.height, 10);
    ctx.fill();
    
    // Windshield
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(p.x + 5, p.y + 15, p.width - 10, 20);
    
    // Headlights
    ctx.fillStyle = '#fff';
    ctx.fillRect(p.x + 5, p.y + 5, 10, 5);
    ctx.fillRect(p.x + p.width - 15, p.y + 5, 10, 5);

    // Draw Enemies
    enemiesRef.current.forEach(enemy => {
      ctx.fillStyle = enemy.color;
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      ctx.roundRect(enemy.x, enemy.y, enemy.width, enemy.height, 10);
      ctx.fill();
      
      // Enemy Windshield
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(enemy.x + 5, enemy.y + enemy.height - 35, enemy.width - 10, 20);
    });

    ctx.shadowBlur = 0; // Reset shadow
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      update();
      draw(ctx);
      frameIdRef.current = requestAnimationFrame(loop);
    };

    frameIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [gameState]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center font-sans overflow-hidden">
      {/* Game Header */}
      <div className="mb-6 flex justify-between w-[400px] items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#cc00ff]">
            NEON RACER
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">High Speed Survival</p>
        </div>
        <div className="text-right font-mono">
          <div className="text-xs text-white/40 uppercase">Score</div>
          <div className="text-2xl font-bold text-[#00f2ff]">{score.toString().padStart(6, '0')}</div>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-[#00f2ff]/10">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block"
        />

        {/* Overlays */}
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">READY TO DRIVE?</h2>
                  <p className="text-white/60 text-sm">Avoid the other cars and survive as long as possible.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono text-white/40">
                  <div className="flex items-center gap-2 justify-center bg-white/5 p-3 rounded-lg">
                    <ArrowLeft size={14} /> <ArrowRight size={14} /> <span>STEER</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center bg-white/5 p-3 rounded-lg">
                    <ArrowUp size={14} /> <span>GAS</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center bg-white/5 p-3 rounded-lg">
                    <ArrowDown size={14} /> <span>BRAKE</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center bg-white/5 p-3 rounded-lg">
                    <Trophy size={14} className="text-[#ffcc00]" /> <span>{highScore}</span>
                  </div>
                </div>

                <button
                  onClick={resetGame}
                  className="group relative px-8 py-4 bg-[#00f2ff] text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
                >
                  <Play size={20} fill="currentColor" />
                  START ENGINE
                </button>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="space-y-6"
              >
                <h2 className="text-6xl font-black italic tracking-tighter text-white">CRASHED!</h2>
                
                <div className="space-y-1">
                  <div className="text-sm uppercase tracking-widest text-white/60">Final Score</div>
                  <div className="text-5xl font-bold text-[#00f2ff]">{score}</div>
                </div>

                {score >= highScore && score > 0 && (
                  <div className="text-[#ffcc00] animate-bounce font-bold flex items-center gap-2 justify-center">
                    <Trophy size={20} /> NEW HIGH SCORE!
                  </div>
                )}

                <button
                  onClick={resetGame}
                  className="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
                >
                  <RotateCcw size={20} />
                  TRY AGAIN
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls Help (Desktop) */}
      <div className="mt-8 text-white/20 text-[10px] font-mono flex gap-8 uppercase tracking-widest">
        <span>[Arrow Keys] to Move</span>
        <span>[Up/Down] for Speed</span>
      </div>
    </div>
  );
}
