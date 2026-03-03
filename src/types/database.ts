import type {
  UserRole,
  ContractStatus,
  ExtractionStatus,
  DocumentType,
  ObligationStatus,
  RiskSeverity,
  VendorSyncStatus,
  InvoiceStatus,
} from './contracts';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          title: string;
          counterparty_name: string | null;
          document_type: DocumentType | null;
          document_types: string[] | null;
          status: ContractStatus;
          extraction_status: ExtractionStatus;
          summary: string | null;
          effective_date: string | null;
          expiry_date: string | null;
          notice_period_days: number | null;
          auto_renewal: boolean;
          renewal_term_months: number | null;
          governing_law: string | null;
          file_path: string;
          file_name: string;
          file_size_bytes: number | null;
          file_type: string | null;
          uploaded_by: string | null;
          verified_by: string | null;
          verified_at: string | null;
          search_vector: string | null;
          raw_text: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          counterparty_name?: string | null;
          document_type?: DocumentType | null;
          document_types?: string[] | null;
          status?: ContractStatus;
          extraction_status?: ExtractionStatus;
          summary?: string | null;
          effective_date?: string | null;
          expiry_date?: string | null;
          notice_period_days?: number | null;
          auto_renewal?: boolean;
          renewal_term_months?: number | null;
          governing_law?: string | null;
          file_path: string;
          file_name: string;
          file_size_bytes?: number | null;
          file_type?: string | null;
          uploaded_by?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          raw_text?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          counterparty_name?: string | null;
          document_type?: DocumentType | null;
          document_types?: string[] | null;
          status?: ContractStatus;
          extraction_status?: ExtractionStatus;
          summary?: string | null;
          effective_date?: string | null;
          expiry_date?: string | null;
          notice_period_days?: number | null;
          auto_renewal?: boolean;
          renewal_term_months?: number | null;
          governing_law?: string | null;
          file_path?: string;
          file_name?: string;
          file_size_bytes?: number | null;
          file_type?: string | null;
          uploaded_by?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          raw_text?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      commercial_terms: {
        Row: {
          id: string;
          contract_id: string;
          term_type: string;
          description: string;
          amount: number | null;
          currency: string | null;
          frequency: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          term_type: string;
          description: string;
          amount?: number | null;
          currency?: string | null;
          frequency?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          term_type?: string;
          description?: string;
          amount?: number | null;
          currency?: string | null;
          frequency?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      obligations: {
        Row: {
          id: string;
          contract_id: string;
          title: string;
          description: string | null;
          obligated_party: string | null;
          due_date: string | null;
          status: ObligationStatus;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          title: string;
          description?: string | null;
          obligated_party?: string | null;
          due_date?: string | null;
          status?: ObligationStatus;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          title?: string;
          description?: string | null;
          obligated_party?: string | null;
          due_date?: string | null;
          status?: ObligationStatus;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      risk_flags: {
        Row: {
          id: string;
          contract_id: string;
          title: string;
          description: string | null;
          severity: RiskSeverity;
          resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          title: string;
          description?: string | null;
          severity?: RiskSeverity;
          resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          title?: string;
          description?: string | null;
          severity?: RiskSeverity;
          resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      contract_tags: {
        Row: {
          id: string;
          contract_id: string;
          tag: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          tag: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          tag?: string;
        };
        Relationships: [];
      };
      contract_links: {
        Row: {
          id: string;
          parent_contract_id: string;
          child_contract_id: string;
          link_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_contract_id: string;
          child_contract_id: string;
          link_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          parent_contract_id?: string;
          child_contract_id?: string;
          link_type?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          contract_id: string | null;
          user_id: string | null;
          action: string;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id?: string | null;
          user_id?: string | null;
          action: string;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string | null;
          user_id?: string | null;
          action?: string;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          contract_id: string | null;
          type: string;
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contract_id?: string | null;
          type: string;
          message: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contract_id?: string | null;
          type?: string;
          message?: string;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          netsuite_vendor_id: string | null;
          netsuite_entity_id: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          tax_id: string | null;
          sync_status: VendorSyncStatus;
          last_synced_at: string | null;
          sync_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          netsuite_vendor_id?: string | null;
          netsuite_entity_id?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          tax_id?: string | null;
          sync_status?: VendorSyncStatus;
          last_synced_at?: string | null;
          sync_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          netsuite_vendor_id?: string | null;
          netsuite_entity_id?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          tax_id?: string | null;
          sync_status?: VendorSyncStatus;
          last_synced_at?: string | null;
          sync_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contract_vendors: {
        Row: {
          id: string;
          contract_id: string;
          vendor_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          vendor_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          vendor_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      contract_chunks: {
        Row: {
          id: string;
          contract_id: string;
          chunk_index: number;
          content: string;
          embedding: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          chunk_index: number;
          content: string;
          embedding?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          chunk_index?: number;
          content?: string;
          embedding?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      escalation_log: {
        Row: {
          id: string;
          contract_id: string;
          tier: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          tier: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          tier?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          vendor_id: string;
          contract_id: string | null;
          netsuite_invoice_id: string | null;
          invoice_number: string | null;
          amount: number;
          amount_paid: number;
          amount_remaining: number;
          currency: string;
          status: InvoiceStatus;
          invoice_date: string | null;
          due_date: string | null;
          netsuite_data: Json | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          contract_id?: string | null;
          netsuite_invoice_id?: string | null;
          invoice_number?: string | null;
          amount: number;
          amount_paid?: number;
          amount_remaining?: number;
          currency?: string;
          status?: InvoiceStatus;
          invoice_date?: string | null;
          due_date?: string | null;
          netsuite_data?: Json | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          contract_id?: string | null;
          netsuite_invoice_id?: string | null;
          invoice_number?: string | null;
          amount?: number;
          amount_paid?: number;
          amount_remaining?: number;
          currency?: string;
          status?: InvoiceStatus;
          invoice_date?: string | null;
          due_date?: string | null;
          netsuite_data?: Json | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_contract_chunks: {
        Args: {
          query_embedding: string;
          match_threshold: number;
          match_count: number;
        };
        Returns: {
          id: string;
          contract_id: string;
          chunk_index: number;
          content: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      contract_status: ContractStatus;
      extraction_status: ExtractionStatus;
      document_type: DocumentType;
      obligation_status: ObligationStatus;
      risk_severity: RiskSeverity;
      vendor_sync_status: VendorSyncStatus;
      invoice_status: InvoiceStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
