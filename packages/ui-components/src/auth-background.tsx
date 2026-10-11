import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode
} from "react";

export interface NeuroAuthBackgroundProps {
  children: ReactNode;
}

export type AuthBackgroundProps = NeuroAuthBackgroundProps;

const nodeStyles = [
  { x: "7%", y: "18%", size: "13px", angle: "18deg", duration: "18s" },
  { x: "16%", y: "74%", size: "9px", angle: "-22deg", duration: "21s" },
  { x: "31%", y: "11%", size: "11px", angle: "35deg", duration: "22s" },
  { x: "54%", y: "78%", size: "10px", angle: "-12deg", duration: "20s" },
  { x: "73%", y: "21%", size: "14px", angle: "28deg", duration: "24s" },
  { x: "89%", y: "64%", size: "8px", angle: "-30deg", duration: "21s" },
  { x: "44%", y: "45%", size: "7px", angle: "8deg", duration: "25s" },
  { x: "82%", y: "84%", size: "10px", angle: "-18deg", duration: "23s" }
] as const;

const dataFlowStyles = [
  { x: "10%", y: "28%", duration: "22s", delay: "-2s" },
  { x: "24%", y: "70%", duration: "25s", delay: "-8s" },
  { x: "42%", y: "18%", duration: "24s", delay: "-5s" },
  { x: "62%", y: "78%", duration: "28s", delay: "-11s" },
  { x: "76%", y: "34%", duration: "23s", delay: "-4s" },
  { x: "90%", y: "56%", duration: "27s", delay: "-13s" },
  { x: "52%", y: "12%", duration: "30s", delay: "-16s" },
  { x: "36%", y: "88%", duration: "26s", delay: "-19s" }
] as const;

export function NeuroAuthBackground({ children }: NeuroAuthBackgroundProps): JSX.Element {
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    []
  );

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    const currentTarget = event.currentTarget;
    const pointerX = event.clientX;
    const pointerY = event.clientY;

    animationFrameRef.current = window.requestAnimationFrame(() => {
      const bounds = currentTarget.getBoundingClientRect();
      const x = Math.round(((pointerX - bounds.left) / bounds.width) * 100);
      const y = Math.round(((pointerY - bounds.top) / bounds.height) * 100);
      backgroundRef.current?.style.setProperty("--ncr-auth-pointer-x", `${x}%`);
      backgroundRef.current?.style.setProperty("--ncr-auth-pointer-y", `${y}%`);
    });
  }, []);

  return (
    <div
      className="ncr-auth-background ncr-neuro-auth-background"
      onPointerMove={handlePointerMove}
      ref={backgroundRef}
    >
      <div aria-hidden="true" className="ncr-auth-layer ncr-auth-layer--medical-gradient" />
      <div aria-hidden="true" className="ncr-auth-orb ncr-auth-orb--primary" />
      <div aria-hidden="true" className="ncr-auth-orb ncr-auth-orb--secondary" />
      <div aria-hidden="true" className="ncr-auth-orb ncr-auth-orb--cursor" />
      <div aria-hidden="true" className="ncr-auth-layer ncr-auth-layer--data-grid" />
      <div aria-hidden="true" className="ncr-auth-layer ncr-auth-layer--data-flow">
        {dataFlowStyles.map((particle) => (
          <span
            className="ncr-auth-data-packet"
            key={`${particle.x}-${particle.y}`}
            style={
              {
                "--particle-x": particle.x,
                "--particle-y": particle.y,
                "--particle-duration": particle.duration,
                "--particle-delay": particle.delay
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div aria-hidden="true" className="ncr-auth-network">
        {nodeStyles.map((node) => (
          <span
            className="ncr-auth-node"
            key={`${node.x}-${node.y}`}
            style={
              {
                "--node-x": node.x,
                "--node-y": node.y,
                "--node-size": node.size,
                "--node-angle": node.angle,
                "--node-duration": node.duration
              } as CSSProperties
            }
          />
        ))}
      </div>
      <svg aria-hidden="true" className="ncr-auth-wave" viewBox="0 0 1200 300">
        <path
          d="M0 154 C54 154 64 112 86 112 C112 112 112 196 138 196 C164 196 166 148 194 148 C238 148 246 150 286 150 C322 150 326 102 350 102 C376 102 378 204 408 204 C438 204 438 142 478 142 C536 142 548 148 610 148 C652 148 656 118 684 118 C718 118 720 184 754 184 C788 184 794 132 838 132 C914 132 926 150 1004 150 C1064 150 1080 118 1122 118 C1156 118 1168 138 1200 138"
          stroke="rgba(20,95,133,0.56)"
        />
        <path
          d="M0 204 C68 204 74 168 104 168 C132 168 136 222 168 222 C202 222 206 180 246 180 C306 180 326 194 386 194 C438 194 444 142 474 142 C506 142 508 220 546 220 C584 220 594 176 638 176 C704 176 720 190 792 190 C844 190 850 150 884 150 C928 150 934 202 984 202 C1058 202 1080 160 1200 160"
          stroke="rgba(34,168,161,0.36)"
        />
        <path
          d="M0 108 C128 88 224 144 342 116 C462 88 552 140 686 116 C820 92 934 132 1200 98"
          stroke="rgba(79,142,216,0.24)"
        />
      </svg>
      {children}
    </div>
  );
}

export function AuthBackground(props: AuthBackgroundProps): JSX.Element {
  return <NeuroAuthBackground {...props} />;
}
