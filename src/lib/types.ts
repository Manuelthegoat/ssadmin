export type AdminVendor = {
  id: string;
  slug: string;
  name: string;
  category: string;
  booth: string | null;
  detail: string | null;
  about: string | null;
  logo_url: string | null;
  campaign_url: string | null;
  is_sponsor: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

export type VendorOption = {
  id: string;
  name: string;
  slug: string;
};

export type AdminProduct = {
  id: string;
  vendor_id: string;
  name: string;
  price_ngn: number;
  image_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  department: "MENS" | "WOMENS" | "UNISEX";
  created_at: string;
  vendors: { name: string; slug: string } | null;
  topic_id: string | null;
};

export type AdminHomeLink = {
  id: string;
  label: string;
  detail: string | null;
  icon: string;
  target: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

export type AdminHomeTab = {
  id: string;
  label: string;
  kicker: string | null;
  title: string | null;
  intro: string | null;
  hero_text: string | null;
  hero_image_url: string | null;
  pill_text: string | null;
  pill_shows_event: boolean;
  action_label: string | null;
  action_target: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

export type AdminScheduleItem = {
  id: string;
  title: string;
  place: string;
  category: "DROP" | "STAGE" | "DJ";
  day_number: number;
  day_label: string | null;
  start_time: string;
  end_time: string | null;
  image_url: string | null;
  is_live: boolean;
  is_published: boolean;
};

export type AdminFeedPost = {
  id: string;
  category: "DROPS" | "SCHEDULE" | "CROWD" | "INFO";
  title: string;
  detail: string;
  is_urgent: boolean;
  is_live: boolean;
  is_sold_out: boolean;
  is_published: boolean;
  published_at: string;
};

export type AdminFaq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
};
export type AdminLineup = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_published: boolean;
};
export type AdminEvent = {
  id: string;
  slug: string;
  title: string;
  badge: string | null;
  location: string | null;
  date_label: string | null;
  description: string | null;
  cover_url: string | null;
  sort_order: number;
  is_published: boolean;
  starts_on: string | null;
  ends_on: string | null;
};
export type AdminTopic = {
  id: string;
  label: string;
  sort_order: number;
  is_published: boolean;
};

export type AdminNews = {
  id: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  video_url: string | null;
  topic_id: string | null;
  published_at: string;
  is_published: boolean;
  home_tabs: { label: string } | null;
};
export type AdminEventVendor = {
  event_id: string;
  vendor_id: string;
  booth: string | null;
  is_sponsor: boolean;
  sort_order: number;
  vendors: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    category: string;
    is_published: boolean;
  } | null;
};
