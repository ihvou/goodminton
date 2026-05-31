import type { LucideIcon } from 'lucide-react';
import {
  Award,
  Crown,
  Dumbbell,
  Flame,
  Medal,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  Waves,
  Zap,
} from 'lucide-react';
import {
  CLUB_ICON_IDS,
  DEFAULT_CLUB_ICON,
  type ClubIconId,
} from '@/lib/club-icons';

export const CLUB_ICON_OPTIONS: {
  id: ClubIconId;
  label: string;
  Icon: LucideIcon;
}[] = [
  { id: 'trophy', label: 'Trophy', Icon: Trophy },
  { id: 'target', label: 'Target', Icon: Target },
  { id: 'zap', label: 'Bolt', Icon: Zap },
  { id: 'flame', label: 'Flame', Icon: Flame },
  { id: 'star', label: 'Star', Icon: Star },
  { id: 'shield', label: 'Shield', Icon: Shield },
  { id: 'award', label: 'Award', Icon: Award },
  { id: 'crown', label: 'Crown', Icon: Crown },
  { id: 'dumbbell', label: 'Dumbbell', Icon: Dumbbell },
  { id: 'medal', label: 'Medal', Icon: Medal },
  { id: 'rocket', label: 'Rocket', Icon: Rocket },
  { id: 'sparkles', label: 'Sparkles', Icon: Sparkles },
  { id: 'swords', label: 'Swords', Icon: Swords },
  { id: 'waves', label: 'Waves', Icon: Waves },
];

export function ClubIcon({
  icon,
  className,
  size = 20,
}: {
  icon?: string | null;
  className?: string;
  size?: number;
}) {
  const selected = CLUB_ICON_IDS.includes(icon as ClubIconId)
    ? icon
    : DEFAULT_CLUB_ICON;
  const iconProps = { className, size, 'aria-hidden': true };

  switch (selected) {
    case 'target':
      return <Target {...iconProps} />;
    case 'zap':
      return <Zap {...iconProps} />;
    case 'flame':
      return <Flame {...iconProps} />;
    case 'star':
      return <Star {...iconProps} />;
    case 'shield':
      return <Shield {...iconProps} />;
    case 'award':
      return <Award {...iconProps} />;
    case 'crown':
      return <Crown {...iconProps} />;
    case 'dumbbell':
      return <Dumbbell {...iconProps} />;
    case 'medal':
      return <Medal {...iconProps} />;
    case 'rocket':
      return <Rocket {...iconProps} />;
    case 'sparkles':
      return <Sparkles {...iconProps} />;
    case 'swords':
      return <Swords {...iconProps} />;
    case 'waves':
      return <Waves {...iconProps} />;
    default:
      return <Trophy {...iconProps} />;
  }
}
