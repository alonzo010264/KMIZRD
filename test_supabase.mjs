import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hgjcmsqforkvcfatygsl.supabase.co';
const supabaseKey = 'sb_publishable_Ij2NSppTJRCxCpLzOOtLNA_OZY1RKZS';
const _supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    let query = _supabase
        .from('products')
        .select('*')
        .neq('category', 'FAQ')
        .neq('category', 'TRACKING')
        .neq('category', 'SYSTEM_USERS')
        .order('created_at', { ascending: false });

    query = query.ilike('category', '%oversize%');
    
    const { data, error } = await query;
    console.log("Error:", error);
    console.log("Data length:", data ? data.length : 0);
    if(data && data.length > 0) {
        console.log("First:", data[0]);
    }
}
test();
