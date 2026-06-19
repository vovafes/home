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
  profiles?: Profile
  checker?: Profile
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
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
