interface UserAvatarProps {
  name: string;
  avatarUrl: string | null;
  /** Clases Tailwind para el tamaño del avatar, p. ej. "h-10 w-10". */
  size?: string;
}

/**
 * Avatar circular del usuario.
 * Si no tiene avatarUrl, muestra la primera letra del nombre sobre fondo de
 * color de marca.
 */
export function UserAvatar({ name, avatarUrl, size = "h-10 w-10" }: UserAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${size} rounded-full object-cover`}
      />
    );
  }

  // Inicial del nombre como fallback
  const inicial = name.charAt(0).toUpperCase();

  return (
    <div
      aria-label={name}
      className={`${size} flex items-center justify-center rounded-full bg-brand text-white font-semibold select-none`}
    >
      {inicial}
    </div>
  );
}
