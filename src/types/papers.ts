export interface Paper {
  id: string
  title: string
  authors: string[]
  journal: string
  year: number
  citations?: number // Made optional
  abstract?: string // Made optional
  pdfUrl?: string
}

export interface SavedPaper extends Paper {
  user_id: string
  paper_id: string
  is_liked?: boolean
  list_id?: string
  created_at: string
}