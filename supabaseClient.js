// Conexão com o Supabase, usada por todas as páginas do site.
const SUPABASE_URL = "https://jzyxeeumrflivtajtomu.supabase.co";
const SUPABASE_KEY = "sb_publishable_8WPcXHd2yfLX1NoNqAdDZw_vsYK5hJg";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
