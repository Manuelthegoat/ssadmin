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