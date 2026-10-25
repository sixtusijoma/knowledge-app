import { HealthIcon, LifestyleIcon, MoviesIcon, MusicIcon, ScienceIcon, SportsIcon } from '@/components/Icons';

export function TopicGlyph({ topic, color, size = 14 }: { topic: string; color: string; size?: number }) {
  if (topic === 'Sports') {
    return <SportsIcon color={color} size={size} />;
  }
  if (topic === 'Health & Fitness') {
    return <HealthIcon color={color} size={size} />;
  }
  if (topic === 'Music') {
    return <MusicIcon color={color} size={size} />;
  }
  if (topic === 'Movies/TV/Anime') {
    return <MoviesIcon color={color} size={size} />;
  }
  if (topic === 'Science & Tech') {
    return <ScienceIcon color={color} size={size} />;
  }
  if (topic === 'Lifestyle') {
    return <LifestyleIcon color={color} size={size} />;
  }
  return null;
}
