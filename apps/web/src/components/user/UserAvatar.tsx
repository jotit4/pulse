/** Tamanos nombrados para el avatar (retrocompat. con size string libre). */
type AvatarSize = "sm" | "md" | "lg" | (string & {});

const sizeClasses: Record<"sm" | "md" | "lg", string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
};

interface UserAvatarProps {
  name: string;
  avatarUrl: string | null;
  /**
   * Tamano del avatar.
   * Acepta los tokens nombrados "sm" | "md" | "lg"
   * o clases Tailwind directas (p. ej. "h-12 w-12") para retrocompat.
   */
  size?: AvatarSize;
}

/** Genera un color de fondo determinista a partir del nombre del usuario. */
function avatarBgColor(name: string): string {
  const colors = ["#1d9bf0", "#794bc4", "#00ba7c", "#ff7a00", "#f91880", "#ffad1f"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0x7fffffff;
  }
  return colors[hash % colors.length] as string;
}

/**
 * Avatar circular del usuario.
 * - Con imagen: muestra la foto.
 * - Sin imagen: inicial del nombre sobre un color determinista.
 * - Accesible: alt en imagenes, aria-label en el fallback.
 */
export function UserAvatar({ name, avatarUrl, size = "md" }: UserAvatarProps) {
  const namedSizes = ["sm", "md", "lg"] as const;
  const isNamed = namedSizes.includes(size as "sm" | "md" | "lg");
  const sizeClass = isNamed ? sizeClasses[size as "sm" | "md" | "lg"] : (size as string);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  const inicial = name.charAt(0).toUpperCase();
  const bg = avatarBgColor(name);

  return (
    <div
      aria-label={name}
      className={`${sizeClass} flex items-center justify-center rounded-full font-bold text-white select-none flex-shrink-0`}
      style={{ backgroundColor: bg }}
    >
      {inicial}
    </div>
  );
}
