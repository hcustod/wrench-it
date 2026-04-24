export default function BrandMark({ size = 24, className = '' }) {
  return (
    <img
      src="/brand/wrenchit-mark.svg"
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    />
  );
}




