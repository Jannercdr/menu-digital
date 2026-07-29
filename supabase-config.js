// ============================================================
// CONFIGURACIÓN DE SUPABASE - Compartido en toda la app
// ============================================================
const SUPABASE_URL = 'https://qvhzbpqlhkyxtlfdofug.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aHpicHFsaGt5eHRsZmRvZnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzk3NDMsImV4cCI6MjEwMDkxNTc0M30.DIloe3Q1tDbH--Bawf5jpq6oIfADe3nApic4NLttD2k';

// Usar window para evitar conflictos de redeclaración
if (!window._supabaseClient) {
    window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
var supabase = window._supabaseClient;
