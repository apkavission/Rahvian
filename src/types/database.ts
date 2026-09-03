// Generated file — do not edit by hand.
// Regenerate with: npm run db:types
//
// Source: the live PostgREST schema description for the "company" schema.
// Every change to supabase/migrations must be followed by a regeneration, or
// the types here will quietly disagree with the database.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  company: {
    Tables: {
      blog_categories: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          sort_order: number
          seo_title: string | null
          seo_description: string | null
          og_image_id: string | null
          noindex: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          sort_order?: number
          seo_title?: string | null
          seo_description?: string | null
          og_image_id?: string | null
          noindex?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          sort_order?: number
          seo_title?: string | null
          seo_description?: string | null
          og_image_id?: string | null
          noindex?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_categories_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          }
        ]
      }
      blog_posts: {
        Row: {
          id: string
          slug: string
          title: string
          excerpt: string | null
          content: string
          featured_image_id: string | null
          category_id: string | null
          tags: string[]
          author_id: string | null
          status: Database["company"]["Enums"]["content_status"]
          published_at: string | null
          reading_minutes: number | null
          is_featured: boolean
          view_count: number
          seo_title: string | null
          seo_description: string | null
          seo_keywords: string[]
          og_image_id: string | null
          canonical_url: string | null
          noindex: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          excerpt?: string | null
          content?: string
          featured_image_id?: string | null
          category_id?: string | null
          tags: string[]
          author_id?: string | null
          status?: Database["company"]["Enums"]["content_status"]
          published_at?: string | null
          reading_minutes?: number | null
          is_featured?: boolean
          view_count?: number
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords: string[]
          og_image_id?: string | null
          canonical_url?: string | null
          noindex?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          excerpt?: string | null
          content?: string
          featured_image_id?: string | null
          category_id?: string | null
          tags?: string[]
          author_id?: string | null
          status?: Database["company"]["Enums"]["content_status"]
          published_at?: string | null
          reading_minutes?: number | null
          is_featured?: boolean
          view_count?: number
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords?: string[]
          og_image_id?: string | null
          canonical_url?: string | null
          noindex?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_featured_image_id_fkey"
            columns: ["featured_image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          }
        ]
      }
      case_studies: {
        Row: {
          id: string
          slug: string
          project_id: string | null
          title: string
          client_name: string | null
          industry: string | null
          problem: string | null
          solution: string | null
          features: Json
          technology_ids: string[]
          screenshots: Json
          results: Json | null
          testimonial_id: string | null
          duration: string | null
          status: Database["company"]["Enums"]["content_status"]
          seo_title: string | null
          seo_description: string | null
          seo_keywords: string[]
          og_image_id: string | null
          canonical_url: string | null
          noindex: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          project_id?: string | null
          title: string
          client_name?: string | null
          industry?: string | null
          problem?: string | null
          solution?: string | null
          features: Json
          technology_ids: string[]
          screenshots: Json
          results?: Json | null
          testimonial_id?: string | null
          duration?: string | null
          status?: Database["company"]["Enums"]["content_status"]
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords: string[]
          og_image_id?: string | null
          canonical_url?: string | null
          noindex?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          project_id?: string | null
          title?: string
          client_name?: string | null
          industry?: string | null
          problem?: string | null
          solution?: string | null
          features?: Json
          technology_ids?: string[]
          screenshots?: Json
          results?: Json | null
          testimonial_id?: string | null
          duration?: string | null
          status?: Database["company"]["Enums"]["content_status"]
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords?: string[]
          og_image_id?: string | null
          canonical_url?: string | null
          noindex?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_studies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_studies_testimonial_id_fkey"
            columns: ["testimonial_id"]
            isOneToOne: false
            referencedRelation: "testimonials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_studies_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          }
        ]
      }
      email_templates: {
        Row: {
          key: string
          name: string
          description: string | null
          subject: string
          preheader: string | null
          heading: string
          intro: string | null
          steps: Json
          button: Json | null
          note: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          key: string
          name: string
          description?: string | null
          subject: string
          preheader?: string | null
          heading: string
          intro?: string | null
          steps: Json
          button?: Json | null
          note?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          key?: string
          name?: string
          description?: string | null
          subject?: string
          preheader?: string | null
          heading?: string
          intro?: string | null
          steps?: Json
          button?: Json | null
          note?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          id: string
          question: string
          answer: string
          scope: string[]
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          question: string
          answer: string
          scope: string[]
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          question?: string
          answer?: string
          scope?: string[]
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          id: string
          form_key: string
          ip_hash: string
          email_hash: string | null
          succeeded: boolean
          created_at: string
        }
        Insert: {
          id?: string
          form_key: string
          ip_hash: string
          email_hash?: string | null
          succeeded?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          form_key?: string
          ip_hash?: string
          email_hash?: string | null
          succeeded?: boolean
          created_at?: string
        }
        Relationships: []
      }
      lead_activity: {
        Row: {
          id: string
          lead_id: string
          actor_id: string | null
          action: string
          from_value: string | null
          to_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          actor_id?: string | null
          action: string
          from_value?: string | null
          to_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          actor_id?: string | null
          action?: string
          from_value?: string | null
          to_value?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      lead_notes: {
        Row: {
          id: string
          lead_id: string
          author_id: string | null
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          author_id?: string | null
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      leads: {
        Row: {
          id: string
          name: string
          company_name: string | null
          email: string
          phone: string | null
          whatsapp: string | null
          service_id: string | null
          budget_range: string | null
          timeline: string | null
          description: string
          existing_website: string | null
          preferred_contact: string | null
          source_page: string | null
          referrer: string | null
          utm: Json
          status: Database["company"]["Enums"]["lead_status"]
          assigned_to: string | null
          value_estimate: number | null
          ip_hash: string | null
          user_agent: string | null
          is_spam: boolean
          archived_at: string | null
          consent_given: boolean
          consent_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          company_name?: string | null
          email: string
          phone?: string | null
          whatsapp?: string | null
          service_id?: string | null
          budget_range?: string | null
          timeline?: string | null
          description?: string
          existing_website?: string | null
          preferred_contact?: string | null
          source_page?: string | null
          referrer?: string | null
          utm: Json
          status?: Database["company"]["Enums"]["lead_status"]
          assigned_to?: string | null
          value_estimate?: number | null
          ip_hash?: string | null
          user_agent?: string | null
          is_spam?: boolean
          archived_at?: string | null
          consent_given?: boolean
          consent_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          company_name?: string | null
          email?: string
          phone?: string | null
          whatsapp?: string | null
          service_id?: string | null
          budget_range?: string | null
          timeline?: string | null
          description?: string
          existing_website?: string | null
          preferred_contact?: string | null
          source_page?: string | null
          referrer?: string | null
          utm?: Json
          status?: Database["company"]["Enums"]["lead_status"]
          assigned_to?: string | null
          value_estimate?: number | null
          ip_hash?: string | null
          user_agent?: string | null
          is_spam?: boolean
          archived_at?: string | null
          consent_given?: boolean
          consent_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      leave_types: {
        Row: {
          key: string
          label: string
          description: string
          is_paid: boolean
          needs_balance: boolean
          is_system: boolean
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          key: string
          label: string
          description?: string
          is_paid?: boolean
          needs_balance?: boolean
          is_system?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          key?: string
          label?: string
          description?: string
          is_paid?: boolean
          needs_balance?: boolean
          is_system?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          id: string
          r2_key: string
          public_url: string
          filename: string
          mime_type: string
          size_bytes: number
          width: number | null
          height: number | null
          alt_text: string
          caption: string | null
          folder: string
          blurhash: string | null
          dark_variant_id: string | null
          attribution: string | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          r2_key: string
          public_url: string
          filename: string
          mime_type: string
          size_bytes: number
          width?: number | null
          height?: number | null
          alt_text: string
          caption?: string | null
          folder?: string
          blurhash?: string | null
          dark_variant_id?: string | null
          attribution?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          r2_key?: string
          public_url?: string
          filename?: string
          mime_type?: string
          size_bytes?: number
          width?: number | null
          height?: number | null
          alt_text?: string
          caption?: string | null
          folder?: string
          blurhash?: string | null
          dark_variant_id?: string | null
          attribution?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_dark_variant_id_fkey"
            columns: ["dark_variant_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      nav_items: {
        Row: {
          id: string
          location: Database["company"]["Enums"]["nav_location"]
          label: string
          href: string
          parent_id: string | null
          sort_order: number
          is_external: boolean
          open_new_tab: boolean
          icon: string | null
          badge_text: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location: Database["company"]["Enums"]["nav_location"]
          label: string
          href: string
          parent_id?: string | null
          sort_order?: number
          is_external?: boolean
          open_new_tab?: boolean
          icon?: string | null
          badge_text?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location?: Database["company"]["Enums"]["nav_location"]
          label?: string
          href?: string
          parent_id?: string | null
          sort_order?: number
          is_external?: boolean
          open_new_tab?: boolean
          icon?: string | null
          badge_text?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nav_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nav_items"
            referencedColumns: ["id"]
          }
        ]
      }
      page_sections: {
        Row: {
          id: string
          page_id: string
          type: string
          sort_order: number
          is_active: boolean
          content: Json
          custom_class: string | null
          background_variant: string
          motion_preset: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          page_id: string
          type: string
          sort_order?: number
          is_active?: boolean
          content: Json
          custom_class?: string | null
          background_variant?: string
          motion_preset?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          page_id?: string
          type?: string
          sort_order?: number
          is_active?: boolean
          content?: Json
          custom_class?: string | null
          background_variant?: string
          motion_preset?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          }
        ]
      }
      pages: {
        Row: {
          id: string
          slug: string
          title: string
          status: Database["company"]["Enums"]["content_status"]
          is_system: boolean
          seo_title: string | null
          seo_description: string | null
          seo_keywords: string[]
          og_image_id: string | null
          canonical_url: string | null
          noindex: boolean
          schema_type: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          status?: Database["company"]["Enums"]["content_status"]
          is_system?: boolean
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords: string[]
          og_image_id?: string | null
          canonical_url?: string | null
          noindex?: boolean
          schema_type?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          status?: Database["company"]["Enums"]["content_status"]
          is_system?: boolean
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords?: string[]
          og_image_id?: string | null
          canonical_url?: string | null
          noindex?: boolean
          schema_type?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          }
        ]
      }
      pricing_plans: {
        Row: {
          id: string
          slug: string
          name: string
          tagline: string | null
          price_from: number | null
          currency: string
          price_note: string | null
          is_custom_quote: boolean
          features: Json
          is_highlighted: boolean
          cta_label: string
          cta_href: string
          sort_order: number
          status: Database["company"]["Enums"]["content_status"]
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          tagline?: string | null
          price_from?: number | null
          currency?: string
          price_note?: string | null
          is_custom_quote?: boolean
          features: Json
          is_highlighted?: boolean
          cta_label?: string
          cta_href?: string
          sort_order?: number
          status?: Database["company"]["Enums"]["content_status"]
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          tagline?: string | null
          price_from?: number | null
          currency?: string
          price_note?: string | null
          is_custom_quote?: boolean
          features?: Json
          is_highlighted?: boolean
          cta_label?: string
          cta_href?: string
          sort_order?: number
          status?: Database["company"]["Enums"]["content_status"]
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      process_steps: {
        Row: {
          id: string
          step_number: number
          title: string
          description: string
          icon: string | null
          duration_note: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          step_number: number
          title: string
          description?: string
          icon?: string | null
          duration_note?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          step_number?: number
          title?: string
          description?: string
          icon?: string | null
          duration_note?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          role: string
          app_access: string[]
          is_active: boolean
          preferred_mode: Database["company"]["Enums"]["theme_mode"]
          last_login_at: string | null
          created_at: string
          updated_at: string
          menu_extra: string[]
          menu_denied: string[]
          address: string | null
          work_latitude: number | null
          work_longitude: number | null
          work_radius_metres: number
        }
        Insert: {
          id: string
          full_name?: string
          avatar_url?: string | null
          role?: string
          app_access: string[]
          is_active?: boolean
          preferred_mode?: Database["company"]["Enums"]["theme_mode"]
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          menu_extra: string[]
          menu_denied: string[]
          address?: string | null
          work_latitude?: number | null
          work_longitude?: number | null
          work_radius_metres?: number
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string | null
          role?: string
          app_access?: string[]
          is_active?: boolean
          preferred_mode?: Database["company"]["Enums"]["theme_mode"]
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          menu_extra?: string[]
          menu_denied?: string[]
          address?: string | null
          work_latitude?: number | null
          work_longitude?: number | null
          work_radius_metres?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["key"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          slug: string
          title: string
          type: Database["company"]["Enums"]["project_type"]
          category: string | null
          client_name: string | null
          summary: string
          problem: string | null
          solution: string | null
          features: Json
          capabilities: Json
          technology_ids: string[]
          service_ids: string[]
          thumbnail_id: string | null
          gallery: Json
          live_url: string | null
          admin_demo_url: string | null
          demo_credentials: Json | null
          variants: Json
          year: number | null
          is_featured: boolean
          sort_order: number
          status: Database["company"]["Enums"]["content_status"]
          seo_title: string | null
          seo_description: string | null
          seo_keywords: string[]
          og_image_id: string | null
          canonical_url: string | null
          noindex: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          type: Database["company"]["Enums"]["project_type"]
          category?: string | null
          client_name?: string | null
          summary?: string
          problem?: string | null
          solution?: string | null
          features: Json
          capabilities: Json
          technology_ids: string[]
          service_ids: string[]
          thumbnail_id?: string | null
          gallery: Json
          live_url?: string | null
          admin_demo_url?: string | null
          demo_credentials?: Json | null
          variants: Json
          year?: number | null
          is_featured?: boolean
          sort_order?: number
          status?: Database["company"]["Enums"]["content_status"]
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords: string[]
          og_image_id?: string | null
          canonical_url?: string | null
          noindex?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          type?: Database["company"]["Enums"]["project_type"]
          category?: string | null
          client_name?: string | null
          summary?: string
          problem?: string | null
          solution?: string | null
          features?: Json
          capabilities?: Json
          technology_ids?: string[]
          service_ids?: string[]
          thumbnail_id?: string | null
          gallery?: Json
          live_url?: string | null
          admin_demo_url?: string | null
          demo_credentials?: Json | null
          variants?: Json
          year?: number | null
          is_featured?: boolean
          sort_order?: number
          status?: Database["company"]["Enums"]["content_status"]
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords?: string[]
          og_image_id?: string | null
          canonical_url?: string | null
          noindex?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_thumbnail_id_fkey"
            columns: ["thumbnail_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          }
        ]
      }
      redirects: {
        Row: {
          id: string
          from_path: string
          to_path: string
          status_code: number
          hit_count: number
          note: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          from_path: string
          to_path: string
          status_code?: number
          hit_count?: number
          note?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          from_path?: string
          to_path?: string
          status_code?: number
          hit_count?: number
          note?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          key: string
          label: string
          description: string
          rank: number
          is_staff: boolean
          can_manage_leads: boolean
          is_owner: boolean
          default_menu: string[]
          is_system: boolean
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
          portal_menu: string[]
        }
        Insert: {
          key: string
          label: string
          description?: string
          rank?: number
          is_staff?: boolean
          can_manage_leads?: boolean
          is_owner?: boolean
          default_menu: string[]
          is_system?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          portal_menu: string[]
        }
        Update: {
          key?: string
          label?: string
          description?: string
          rank?: number
          is_staff?: boolean
          can_manage_leads?: boolean
          is_owner?: boolean
          default_menu?: string[]
          is_system?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          portal_menu?: string[]
        }
        Relationships: []
      }
      seo_defaults: {
        Row: {
          id: number
          title_template: string
          default_title: string
          default_description: string
          default_og_image_id: string | null
          google_verification: string | null
          bing_verification: string | null
          ga_measurement_id: string | null
          gsc_property: string | null
          organization_schema: Json
          site_noindex: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          title_template?: string
          default_title?: string
          default_description?: string
          default_og_image_id?: string | null
          google_verification?: string | null
          bing_verification?: string | null
          ga_measurement_id?: string | null
          gsc_property?: string | null
          organization_schema: Json
          site_noindex?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          title_template?: string
          default_title?: string
          default_description?: string
          default_og_image_id?: string | null
          google_verification?: string | null
          bing_verification?: string | null
          ga_measurement_id?: string | null
          gsc_property?: string | null
          organization_schema?: Json
          site_noindex?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_defaults_default_og_image_id_fkey"
            columns: ["default_og_image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          }
        ]
      }
      services: {
        Row: {
          id: string
          slug: string
          name: string
          short_name: string | null
          icon: string | null
          summary: string
          hero_heading: string | null
          hero_subheading: string | null
          body: Json
          included_items: Json
          audience: Json
          approach: Json
          technology_ids: string[]
          price_from: number | null
          price_note: string | null
          is_custom_quote: boolean
          sort_order: number
          status: Database["company"]["Enums"]["content_status"]
          seo_title: string | null
          seo_description: string | null
          seo_keywords: string[]
          og_image_id: string | null
          canonical_url: string | null
          noindex: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          short_name?: string | null
          icon?: string | null
          summary?: string
          hero_heading?: string | null
          hero_subheading?: string | null
          body: Json
          included_items: Json
          audience: Json
          approach: Json
          technology_ids: string[]
          price_from?: number | null
          price_note?: string | null
          is_custom_quote?: boolean
          sort_order?: number
          status?: Database["company"]["Enums"]["content_status"]
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords: string[]
          og_image_id?: string | null
          canonical_url?: string | null
          noindex?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          short_name?: string | null
          icon?: string | null
          summary?: string
          hero_heading?: string | null
          hero_subheading?: string | null
          body?: Json
          included_items?: Json
          audience?: Json
          approach?: Json
          technology_ids?: string[]
          price_from?: number | null
          price_note?: string | null
          is_custom_quote?: boolean
          sort_order?: number
          status?: Database["company"]["Enums"]["content_status"]
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords?: string[]
          og_image_id?: string | null
          canonical_url?: string | null
          noindex?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          }
        ]
      }
      site_settings: {
        Row: {
          id: number
          company_name: string
          legal_name: string
          tagline: string
          logo_light_id: string | null
          logo_dark_id: string | null
          favicon_id: string | null
          og_default_id: string | null
          phone: string | null
          whatsapp: string | null
          email: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string
          map_embed_url: string | null
          working_hours: Json
          cin: string | null
          gst: string | null
          social: Json
          theme: Json
          default_mode: Database["company"]["Enums"]["theme_mode"]
          allow_mode_toggle: boolean
          three_d_enabled: boolean
          motion_level: string
          maintenance_mode: boolean
          announcement_bar: Json
          created_at: string
          updated_at: string
          whatsapp_template: string
        }
        Insert: {
          id?: number
          company_name?: string
          legal_name?: string
          tagline?: string
          logo_light_id?: string | null
          logo_dark_id?: string | null
          favicon_id?: string | null
          og_default_id?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string
          map_embed_url?: string | null
          working_hours: Json
          cin?: string | null
          gst?: string | null
          social: Json
          theme: Json
          default_mode?: Database["company"]["Enums"]["theme_mode"]
          allow_mode_toggle?: boolean
          three_d_enabled?: boolean
          motion_level?: string
          maintenance_mode?: boolean
          announcement_bar: Json
          created_at?: string
          updated_at?: string
          whatsapp_template?: string
        }
        Update: {
          id?: number
          company_name?: string
          legal_name?: string
          tagline?: string
          logo_light_id?: string | null
          logo_dark_id?: string | null
          favicon_id?: string | null
          og_default_id?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string
          map_embed_url?: string | null
          working_hours?: Json
          cin?: string | null
          gst?: string | null
          social?: Json
          theme?: Json
          default_mode?: Database["company"]["Enums"]["theme_mode"]
          allow_mode_toggle?: boolean
          three_d_enabled?: boolean
          motion_level?: string
          maintenance_mode?: boolean
          announcement_bar?: Json
          created_at?: string
          updated_at?: string
          whatsapp_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_logo_light_id_fkey"
            columns: ["logo_light_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_logo_dark_id_fkey"
            columns: ["logo_dark_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_favicon_id_fkey"
            columns: ["favicon_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_og_default_id_fkey"
            columns: ["og_default_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          }
        ]
      }
      team_members: {
        Row: {
          id: string
          name: string
          role: string
          bio: string | null
          photo_id: string | null
          linkedin_url: string | null
          github_url: string | null
          skills: string[]
          sort_order: number
          status: Database["company"]["Enums"]["content_status"]
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          role: string
          bio?: string | null
          photo_id?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          skills: string[]
          sort_order?: number
          status?: Database["company"]["Enums"]["content_status"]
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string
          bio?: string | null
          photo_id?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          skills?: string[]
          sort_order?: number
          status?: Database["company"]["Enums"]["content_status"]
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          }
        ]
      }
      technologies: {
        Row: {
          id: string
          name: string
          slug: string
          category: string
          logo_id: string | null
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          category?: string
          logo_id?: string | null
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          category?: string
          logo_id?: string | null
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technologies_logo_id_fkey"
            columns: ["logo_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          }
        ]
      }
      testimonials: {
        Row: {
          id: string
          author_name: string
          author_role: string | null
          company_name: string | null
          avatar_id: string | null
          quote: string
          rating: number | null
          project_id: string | null
          consent_confirmed: boolean
          consent_note: string | null
          status: Database["company"]["Enums"]["content_status"]
          sort_order: number
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_name: string
          author_role?: string | null
          company_name?: string | null
          avatar_id?: string | null
          quote: string
          rating?: number | null
          project_id?: string | null
          consent_confirmed?: boolean
          consent_note?: string | null
          status?: Database["company"]["Enums"]["content_status"]
          sort_order?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_name?: string
          author_role?: string | null
          company_name?: string | null
          avatar_id?: string | null
          quote?: string
          rating?: number | null
          project_id?: string | null
          consent_confirmed?: boolean
          consent_note?: string | null
          status?: Database["company"]["Enums"]["content_status"]
          sort_order?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: {
      content_status: "draft" | "published" | "archived"
      lead_status: "new" | "contacted" | "qualified" | "proposal_sent" | "negotiation" | "won" | "lost"
      nav_location: "header" | "footer_primary" | "footer_secondary" | "footer_legal" | "mobile"
      project_type: "inhouse" | "demo" | "client" | "previous"
      theme_mode: "light" | "dark" | "system"
    }
    CompositeTypes: Record<never, never>
  }
};

// --- convenience aliases ----------------------------------------------------

type Schema = Database["company"];

export type Tables<T extends keyof Schema["Tables"]> = Schema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Schema["Tables"]> = Schema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Schema["Tables"]> = Schema["Tables"][T]["Update"];
export type Enums<T extends keyof Schema["Enums"]> = Schema["Enums"][T];
