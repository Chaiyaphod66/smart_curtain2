type IconName =
  | "home"
  | "curtain"
  | "environment"
  | "developer"
  | "arrow"
  | "refresh"
  | "stop";

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

  return (
    <svg {...commonProps}>
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}
