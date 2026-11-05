import { IC } from '@/lib/iconPaths';

// Stroke icon from the shared path table. Paths are static markup we control, so innerHTML is safe here.
export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg
      className="ic"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: IC[name] ?? IC.plate }}
    />
  );
}
