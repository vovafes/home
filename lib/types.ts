export interface Family {
  id: string
  name: string
  invite_code: string
  created_by: string | null
  created_at: string
}

export interface Profile {
  id: string
  name: string
  avatar_url: string | null
  color: string
  created_at: string
}

export interface Store {
  id: string
  name: string
  icon: string
  color: string
  order_index: number
  created_by: string | null
  created_at: string
}

export interface ShoppingItem {
  id: string
  store_id: string
  name: string
  note: string | null
  quantity: number | null
  unit: string | null
  photo_url: string | null
  checked: boolean
  checked_by: string | null
  checked_at: string | null
  added_by: string
  created_at: string
  category?: string | null
  route_order?: number | null
  times_purchased?: number | null
  last_purchased_at?: string | null
  profiles?: Profile
  checker?: Profile
}

export interface Task {
  id: string
  title: string
  description: string | null
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  created_by: string
  assigned_to: string | null
  due_date: string | null
  recurrence?: string | null
  created_at: string
  profiles?: Profile
  checker?: Profile
  assignee?: Profile
  family_id?: string | null
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  all_day: boolean
  color: string
  user_id: string
  created_at: string
  profiles?: Profile
}
