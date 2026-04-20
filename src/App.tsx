import { useState, useEffect, useRef, useCallback } from 'react';
import backgroundImg from 'figma:asset/b40dbb416d5d1ea23c1835d9dcf25b81f905278e.png';
import characterFrame1 from 'figma:asset/c74f91431209f3c4c9da2e7bf4080d494f0c03a9.png';
import characterFrame2 from 'figma:asset/ee9e49873a21e2d4be116a59683fca95801d591c.png';
import troncL from 'figma:asset/e42aa3e990d9968ec72f93663cb33778eaf253f5.png';
import troncM from 'figma:asset/1860d8df4c45111eb1bb6bff381713ca9add785c.png';
import troncS from 'figma:asset/ae1d6508af86f325e040745288ab144be194bd31.png';
import groundImg from 'figma:asset/9a234789db25f3792a24190c2909377269c3afff.png';
import signPanel from 'figma:asset/ed1b0871b9134ec3f95d29f34fd1ea2519399d54.png';
import speedMessage from 'figma:asset/570b7fe6e44ec388dbc1a80e55b8e2d3c25f0980.png';
import heartFull from 'figma:asset/0db1299211ec5c4101622a0602f7154512914f4d.png';
import heartEmpty from 'figma:asset/7d93c32283cc22d79e583b421f6eec1238851499.png';

interface Obstacle {
  id: number;
  x: number;
  width: number;
  height: number;
  type: 'small' | 'medium' | 'large';
  image: string;
}

