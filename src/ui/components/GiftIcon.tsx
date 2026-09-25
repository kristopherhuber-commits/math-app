// A drawn gift box: the shop picture until the parent adds a real one.
export function GiftIcon() {
  return (
    <svg
      className="gift-icon"
      viewBox="0 0 64 64"
      width="96"
      height="96"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="gift-box" x="10" y="26" width="44" height="30" rx="4" />
      <rect className="gift-box" x="6" y="18" width="52" height="12" rx="3" />
      <rect className="gift-ribbon" x="28" y="18" width="8" height="38" />
      <path className="gift-ribbon" d="M32 18 C 22 4, 10 12, 20 18 Z M32 18 C 42 4, 54 12, 44 18 Z" />
    </svg>
  );
}
