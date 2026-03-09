interface DesktopIconProps {
  label: string;
  img: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export default function DesktopIcon({
  label,
  img,
  onClick,
  onDoubleClick,
}: DesktopIconProps) {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
        width: 75,
        userSelect: 'none',
        padding: '4px 0',
        borderRadius: 2,
      }}
    >
      <img src={img} alt={label} style={{ width: 32, height: 32 }} />
      <span
        style={{
          fontSize: 11,
          fontFamily: 'Tahoma, sans-serif',
          color: 'white',
          textShadow: '0px 1px 1px black',
          textAlign: 'center',
          width: 64,
        }}
      >
        {label}
      </span>
    </div>
  );
}
