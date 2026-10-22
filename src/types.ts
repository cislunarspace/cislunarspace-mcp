export interface DictEntry {
  slug: string;
  title: string;
  otherTitle?: string | null;
  definition?: string;
  url?: string;
  keywords?: string[];
  aliases?: string[];
  citations?: string[];
}

export interface DictCategory {
  slug: string;
  label: string;
  entries: DictEntry[];
}

export interface Dictionary {
  categories: DictCategory[];
}

export interface FlatEntry extends DictEntry {
  category: string;
  categoryLabel: string;
  url: string;
}

export interface SearchHit {
  entry: FlatEntry;
  score: number;
  excerpt: string;
}