export default function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('gourmetBikeBestScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lives, setLives] = useState(1); // Start with 1 life
  const [bikeY, setBikeY] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [groundOffset, setGroundOffset] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [signX, setSignX] = useState(300);
  const [showSpeedMessage, setShowSpeedMessage] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const velocityRef = useRef(0);
  const gameLoopRef = useRef<number>();
  const obstacleIdRef = useRef(0);
  const lastObstacleTimeRef = useRef(0);
  const previousScoreRef = useRef(0);
  const lastLifeGainScoreRef = useRef(0);
  const collisionCooldownRef = useRef(false);
  
  const bikeFrames = [characterFrame1, characterFrame2];
  const GRAVITY = -0.6;
  const JUMP_STRENGTH = 17.82;
  const GROUND_LEVEL = 0;
  const BIKE_WIDTH = 80;
  const BIKE_HEIGHT = 80;
  const BIKE_X = 100;
  const GROUND_HEIGHT = 20;
  const OBSTACLE_SPEED = 5;
  const GROUND_WIDTH = 1024; // Width of the ground image

  const jump = useCallback(() => {
    if (!isJumping && bikeY === GROUND_LEVEL && gameStarted && !gameOver && countdown === null && !isPaused) {
      velocityRef.current = JUMP_STRENGTH;
      setIsJumping(true);
    }
  }, [isJumping, bikeY, gameStarted, gameOver, countdown, isPaused]);

  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 700); // 700ms per number for a quick countdown
      
      return () => clearTimeout(timer);
    } else {
      // Countdown finished, start the game
      setCountdown(null);
    }
  }, [countdown]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!gameStarted && !gameOver) {
          setGameStarted(true);
          setCountdown(3); // Start countdown
        } else if (gameOver) {
          // Restart game
          setGameOver(false);
          setGameStarted(true);
          setScore(0);
          setLives(1); // Reset lives
          setBikeY(0);
          setObstacles([]);
          velocityRef.current = 0;
          obstacleIdRef.current = 0;
          lastObstacleTimeRef.current = 0;
          lastLifeGainScoreRef.current = 0;
          collisionCooldownRef.current = false;
          setGroundOffset(0);
          setCountdown(3); // Start countdown on restart
          setSignX(300); // Reset sign position
        } else {
          jump();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [jump, gameStarted, gameOver]);

  const handleScreenPress = () => {
    if (!gameStarted && !gameOver) {
      setGameStarted(true);
      setCountdown(3); // Start countdown
    } else if (gameOver) {
      // Restart game
      setGameOver(false);
      setGameStarted(true);
      setScore(0);
      setLives(1); // Reset lives
      setBikeY(0);
      setObstacles([]);
      velocityRef.current = 0;
      obstacleIdRef.current = 0;
      lastObstacleTimeRef.current = 0;
      lastLifeGainScoreRef.current = 0;
      collisionCooldownRef.current = false;
      setGroundOffset(0);
      setCountdown(3); // Start countdown on restart
      setSignX(300); // Reset sign position
    } else {
      jump();
    }
  };

  // Animation frames for bike
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const animationInterval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % 2);
    }, 244); // Change frame every 244ms

    return () => clearInterval(animationInterval);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (!gameStarted || gameOver || countdown !== null) return;

    const gameLoop = () => {
      // Skip game loop if paused
      if (isPaused) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Calculate speed multiplier based on score (20% increase every 10 points)
      const speedMultiplier = 1 + (Math.floor(score / 10) * 0.2);
      const currentSpeed = OBSTACLE_SPEED * speedMultiplier;

      // Update bike physics
      velocityRef.current += GRAVITY;
      setBikeY(prev => {
        const newY = prev + velocityRef.current;
        if (newY <= GROUND_LEVEL) {
          velocityRef.current = 0;
          setIsJumping(false);
          return GROUND_LEVEL;
        }
        return newY;
      });

      // Generate obstacles
      const currentTime = Date.now();
      if (currentTime - lastObstacleTimeRef.current > 2000) {
        const obstacleType = Math.random() < 0.33 ? 'large' : Math.random() < 0.66 ? 'medium' : 'small';
        const obstacleData = 
          obstacleType === 'large' ? { image: troncL, width: 60, height: 150 } :
          obstacleType === 'medium' ? { image: troncM, width: 50, height: 100 } :
          { image: troncS, width: 35, height: 60 };
        
        const newObstacle: Obstacle = {
          id: obstacleIdRef.current++,
          x: 1000,
          width: obstacleData.width,
          height: obstacleData.height,
          type: obstacleType,
          image: obstacleData.image
        };
        setObstacles(prev => [...prev, newObstacle]);
        lastObstacleTimeRef.current = currentTime;
      }

      // Update obstacles
      setObstacles(prev => {
        return prev
          .map(obs => ({ ...obs, x: obs.x - currentSpeed }))
          .filter(obs => {
            // Remove obstacles that are off screen
            if (obs.x < -obs.width) {
              setScore(s => s + 1);
              return false;
            }
            return true;
          });
      });

      // Update ground position
      setGroundOffset(prev => {
        const newOffset = prev - currentSpeed;
        // Keep offset in range [0, -GROUND_WIDTH] for seamless loop
        if (newOffset <= -GROUND_WIDTH) {
          return 0;
        }
        return newOffset;
      });

      // Update sign position
      setSignX(prev => prev - currentSpeed);

      // Check collisions
      setObstacles(prev => {
        let hitObstacleId: number | null = null;
        
        for (const obs of prev) {
          const bikeBottom = GROUND_HEIGHT + bikeY;
          const bikeTop = GROUND_HEIGHT + BIKE_HEIGHT + bikeY;
          const obsTop = GROUND_HEIGHT + obs.height;
          
          if (
            BIKE_X + BIKE_WIDTH - 20 > obs.x &&
            BIKE_X + 20 < obs.x + obs.width &&
            bikeBottom < obsTop
          ) {
            if (!collisionCooldownRef.current) {
              hitObstacleId = obs.id;
              collisionCooldownRef.current = true;
              
              if (lives > 0) {
                // If we have lives, lose one and continue
                setLives(prevLives => prevLives - 1);
                setTimeout(() => {
                  collisionCooldownRef.current = false;
                }, 1000); // Cooldown for 1 second
              } else {
                // No lives left, game over
                setGameOver(true);
                // Update best score if current score is higher
                if (score > bestScore) {
                  setBestScore(score);
                  localStorage.setItem('gourmetBikeBestScore', score.toString());
                }
              }
            }
            break;
          }
        }
        
        // Remove the obstacle that was hit
        if (hitObstacleId !== null) {
          return prev.filter(obs => obs.id !== hitObstacleId);
        }
        
        return prev;
      });

      // Show speed message if score increases by 10
      if (score > previousScoreRef.current && score % 10 === 0) {
        setShowSpeedMessage(true);
        setTimeout(() => setShowSpeedMessage(false), 2000);
        previousScoreRef.current = score;
      }

      // Gain a life every 100 points (max 5)
      if (score > lastLifeGainScoreRef.current && score % 100 === 0 && score > 0) {
        setLives(prevLives => Math.min(prevLives + 1, 5));
        lastLifeGainScoreRef.current = score;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, bikeY, countdown, score, lives, isPaused]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex items-center justify-center touch-none">
      <div 
        className="relative w-[896px] h-[500px] overflow-hidden rounded-lg shadow-2xl cursor-pointer"
        onClick={handleScreenPress}
        onTouchStart={(e) => {
          e.preventDefault();
          handleScreenPress();
        }}
        style={{
          maxWidth: '100vw',
          maxHeight: '100vh'
        }}
      >
        {/* Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${backgroundImg})`,
            backgroundSize: 'cover',
            imageRendering: 'pixelated'
          }}
        />
        
        {/* Ground line */}
        <div className="absolute bottom-0 left-0 right-0 h-[20px] border-t-4 border-orange-900/50" />
        
        {/* Animated Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-[80px] overflow-hidden">
          <div 
            className="absolute bottom-0"
            style={{
              transform: `translateX(${groundOffset}px)`,
              height: '80px',
              width: `${GROUND_WIDTH * 3}px`,
              backgroundImage: `url(${groundImg})`,
              backgroundRepeat: 'repeat-x',
              backgroundSize: `${GROUND_WIDTH}px 80px`,
              imageRendering: 'pixelated'
            }}
          />
        </div>
        
        {/* Sign Panel (foreground) */}
        {gameStarted && signX > -350 && (
          <img
            src={signPanel}
            alt="Gourrmet Jump Sign"
            className="absolute z-10"
            style={{
              left: `${signX}px`,
              bottom: `${GROUND_HEIGHT}px`,
              width: '320px',
              height: '240px',
              imageRendering: 'pixelated'
            }}
          />
        )}
        
        {/* Bike */}
        {gameStarted && (
          <img
            src={bikeFrames[currentFrame]}
            alt="Bike"
            className="absolute z-20"
            style={{
              left: `${BIKE_X}px`,
              bottom: `${GROUND_HEIGHT + bikeY}px`,
              width: `${BIKE_WIDTH}px`,
              height: `${BIKE_HEIGHT}px`,
              imageRendering: 'pixelated',
              transform: isJumping ? 'rotate(-5deg)' : 'rotate(0deg)',
              transition: 'transform 0.1s'
            }}
          />
        )}

        {/* Obstacles */}
        {obstacles.map(obstacle => (
          <img
            key={obstacle.id}
            src={obstacle.image}
            alt="Obstacle"
            className="absolute"
            style={{
              left: `${obstacle.x}px`,
              bottom: `${GROUND_HEIGHT}px`,
              width: `${obstacle.width}px`,
              height: `${obstacle.height}px`,
              imageRendering: 'pixelated'
            }}
          />
        ))}

        {/* Score */}
        {gameStarted && (
          <div className="absolute top-4 left-4 bg-black/70 px-4 py-2 rounded-lg backdrop-blur-sm">
            <p className="text-white text-sm">Score: {score} | Best: {bestScore}</p>
          </div>
        )}

        {/* Lives - Centered at top */}
        {gameStarted && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <img
                key={index}
                src={index < lives ? heartFull : heartEmpty}
                alt="Heart"
                style={{
                  width: '32px',
                  height: '32px',
                  imageRendering: 'pixelated'
                }}
              />
            ))}
          </div>
        )}

        {/* Start screen */}
        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center space-y-6 px-8">
              <img 
                src={signPanel} 
                alt="Gourrmet Jump" 
                className="mx-auto"
                style={{
                  width: '400px',
                  height: '300px',
                  imageRendering: 'pixelated'
                }}
              />
              <p className="text-white/90">Press SPACE or tap screen to start</p>
              <p className="text-white/70 text-sm">Press SPACE or tap to jump and avoid obstacles</p>
            </div>
          </div>
        )}

        {/* Game over screen */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center space-y-6 px-8">
              <h2 className="text-white text-5xl" style={{ fontFamily: "'Press Start 2P', cursive" }}>Game Over!</h2>
              <p className="text-white">Final Score: {score}</p>
              <p className="text-white/80">Press SPACE or tap screen to play again</p>
            </div>
          </div>
        )}

        {/* Countdown */}
        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <div className="text-white text-[200px] animate-pulse" style={{ fontFamily: "'Press Start 2P', cursive", lineHeight: 1 }}>
              {countdown}
            </div>
          </div>
        )}

        {/* Speed Message */}
        {showSpeedMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-pulse w-full">
            <img
              src={speedMessage}
              alt="Plus vite Maaaaaaax"
              className="mx-auto"
              style={{
                width: '300px',
                height: '100px',
                imageRendering: 'pixelated'
              }}
            />
          </div>
        )}

        {/* Pause Button */}
        {gameStarted && !gameOver && countdown === null && (
          <button
            className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors z-30 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              setIsPaused(true);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setIsPaused(true);
            }}
          >
            ⏸
          </button>
        )}

        {/* Pause Menu */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm z-50">
            <div className="text-center space-y-6 px-8">
              <h2 className="text-white text-4xl">Pause</h2>
              <button
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg transition-colors text-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(false);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setIsPaused(false);
                }}
              >
                C&apos;est reparti Maaax !
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}