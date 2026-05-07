'use client';

/**
 * Hugeicons wrappers with lucide-react-compatible names.
 * All existing JSX stays unchanged — only the import path changes:
 *   from 'lucide-react'  →  from '@/lib/icons'
 */

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { HugeiconsProps } from '@hugeicons/react';
import {
  AlertCircleIcon,
  Alert01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowReloadHorizontalIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  ArrowUpRight01Icon,
  Analytics01Icon,
  BarChartIcon,
  BlockedIcon,
  BookOpen01Icon,
  Building02Icon,
  CancelCircleIcon,
  Cancel01Icon,
  ChartDecreaseIcon,
  ChartIncreaseIcon,
  CheckmarkCircle01Icon,
  CheckmarkSquare01Icon,
  ClipboardIcon,
  Clock01Icon,
  Copy01Icon,
  CpuIcon,
  DashboardCircleIcon,
  DatabaseIcon,
  Delete01Icon,
  Download01Icon,
  Edit01Icon,
  EyeIcon,
  FileSearchIcon,
  FileStackIcon,
  File01Icon,
  FilterIcon,
  GearsIcon,
  HeadphonesIcon,
  HelpCircleIcon,
  InformationCircleIcon,
  Login01Icon,
  Logout01Icon,
  LockIcon,
  Mail01Icon,
  MailSend01Icon,
  NeuralNetworkIcon,
  Notification01Icon,
  Package01Icon,
  PieChart01Icon,
  PrinterIcon,
  Add01Icon,
  Search01Icon,
  SecurityCheckIcon,
  ServerStack01Icon,
  Setting06Icon,
  Shield01Icon,
  SlidersHorizontalIcon,
  TickDouble01Icon,
  Upload01Icon,
  UserGroup02Icon,
  ViewOffSlashIcon,
  WorkHistoryIcon,
  ZapIcon,
  WebhookIcon,
  Key01Icon,
  SaveIcon,
  Wifi01Icon,
  Activity01Icon,
  UserAdd01Icon,
  UserMinus01Icon,
  UserIcon,
  CreditCardIcon,
  Calendar01Icon,
  ArrowReloadHorizontalIcon as RotateCcwIcon,
  Comment01Icon,
} from '@hugeicons/core-free-icons';

// Square icon - hugeicons doesn't have a plain square so we inline a minimal SVG
const SquareSvg: Parameters<typeof HugeiconsIcon>[0]['icon'] = [
  ['rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', stroke: 'currentColor', strokeWidth: '1.5', fill: 'none', key: '0' }],
];

type IconProps = Omit<HugeiconsProps, 'icon'>;

const icon = (data: Parameters<typeof HugeiconsIcon>[0]['icon']) => {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <HugeiconsIcon ref={ref} icon={data} {...props} />
  ));
  Icon.displayName = 'HugeIcon';
  return Icon;
};

export const AlertCircle       = icon(AlertCircleIcon);
export const AlertTriangle     = icon(Alert01Icon);
export const ArrowDown         = icon(ArrowDown01Icon);
export const ArrowLeft         = icon(ArrowLeft01Icon);
export const ArrowRight        = icon(ArrowRight01Icon);
export const ArrowUp           = icon(ArrowUp01Icon);
export const Ban               = icon(BlockedIcon);
export const BarChart2         = icon(BarChartIcon);
export const BarChart3         = icon(Analytics01Icon);
export const Bell              = icon(Notification01Icon);
export const BookOpen          = icon(BookOpen01Icon);
export const Building2         = icon(Building02Icon);
export const Check             = icon(TickDouble01Icon);
export const CheckCircle       = icon(CheckmarkCircle01Icon);
export const CheckSquare       = icon(CheckmarkSquare01Icon);
export const ChevronDown       = icon(ArrowDown01Icon);
export const ChevronLeft       = icon(ArrowLeft01Icon);
export const ChevronRight      = icon(ArrowRight01Icon);
export const ChevronUp         = icon(ArrowUp01Icon);
export const ChevronsLeft      = icon(ArrowLeftDoubleIcon);
export const ChevronsRight     = icon(ArrowRightDoubleIcon);
export const ChevronsUpDown    = icon(ArrowUpDownIcon);
export const ClipboardList     = icon(ClipboardIcon);
export const Clock             = icon(Clock01Icon);
export const Copy              = icon(Copy01Icon);
export const Cpu               = icon(CpuIcon);
export const Database          = icon(DatabaseIcon);
export const Download          = icon(Download01Icon);
export const ExternalLink      = icon(ArrowUpRight01Icon);
export const Eye               = icon(EyeIcon);
export const EyeOff            = icon(ViewOffSlashIcon);
export const FileSearch        = icon(FileSearchIcon);
export const FileStack         = icon(FileStackIcon);
export const FileText          = icon(File01Icon);
export const Filter            = icon(FilterIcon);
export const Headphones        = icon(HeadphonesIcon);
export const HelpCircle        = icon(HelpCircleIcon);
export const History           = icon(WorkHistoryIcon);
export const Info              = icon(InformationCircleIcon);
export const LayoutDashboard   = icon(DashboardCircleIcon);
export const Lock              = icon(LockIcon);
export const LogIn             = icon(Login01Icon);
export const LogOut            = icon(Logout01Icon);
export const Mail              = icon(Mail01Icon);
export const Network           = icon(NeuralNetworkIcon);
export const Package           = icon(Package01Icon);
export const Pencil            = icon(Edit01Icon);
export const PieChart          = icon(PieChart01Icon);
export const Plus              = icon(Add01Icon);
export const Printer           = icon(PrinterIcon);
export const RefreshCw         = icon(ArrowReloadHorizontalIcon);
export const Search            = icon(Search01Icon);
export const Send              = icon(MailSend01Icon);
export const Server            = icon(ServerStack01Icon);
export const ServerCog         = icon(GearsIcon);
export const Settings2         = icon(Setting06Icon);
export const Shield            = icon(Shield01Icon);
export const ShieldCheck       = icon(SecurityCheckIcon);
export const SlidersHorizontal = icon(SlidersHorizontalIcon);
export const Trash2            = icon(Delete01Icon);
export const TrendingDown      = icon(ChartDecreaseIcon);
export const TrendingUp        = icon(ChartIncreaseIcon);
export const Upload            = icon(Upload01Icon);
export const Users             = icon(UserGroup02Icon);
export const X                 = icon(Cancel01Icon);
export const XCircle           = icon(CancelCircleIcon);
export const Zap               = icon(ZapIcon);
export const Webhook           = icon(WebhookIcon);
export const KeyRound          = icon(Key01Icon);
export const Save              = icon(SaveIcon);
export const Wifi              = icon(Wifi01Icon);
export const Activity          = icon(Activity01Icon);
export const UserPlus          = icon(UserAdd01Icon);
export const UserMinus         = icon(UserMinus01Icon);
export const User              = icon(UserIcon);
export const CreditCard        = icon(CreditCardIcon);
export const Calendar          = icon(Calendar01Icon);
export const RotateCcw         = icon(RotateCcwIcon);
export const MessageSquare     = icon(Comment01Icon);
export const Square            = icon(SquareSvg);
