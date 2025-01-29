import { useMemo, useRef, useEffect } from 'react';

const LeafGenerator = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leaves = useMemo(() => 
    Array(30).fill(null).map((_, i) => ({
      id: i,
      size: 0.3 + Math.random() * 0.5, // Smaller leaves
      rotation: Math.random() * 360,
      left: Math.random() * 100,
      speed: 15 + Math.random() * 15,
      delay: Math.random() * -20,
    })), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      updateLeaves();
    };

    const updateLeaves = () => {
      leaves.forEach(leaf => {
        const el = document.getElementById(`leaf-${leaf.id}`);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const leafCenterX = rect.left + rect.width / 2;
        const leafCenterY = rect.top + rect.height / 2;
        
        const deltaX = mouseX - leafCenterX;
        const deltaY = mouseY - leafCenterY;
        const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

        if (distance < 200) { // Interaction radius
          const angle = Math.atan2(deltaY, deltaX);
          const strength = 1 - (distance / 200);
          
          el.style.setProperty('--rotate', `${leaf.rotation + strength * 360}deg`);
          el.style.setProperty('--translate-x', `${Math.cos(angle) * strength * 50}px`);
          el.style.setProperty('--translate-y', `${Math.sin(angle) * strength * 50}px`);
        } else {
          el.style.setProperty('--rotate', `${leaf.rotation}deg`);
          el.style.setProperty('--translate-x', '0px');
          el.style.setProperty('--translate-y', '0px');
        }
      });
    };

    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [leaves]);

  return (
    <div 
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{ pointerEvents: 'auto' }} // Ensure mouse events are enabled
    >
      {leaves.map(leaf => (
        <img
          key={leaf.id}
          id={`leaf-${leaf.id}`}
          src={`/leaf${(leaf.id % 3) + 1}.svg`}
          alt="leaf"
          className="leaf"
          style={{
            left: `${leaf.left}%`,
            transform: `translate(var(--translate-x, 0), var(--translate-y, 0)) 
                       rotate(var(--rotate, 0deg)) 
                       scale(${leaf.size})`,
            animation: `fall ${leaf.speed}s linear infinite`,
            animationDelay: `${leaf.delay}s`,
            filter: `hue-rotate(${leaf.id * 2}deg)`,
            pointerEvents: 'none', // Disable pointer events on individual leaves
          }}
        />
      ))}
    </div>
  );
};

export default LeafGenerator;