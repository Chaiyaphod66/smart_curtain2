type IconName =
  | "home"
  | "curtain"
  | "environment"
  | "developer"
  | "arrow"
  | "refresh"
  | "microphone"
  | "stop"
  | "temperature"
  | "humidity"
  | "light"
  | "check"
  | "shield"
  | "sparkles";

type AppIconProps = {
  name: IconName;
  size?: number;
};

export default function AppIcon({ name, size = 20 }: AppIconProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...commonProps}>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-6h6v6" />
      </svg>
    );
  }

  if (name === "curtain") {
    return (
      <svg {...commonProps}>
        <path d="M3 4h18M5 4v16M19 4v16" />
        <path d="M5 6c4 1.8 4 10.2 0 12M19 6c-4 1.8-4 10.2 0 12" />
        <path d="M9 4v16M15 4v16" />
      </svg>
    );
  }

  if (name === "environment") {
    return (
      <svg {...commonProps}>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        <circle cx="12" cy="12" r="4" />
        <path d="m5.6 5.6 2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" />
      </svg>
    );
  }

  if (name === "developer") {
    return (
      <svg {...commonProps}>
        <path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...commonProps}>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg {...commonProps}>
        <path d="M20 7v5h-5" />
        <path d="M19 12a7 7 0 1 0-2 5" />
      </svg>
    );
  }

  if (name === "microphone") {
    return (
      <svg {...commonProps}>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
      </svg>
    );
  }

  if (name === "temperature") {
    return (
      <svg {...commonProps}>
        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
      </svg>
    );
  }

  if (name === "humidity") {
    return (
      <svg {...commonProps}>
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    );
  }

  if (name === "light") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...commonProps}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }

  if (name === "sparkles") {
    return (
      <svg {...commonProps}>
        <path d="m12 3 1.91 4.88L18.79 9l-4.88 1.91L12 15.79l-1.91-4.88L5.21 9l4.88-1.12zM19 16l.96 2.44L22.4 19.4l-2.44.96L19 22.8l-.96-2.44-2.44-.96 2.44-.96z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}
