import clsx from 'clsx';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export default function UserAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  return (
    <div
      role="img"
      aria-label={`Ảnh đại diện của ${name}`}
      className={clsx(
        'flex flex-shrink-0 items-center justify-center rounded-full bg-cover bg-center font-bold',
        !avatarUrl && fallbackClassName,
        className,
      )}
      style={avatarUrl ? { backgroundImage: `url(${JSON.stringify(avatarUrl)})` } : undefined}
    >
      {!avatarUrl && name.charAt(0).toUpperCase()}
    </div>
  );
}
