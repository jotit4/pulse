interface IconProps {
  filled?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

/** Icono X (logo de la red social) */
export function XLogoIcon({ width = 24, height = 24, className }: Omit<IconProps, "filled">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.213 5.567 5.95-5.567Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

/** Icono casa (Inicio) */
export function HomeIcon({ filled = false, width = 24, height = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {filled ? (
        <path d="M11.293 3.293a1 1 0 0 1 1.414 0l8 8a1 1 0 0 1-1.414 1.414L19 12.414V21a1 1 0 0 1-1 1h-5v-5h-2v5H6a1 1 0 0 1-1-1v-8.586l-.293.293a1 1 0 0 1-1.414-1.414l8-8Z" />
      ) : (
        <>
          <path d="M3 12L12 3l9 9" />
          <path d="M9 21V12h6v9" />
          <path d="M5 10v11h14V10" />
        </>
      )}
    </svg>
  );
}

/** Icono lupa (Buscar) */
export function SearchIcon({ filled = false, width = 24, height = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {filled ? (
        <path d="M10.5 3a7.5 7.5 0 1 0 4.55 13.464l4.743 4.743a1 1 0 0 0 1.414-1.414l-4.742-4.742A7.5 7.5 0 0 0 10.5 3Zm-5.5 7.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z" />
      ) : (
        <>
          <circle cx="11" cy="11" r="7.5" />
          <path d="M20 20l-2.5-2.5" />
        </>
      )}
    </svg>
  );
}

/** Icono campana (Notificaciones) */
export function BellIcon({ filled = false, width = 24, height = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {filled ? (
        <path d="M12 2a7 7 0 0 0-7 7v2.586l-1.707 1.707A1 1 0 0 0 4 15h16a1 1 0 0 0 .707-1.707L19 11.586V9a7 7 0 0 0-7-7Zm0 19a3 3 0 0 1-2.83-2h5.66A3 3 0 0 1 12 21Z" />
      ) : (
        <>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </>
      )}
    </svg>
  );
}

/** Icono marcador (Bookmarks) */
export function BookmarkIcon({ filled = false, width = 24, height = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {filled ? (
        <path d="M5 3a2 2 0 0 0-2 2v16.5a.5.5 0 0 0 .8.4L12 16.5l8.2 5.4a.5.5 0 0 0 .8-.4V5a2 2 0 0 0-2-2H5Z" />
      ) : (
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
      )}
    </svg>
  );
}

/** Icono persona (Perfil) */
export function UserIcon({ filled = false, width = 24, height = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {filled ? (
        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-7 8a7 7 0 0 1 14 0H5Z" />
      ) : (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 1 0-16 0" />
        </>
      )}
    </svg>
  );
}

/** Icono chispa/estrella (Pulse AI) */
export function SparkleIcon({ filled = false, width = 24, height = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {filled ? (
        <path d="M12 2a.75.75 0 0 1 .714.518l1.764 5.43a2.25 2.25 0 0 0 1.426 1.426l5.43 1.764a.75.75 0 0 1 0 1.424l-5.43 1.764a2.25 2.25 0 0 0-1.426 1.426l-1.764 5.43a.75.75 0 0 1-1.428 0l-1.764-5.43a2.25 2.25 0 0 0-1.426-1.426L2.144 12.9a.75.75 0 0 1 0-1.424l5.43-1.764A2.25 2.25 0 0 0 9 8.286L10.714 2.52A.75.75 0 0 1 12 2Z" />
      ) : (
        <path d="M12 3l1.68 5.17a2 2 0 0 0 1.27 1.27L20.17 11l-5.22 1.56a2 2 0 0 0-1.27 1.27L12 19l-1.68-5.17a2 2 0 0 0-1.27-1.27L3.83 11l5.22-1.56A2 2 0 0 0 10.32 8.17L12 3Z" />
      )}
    </svg>
  );
}

/** Icono burbuja de mensaje (Respuestas) */
export function MessageIcon({ filled = false, width = 24, height = 24, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {filled ? (
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.524 3.66 1.438 5.168L2.046 21.953a.5.5 0 0 0 .621.622l4.804-1.393A9.953 9.953 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Z" />
      ) : (
        <>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </>
      )}
    </svg>
  );
}
