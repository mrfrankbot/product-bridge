// Confetti celebration utility for success moments

interface ConfettiOptions {
  count?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  ticks?: number;
  colors?: string[];
  shapes?: string[];
}

const defaultColors = [
  '#8B5CF6', // Purple (AI magic)
  '#10B981', // Green (success)
  '#3B82F6', // Blue (trust)
  '#F59E0B', // Amber (energy)
  '#EF4444', // Red (passion)
  '#EC4899', // Pink (delight)
];

export function createConfetti(options: ConfettiOptions = {}) {
  const {
    count = 50,
    spread = 50,
    startVelocity = 45,
    decay = 0.9,
    gravity = 0.8,
    drift = 0,
    ticks = 200,
    colors = defaultColors,
  } = options;

  // Only run confetti in browser environment
  if (typeof window === 'undefined') return;

  const particles: HTMLElement[] = [];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'pb-confetti';
    
    // Random color
    const color = colors[Math.floor(Math.random() * colors.length)];
    particle.style.backgroundColor = color;
    
    // Random starting position (top center of viewport)
    const startX = window.innerWidth / 2 + (Math.random() - 0.5) * spread;
    const startY = -10;
    
    particle.style.left = startX + 'px';
    particle.style.top = startY + 'px';
    
    // Random velocity and rotation
    const velocity = startVelocity + Math.random() * 10;
    const angle = (Math.random() - 0.5) * Math.PI / 3; // ±30 degrees
    const rotationSpeed = (Math.random() - 0.5) * 720; // ±360 degrees per second
    
    // Add to DOM
    document.body.appendChild(particle);
    particles.push(particle);
    
    // Animate particle
    let currentTick = 0;
    let velocityX = Math.sin(angle) * velocity;
    let velocityY = Math.cos(angle) * velocity;
    let positionX = startX;
    let positionY = startY;
    let rotation = 0;
    
    const animate = () => {
      currentTick++;
      
      // Update velocity
      velocityY += gravity;
      velocityX += drift;
      velocityX *= decay;
      velocityY *= decay;
      
      // Update position
      positionX += velocityX;
      positionY += velocityY;
      rotation += rotationSpeed / 60; // 60 FPS assumption
      
      // Apply to element
      particle.style.left = positionX + 'px';
      particle.style.top = positionY + 'px';
      particle.style.transform = `rotate(${rotation}deg)`;
      
      // Fade out towards the end
      const fadeStart = ticks * 0.8;
      if (currentTick > fadeStart) {
        const fadeProgress = (currentTick - fadeStart) / (ticks - fadeStart);
        particle.style.opacity = (1 - fadeProgress).toString();
      }
      
      // Continue animation or cleanup
      if (currentTick < ticks && positionY < window.innerHeight + 50) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    };
    
    // Start animation with slight delay for each particle
    setTimeout(() => requestAnimationFrame(animate), i * 10);
  }
  
  // Cleanup function
  return () => {
    particles.forEach(particle => {
      if (particle.parentNode) {
        particle.remove();
      }
    });
  };
}

// Preset configurations
export const confettiPresets = {
  success: () => createConfetti({
    count: 30,
    spread: 60,
    startVelocity: 45,
    colors: ['#10B981', '#34D399', '#6EE7B7'],
  }),
  
  aiMagic: () => createConfetti({
    count: 40,
    spread: 80,
    startVelocity: 50,
    colors: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
  }),
  
  celebration: () => createConfetti({
    count: 60,
    spread: 100,
    startVelocity: 55,
    colors: defaultColors,
  }),
  
  gentle: () => createConfetti({
    count: 20,
    spread: 40,
    startVelocity: 35,
    gravity: 0.5,
    colors: ['#8B5CF6', '#10B981'],
  }),
};

// Hook for React components
export function useConfetti() {
  const triggerSuccess = () => confettiPresets.success();
  const triggerAiMagic = () => confettiPresets.aiMagic();
  const triggerCelebration = () => confettiPresets.celebration();
  const triggerGentle = () => confettiPresets.gentle();
  const triggerCustom = (options?: ConfettiOptions) => createConfetti(options);
  
  return {
    success: triggerSuccess,
    aiMagic: triggerAiMagic,
    celebration: triggerCelebration,
    gentle: triggerGentle,
    custom: triggerCustom,
  };
}