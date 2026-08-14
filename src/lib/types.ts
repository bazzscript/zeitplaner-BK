export type Priority = "important" | "optional";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  google_refresh_token: string | null;
  google_access_token: string | null;
  google_token_expires_at: string | null;
}

export interface Link {
  id: string;
  url: string;
  label: string | null;
  item_id?: string | null;
  sub_item_id?: string | null;
  instance_id?: string | null;
}

export interface ImageRecord {
  id: string;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  url?: string;
  item_id?: string | null;
  sub_item_id?: string | null;
  instance_id?: string | null;
}

export interface SubItem {
  id: string;
  item_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  is_completed: boolean;
  sort_order: number;
  links?: Link[];
  images?: ImageRecord[];
}

export interface Item {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  start_time: string | null;
  end_time: string | null;
  google_event_id: string | null;
  google_recurring_event_id: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  sort_order: number;
  sub_items?: SubItem[];
  links?: Link[];
  images?: ImageRecord[];
}

export interface ItemInstance {
  id: string;
  master_item_id: string;
  instance_date: string;
  google_instance_id: string | null;
  title: string | null;
  description: string | null;
  priority: Priority | null;
  start_time: string | null;
  end_time: string | null;
  links?: Link[];
  images?: ImageRecord[];
  sub_item_states?: SubItemState[];
}

export interface SubItemState {
  id: string;
  instance_id: string;
  sub_item_id: string;
  is_completed: boolean;
  description: string | null;
  priority: Priority | null;
}

export interface DayItem {
  id: string;
  masterItemId: string;
  instanceId?: string;
  instanceDate: string;
  title: string;
  description: string | null;
  priority: Priority;
  startTime: string | null;
  endTime: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  googleEventId: string | null;
  subItems: DisplaySubItem[];
  links: Link[];
  images: ImageRecord[];
  isExcluded?: boolean;
}

export interface DisplaySubItem {
  id: string;
  subItemId: string;
  title: string;
  description: string | null;
  priority: Priority;
  isCompleted: boolean;
  links: Link[];
  images: ImageRecord[];
  hasInstanceOverride: boolean;
}

export type RecurrenceEditScope = "this" | "all";

export interface RecurrenceConfig {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  byDay?: string[];
  count?: number;
  until?: string;
}
