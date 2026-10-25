import Svg, { Circle, Path, Rect } from 'react-native-svg';

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
