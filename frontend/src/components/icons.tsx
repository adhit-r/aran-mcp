import { LucideProps } from 'lucide-react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import dynamic from 'next/dynamic';

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: keyof typeof dynamicIconImports;
}

type Icon = (props: LucideProps) => JSX.Element;

const createIcon = (name: string): Icon => {
  return function IconComponent(props: LucideProps) {
    const LucideIcon = dynamic(dynamicIconImports[name as keyof typeof dynamicIconImports]);
    return <LucideIcon {...props} />;
  };
};

export const Icons = {
  // Base Icons
  spinner: (props: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  logo: (props: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  
  // Server Related Icons
  server: createIcon('server'),
  database: createIcon('database'),
  hardDrive: createIcon('hard-drive'),
  network: createIcon('network'),
  
  // Status Icons
  checkCircle: createIcon('check-circle'),
  alertCircle: createIcon('alert-circle'),
  alertTriangle: createIcon('alert-triangle'),
  info: createIcon('info'),
  
  // Action Icons
  plus: createIcon('plus'),
  edit: createIcon('edit'),
  trash: createIcon('trash-2'),
  refreshCw: createIcon('refresh-cw'),
  search: createIcon('search'),
  filter: createIcon('filter'),
  settings: createIcon('settings'),
  
  // Navigation Icons
  home: createIcon('home'),
  serverIcon: createIcon('server'),
  bell: createIcon('bell'),
  user: createIcon('user'),
  logOut: createIcon('log-out'),
  
  // Chart Icons
  barChart: createIcon('bar-chart-2'),
  lineChart: createIcon('line-chart'),
  pieChart: createIcon('pie-chart'),
  activity: createIcon('activity'),
  
  // Time & Date Icons
  clock: createIcon('clock'),
  calendar: createIcon('calendar'),
  
  // Status Indicators
  circle: createIcon('circle'),
  check: createIcon('check'),
  x: createIcon('x'),
  
  // Other UI Icons
  chevronDown: createIcon('chevron-down'),
  chevronRight: createIcon('chevron-right'),
  moreHorizontal: createIcon('more-horizontal'),
  externalLink: createIcon('external-link'),
  link: createIcon('link'),
  copy: createIcon('copy'),
  download: createIcon('download'),
  upload: createIcon('upload'),
  
  // Theme & Display
  sun: createIcon('sun'),
  moon: createIcon('moon'),
  monitor: createIcon('monitor'),
  
  // Form Controls
  checkSquare: createIcon('check-square'),
  square: createIcon('square'),
  radio: createIcon('circle'),
  
  // Media Icons
  image: createIcon('image'),
  file: createIcon('file'),
  fileText: createIcon('file-text'),
  
  // Communication
  mail: createIcon('mail'),
  messageSquare: createIcon('message-square'),
  send: createIcon('send'),
  
  // Arrows
  arrowUp: createIcon('arrow-up'),
  arrowRight: createIcon('arrow-right'),
  arrowDown: createIcon('arrow-down'),
  arrowLeft: createIcon('arrow-left'),
  
  // Layout
  menu: createIcon('menu'),
  grid: createIcon('grid'),
  list: createIcon('list'),
  
  // Authentication
  lock: createIcon('lock'),
  unlock: createIcon('unlock'),
  key: createIcon('key'),
  userPlus: createIcon('user-plus'),
  
  // Status
  zap: createIcon('zap'),
  zapOff: createIcon('zap-off'),
  battery: createIcon('battery'),
  batteryCharging: createIcon('battery-charging'),
  
  // Navigation
  chevronLeft: createIcon('chevron-left'),
  chevronUp: createIcon('chevron-up'),
  chevronsLeft: createIcon('chevrons-left'),
  chevronsRight: createIcon('chevrons-right'),
  chevronsUp: createIcon('chevrons-up'),
  chevronsDown: createIcon('chevrons-down'),
  
  // File Operations
  folder: createIcon('folder'),
  folderPlus: createIcon('folder-plus'),
  folderMinus: createIcon('folder-minus'),
  folderOpen: createIcon('folder-open'),
  
  // Code & Development
  code: createIcon('code'),
  terminal: createIcon('terminal'),
  gitBranch: createIcon('git-branch'),
  gitCommit: createIcon('git-commit'),
  gitMerge: createIcon('git-merge'),
  gitPullRequest: createIcon('git-pull-request'),
  
  // Media Playback
  play: createIcon('play'),
  pause: createIcon('pause'),
  stop: createIcon('square'),
  skipBack: createIcon('skip-back'),
  skipForward: createIcon('skip-forward'),
  rewind: createIcon('rewind'),
  fastForward: createIcon('fast-forward'),
  
  // Social
  github: createIcon('github'),
  twitter: createIcon('twitter'),
  linkedin: createIcon('linkedin'),
  facebook: createIcon('facebook'),
  instagram: createIcon('instagram'),
  youtube: createIcon('youtube'),
  
  // Payment
  creditCard: createIcon('credit-card'),
  dollarSign: createIcon('dollar-sign'),
  shoppingCart: createIcon('shopping-cart'),
  
  // Devices
  smartphone: createIcon('smartphone'),
  tablet: createIcon('tablet'),
  monitor: createIcon('monitor'),
  printer: createIcon('printer'),
  
  // Maps & Navigation
  map: createIcon('map'),
  mapPin: createIcon('map-pin'),
  navigation: createIcon('navigation'),
  compass: createIcon('compass'),
  
  // Weather
  sun: createIcon('sun'),
  cloud: createIcon('cloud'),
  cloudRain: createIcon('cloud-rain'),
  cloudSnow: createIcon('cloud-snow'),
  cloudLightning: createIcon('zap'),
  wind: createIcon('wind'),
  umbrella: createIcon('umbrella'),
  
  // Toggle
  toggleLeft: createIcon('toggle-left'),
  toggleRight: createIcon('toggle-right'),
  
  // Media Controls
  volume: createIcon('volume-2'),
  volumeX: createIcon('volume-x'),
  volume1: createIcon('volume-1'),
  volume2: createIcon('volume-2'),
  
  // Layout
  columns: createIcon('columns'),
  sidebar: createIcon('sidebar'),
  layout: createIcon('layout'),
  
  // Text Formatting
  type: createIcon('type'),
  bold: createIcon('bold'),
  italic: createIcon('italic'),
  underline: createIcon('underline'),
  strikethrough: createIcon('strikethrough'),
  
  // Lists
  list: createIcon('list'),
  listOrdered: createIcon('list-ordered'),
  listChecks: createIcon('list-checks'),
  
  // Alignments
  alignLeft: createIcon('align-left'),
  alignCenter: createIcon('align-center'),
  alignRight: createIcon('align-right'),
  alignJustify: createIcon('align-justify'),
  
  // Indentation
  indent: createIcon('indent'),
  outdent: createIcon('outdent'),
  
  // Code Blocks
  code: createIcon('code'),
  terminal: createIcon('terminal'),
  
  // Tables
  table: createIcon('table'),
  
  // Embeds
  image: createIcon('image'),
  link: createIcon('link'),
  
  // Special Characters
  hash: createIcon('hash'),
  minus: createIcon('minus'),
  plus: createIcon('plus'),
  x: createIcon('x'),
  
  // Formatting
  type: createIcon('type'),
  heading: createIcon('type'),
  quote: createIcon('quote'),
  
  // Other
  helpCircle: createIcon('help-circle'),
  info: createIcon('info'),
  alertCircle: createIcon('alert-circle'),
  alertTriangle: createIcon('alert-triangle'),
  checkCircle: createIcon('check-circle'),
  xCircle: createIcon('x-circle'),
  
  // Custom Icons
  pencil: createIcon('pencil'),
  trash: createIcon('trash-2'),
  bars: createIcon('bar-chart-2'),
  chart: createIcon('bar-chart-2'),
  
  // Add any other custom icons here
};

export function Icon({ name, ...props }: IconProps) {
  const DynamicIcon = Icons[name as keyof typeof Icons] || Icons.helpCircle;
  return <DynamicIcon {...props} />;
}
