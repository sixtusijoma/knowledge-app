import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

type IconProps = {
  color: string;
  size?: number;
};

export function SearchIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="6.25" stroke={color} strokeWidth={1.75} />
      <Path d="M16.2 16.2L20.5 20.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

export function FilterIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6.5h16M7 12h10M10 17.5h4" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

export function SunIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3.25" stroke={color} strokeWidth={1.75} />
      <Path
        d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M18 6l-1.6 1.6M7.6 16.4L6 18"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoonIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.5 14.8A6.4 6.4 0 0 1 9.2 6.2 6.5 6.5 0 1 0 16.5 14.8z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronLeftIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 5.5L8 12l6.5 6.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ArrowUpRightIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 16L16.5 7.5M9.5 7.5H16.5V14.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

export function FeedIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4.5" width="16" height="4.2" rx="1.2" stroke={color} strokeWidth={1.75} />
      <Rect x="4" y="10.4" width="16" height="4.2" rx="1.2" stroke={color} strokeWidth={1.75} />
      <Rect x="4" y="16.3" width="10" height="3.2" rx="1.2" stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

export function SportsIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.75} />
      <Path
        d="M12 4.2c1.8 2.3 1.8 13.3 0 15.6M12 4.2c-1.8 2.3-1.8 13.3 0 15.6M4.6 9.2h14.8M4.6 14.8h14.8"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function HealthIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19.2s-6.4-3.9-6.4-8.2a3.5 3.5 0 0 1 6.4-2 3.5 3.5 0 0 1 6.4 2c0 4.3-6.4 8.2-6.4 8.2z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MusicIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 17.4V6.2l9-1.8v8.4" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="6.8" cy="17.4" r="2.2" stroke={color} strokeWidth={1.75} />
      <Circle cx="15.8" cy="14.8" r="2.2" stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

export function MoviesIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="6" width="17" height="12" rx="2" stroke={color} strokeWidth={1.75} />
      <Path d="M10.2 9.4v5.2l4.8-2.6-4.8-2.6z" fill={color} />
    </Svg>
  );
}

export function ScienceIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Ellipse cx="12" cy="12" rx="8" ry="3.2" stroke={color} strokeWidth={1.5} />
      <Ellipse cx="12" cy="12" rx="8" ry="3.2" stroke={color} strokeWidth={1.5} transform="rotate(60 12 12)" />
      <Ellipse cx="12" cy="12" rx="8" ry="3.2" stroke={color} strokeWidth={1.5} transform="rotate(120 12 12)" />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
    </Svg>
  );
}

export function LifestyleIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 11.2L12 5l7.5 6.2M7.2 10.6V19h9.6v-8.4"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StatsIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 19.5V11" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M10 19.5V7" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M15 19.5V13.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M20 19.5V4.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}
