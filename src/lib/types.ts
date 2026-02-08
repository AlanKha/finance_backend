export interface LinkedAccount {
  id: string;
  institution: string | null;
  display_name: string | null;
  last4: string | null;
  linked_at: string;
}

export interface AccountData {
  customer_id?: string;
  accounts: LinkedAccount[];
}

export interface StoredTransaction {
  id: string;
  transacted_at: number;
  amount: number;
  status: string;
  description: string;
  account_id: string;
  account_label: string;
  [key: string]: unknown;
}

export interface CleanTransaction {
  id: string;
  amount: number;
  description: string;
  status: string;
  category: string;
  date: string;
  year: number;
  month: number;
  account_label: string;
  status_transitions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CategoryOverrides {
  [transactionId: string]: string;
}
