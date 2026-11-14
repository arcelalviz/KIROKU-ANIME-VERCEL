/* Shared, client-safe anime discovery filters. */
export const GENRES = [
  { value: "", label: "All genres" },
  { value: "action", label: "Action" },
  { value: "adventure", label: "Adventure" },
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
  { value: "fantasy", label: "Fantasy" },
  { value: "romance", label: "Romance" },
  { value: "science-fiction", label: "Sci-Fi" },
  { value: "slice-of-life", label: "Slice of Life" },
  { value: "mystery", label: "Mystery" },
  { value: "sports", label: "Sports" },
  { value: "music", label: "Music" },
  { value: "supernatural", label: "Supernatural" },
  { value: "historical", label: "Historical" },
] as const;
export const TYPE_OPTIONS = ["", "TV", "movie", "OVA", "ONA", "special"] as const;
export const SEASONS = ["", "winter", "spring", "summer", "fall"] as const;
export const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "rated", label: "Highest rated" },
  { value: "newest", label: "Newest releases" },
  { value: "oldest", label: "Oldest releases" },
] as const;
export type BrowseParams = { q?: string; genre?: string; type?: string; status?: string; season?: string; year?: string; sort?: string; page?: number };

